# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
#   MEMOLOG BACKEND — COMPLETE SETUP GUIDE
#   For complete beginners — follow every step
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## WHAT YOU'LL SET UP
- Node.js (the engine that runs your backend)
- MongoDB Atlas (free cloud database)
- Cloudinary (free photo storage)
- Render (free hosting for your backend)

Estimated time: 45–60 minutes

---

## STEP 1 — INSTALL NODE.JS

1. Go to: https://nodejs.org
2. Download the "LTS" version (the green button)
3. Run the installer — click Next on everything
4. When done, open your terminal:
   - Windows: search "Command Prompt" in Start menu
   - Mac: search "Terminal" in Spotlight
5. Type this and press Enter to verify:
   node --version
   (You should see something like: v20.10.0)

---

## STEP 2 — GET THE BACKEND CODE RUNNING LOCALLY

1. Copy the memolog-backend folder to your Desktop

2. Open terminal and navigate to it:
   cd Desktop/memolog-backend
   (on Windows it may be: cd C:\Users\YourName\Desktop\memolog-backend)

3. Install all dependencies:
   npm install
   (This downloads everything in package.json — takes 1-2 minutes)

---

## STEP 3 — SET UP MONGODB (FREE DATABASE)

1. Go to: https://mongodb.com/atlas
2. Click "Try Free" → Create an account
3. Choose "Free" tier (M0 cluster) → click Create
4. Choose any cloud provider and region → click Create Cluster
5. Wait 1-2 minutes for cluster to provision

6. Create database user:
   - Left sidebar → Security → Database Access
   - Click "+ Add New Database User"
   - Username: memolog
   - Password: click "Autogenerate" → COPY THIS PASSWORD (save it!)
   - Role: "Read and write to any database"
   - Click Add User

7. Allow network access:
   - Left sidebar → Security → Network Access
   - Click "+ Add IP Address"
   - Click "Allow Access from Anywhere" (for now)
   - Click Confirm

8. Get connection string:
   - Left sidebar → Deployment → Database
   - Click "Connect" → "Drivers"
   - Copy the connection string. It looks like:
     mongodb+srv://memolog:<password>@cluster0.xxxxx.mongodb.net/
   - Replace <password> with the password you copied

---

## STEP 4 — SET UP CLOUDINARY (FREE PHOTO STORAGE)

1. Go to: https://cloudinary.com
2. Sign up for free
3. After login, go to Dashboard
4. You'll see: Cloud Name, API Key, API Secret
5. Copy all three — you'll need them in .env

---

## STEP 5 — SET UP GOOGLE OAUTH (GOOGLE LOGIN)

1. Go to: https://console.cloud.google.com
2. Create a new project → name it "MemoLog"
3. Left menu → APIs & Services → Credentials
4. Click "+ Create Credentials" → OAuth 2.0 Client IDs
5. Application type: Web application
6. Authorized JavaScript origins: http://localhost:3000
7. Click Create → Copy the Client ID

---

## STEP 6 — CREATE YOUR .env FILE

1. In the memolog-backend folder, copy .env.example to .env:
   - Windows: copy .env.example .env
   - Mac: cp .env.example .env

2. Open .env in any text editor (Notepad works fine)
3. Fill in every value:

   MONGODB_URI=mongodb+srv://memolog:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/memolog
   JWT_SECRET=any_long_random_string_you_make_up_like_abc123xyz789
   GOOGLE_CLIENT_ID=your_client_id.apps.googleusercontent.com
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ANTHROPIC_API_KEY=your_anthropic_key
   FRONTEND_URL=http://localhost:3000
   PORT=5000

4. Save the file

---

## STEP 7 — RUN THE BACKEND LOCALLY

In your terminal (in the memolog-backend folder):
   npm run dev

You should see:
   🚀 MemoLog server running on port 5000
   ✅ MongoDB connected successfully

Test it by opening in your browser:
   http://localhost:5000

You should see: {"status":"MemoLog backend is running",...}

---

## STEP 8 — DEPLOY TO RENDER (FREE HOSTING)

1. Push your code to GitHub:
   a. Install Git: https://git-scm.com/downloads
   b. Create account at: https://github.com
   c. Create new repository → name it "memolog-backend"
   d. In your terminal:
      git init
      git add .
      git commit -m "MemoLog backend initial commit"
      git remote add origin https://github.com/YOUR_USERNAME/memolog-backend.git
      git push -u origin main

2. Deploy on Render:
   a. Go to: https://render.com → Sign up (free)
   b. Click "New" → "Web Service"
   c. Connect your GitHub account
   d. Select your memolog-backend repository
   e. Render auto-detects Node.js
   f. Build Command: npm install
   g. Start Command: npm start
   h. Click "Create Web Service"

3. Add environment variables on Render:
   - Go to your service → Environment tab
   - Add every key from your .env file
   - Click Save → Service will redeploy automatically

4. Your backend is now live at:
   https://memolog-backend.onrender.com

---

## STEP 9 — CONNECT YOUR FRONTEND TO BACKEND

In your memolog-v5.html frontend, add this to the top of your script:

const API_BASE = 'https://memolog-backend.onrender.com/api';

// Example: login call
async function loginUser(email, password) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('memolog_token', data.token);
    localStorage.setItem('memolog_user', JSON.stringify(data.user));
  }
  return data;
}

// Example: save diary entry
async function saveEntry(mood, blocks, title) {
  const token = localStorage.getItem('memolog_token');
  const response = await fetch(`${API_BASE}/entries`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ mood, blocks, title, date: new Date() })
  });
  return await response.json();
}

---

## API REFERENCE — ALL ENDPOINTS

### AUTH
POST   /api/auth/signup          Create account
POST   /api/auth/login           Login with email/password
POST   /api/auth/google          Login with Google
GET    /api/auth/me              Get current user
POST   /api/auth/verify-pin      Verify PIN lock

### ENTRIES
POST   /api/entries              Save/update today's entry
GET    /api/entries              Get all entries (paginated)
GET    /api/entries/today        Get today's entry
GET    /api/entries/:id          Get single entry
PATCH  /api/entries/:id/release  "Let it go" — clear text
DELETE /api/entries/:id          Delete entry

### MOOD
GET    /api/mood/stats           Overall stats + streak
GET    /api/mood/monthly         Month calendar data
GET    /api/mood/weekly          Last 7 days

### PHOTOS
POST   /api/photos/upload        Upload photo
DELETE /api/photos/:publicId     Delete photo

### AI
POST   /api/ai/analyze/:entryId  Analyze entry with Claude
POST   /api/ai/prompt            Generate journaling prompts
GET    /api/ai/daily-prompt      Get one daily prompt

### USER
GET    /api/user/profile         Full profile
PATCH  /api/user/preferences     Update preferences
PATCH  /api/user/name            Update name
DELETE /api/user/account         Delete everything

---

## TROUBLESHOOTING

❌ "MongoDB connection failed"
→ Check your MONGODB_URI in .env — make sure password is correct
→ Make sure you allowed "All IPs" in MongoDB Network Access

❌ "Cannot find module"
→ Run: npm install (you may have missed this step)

❌ "Port 5000 already in use"
→ Change PORT=5001 in your .env file

❌ Google login not working
→ Make sure GOOGLE_CLIENT_ID is correct
→ Make sure your URL is in authorized origins in Google Console

---

## NEED HELP?

If you get stuck on any step, just tell Claude exactly:
1. Which step you're on
2. What error message you see
3. What you tried

Claude will help you fix it step by step.
