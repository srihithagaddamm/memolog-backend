// routes/ai.js — AI mood analysis + journaling prompts using Claude
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Entry = require('../models/Entry');

router.use(protect);

// Helper: call Anthropic Claude API
const callClaude = async (systemPrompt, userMessage) => {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || 'Claude API error');
  return data.content[0].text;
};

// ─────────────────────────────────────────
// POST /api/ai/analyze/:entryId
// Analyze a diary entry — sentiment + reflection
// ─────────────────────────────────────────
router.post('/analyze/:entryId', async (req, res) => {
  try {
    const entry = await Entry.findOne({ _id: req.params.entryId, user: req.user._id });
    if (!entry) return res.status(404).json({ error: 'Entry not found.' });

    // Collect all written text from entry
    const fullText = entry.blocks
      .filter(b => b.text && b.text.trim().length > 0)
      .map(b => `[${b.block}]: ${b.text}`)
      .join('\n\n');

    if (!fullText.trim()) {
      return res.status(400).json({ error: 'No text to analyze yet.' });
    }

    const systemPrompt = `You are a warm, empathetic journaling companion for MemoLog, a private diary app. 
Your role is to gently reflect on what someone has written in their diary and offer a kind response.
You must respond ONLY with a valid JSON object in this exact format:
{
  "sentimentScore": <number between -1 and 1, where -1 is very sad and 1 is very happy>,
  "dominantEmotion": "<single word like: joy, calm, sadness, anxiety, gratitude, frustration>",
  "reflection": "<2-3 warm, caring sentences responding to their day. Be gentle, not clinical.>",
  "suggestions": ["<one gentle suggestion>", "<another optional suggestion>"]
}
Do not include any text outside the JSON. The person's privacy is important — never repeat their exact words back.`;

    const userMessage = `Here is what this person wrote in their diary today (mood: ${entry.mood}):\n\n${fullText}\n\nPlease provide your warm analysis in the JSON format specified.`;

    const rawResponse = await callClaude(systemPrompt, userMessage);

    // Parse JSON response
    let analysis;
    try {
      analysis = JSON.parse(rawResponse.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(500).json({ error: 'Could not parse AI response. Try again.' });
    }

    // Save analysis to entry
    entry.aiAnalysis = { ...analysis, analyzedAt: new Date() };
    await entry.save();

    res.json({
      message: 'Analysis complete',
      analysis: entry.aiAnalysis
    });

  } catch (err) {
    console.error('AI analysis error:', err.message);
    res.status(500).json({ error: 'AI analysis failed. Please try again later.' });
  }
});

// ─────────────────────────────────────────
// POST /api/ai/prompt
// Generate journaling prompts based on mood
// Body: { mood, timeBlock }
// ─────────────────────────────────────────
router.post('/prompt', async (req, res) => {
  try {
    const { mood, timeBlock } = req.body;

    if (!mood || !timeBlock) {
      return res.status(400).json({ error: 'Mood and timeBlock are required.' });
    }

    const systemPrompt = `You are a gentle journaling prompt generator for MemoLog diary app.
Generate exactly 3 short, warm, open-ended journaling prompts for someone who is feeling ${mood} during their ${timeBlock}.
Respond ONLY with valid JSON:
{
  "prompts": ["<prompt 1>", "<prompt 2>", "<prompt 3>"]
}
Keep each prompt under 15 words. Make them feel personal and safe, not clinical.`;

    const rawResponse = await callClaude(systemPrompt, `Generate 3 ${timeBlock} journaling prompts for someone feeling ${mood}.`);

    let result;
    try {
      result = JSON.parse(rawResponse.replace(/```json|```/g, '').trim());
    } catch {
      return res.status(500).json({ error: 'Could not generate prompts. Try again.' });
    }

    res.json({ prompts: result.prompts });

  } catch (err) {
    console.error('Prompt generation error:', err.message);
    res.status(500).json({ error: 'Could not generate prompts.' });
  }
});

// ─────────────────────────────────────────
// GET /api/ai/daily-prompt?mood=happy
// Get one daily opening prompt
// ─────────────────────────────────────────
router.get('/daily-prompt', async (req, res) => {
  try {
    const { mood = 'calm' } = req.query;

    const systemPrompt = `You are a warm journaling companion. Generate ONE short, inviting opening prompt for someone feeling ${mood}. 
Respond ONLY with JSON: { "prompt": "<your prompt here>" }
Keep it under 12 words. Make it feel like a gentle invitation to write.`;

    const rawResponse = await callClaude(systemPrompt, `One opening prompt for mood: ${mood}`);

    let result;
    try {
      result = JSON.parse(rawResponse.replace(/```json|```/g, '').trim());
    } catch {
      result = { prompt: "What's one small thing you want to remember about today?" };
    }

    res.json({ prompt: result.prompt });

  } catch (err) {
    res.json({ prompt: "What's one small thing you want to remember about today?" });
  }
});

module.exports = router;
