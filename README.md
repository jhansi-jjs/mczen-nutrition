# 🌿 McZEN Clinical Nutrition AI

AI-powered clinical nutrition platform for McZEN Academy workshops.  
Built with **Next.js** + **Claude AI (Sonnet 4.6)**.

---

## What this app does

| Module | Feature |
|---|---|
| 👤 Patient Profile | Intake form — name, age, gender, height, weight, conditions, dietary type |
| 📊 Clinical Assessment | Auto-calculates BMI, IBW, BMR, TDEE, Protein & Fluid requirements |
| 🔬 Lab Analysis | Enter lab values → AI identifies nutritional problems with PES diagnosis |
| 🍽️ Meal Plan | AI generates a personalized 1-day Indian therapeutic meal plan |
| 💬 Counseling | Live AI nutrition counseling chat, context-aware per patient |
| 📋 Diet Report | Full clinical diet prescription — printable to PDF |

---

## STEP 1 — Get your Anthropic API Key

1. Go to **https://console.anthropic.com/**
2. Sign up (free) → go to **API Keys** → click **Create Key**
3. Copy the key (starts with `sk-ant-...`)
4. Keep it somewhere safe — you'll paste it in Step 3

---

## STEP 2 — Push to GitHub

1. Go to **https://github.com** → sign in / sign up (free)
2. Click **New repository** → name it `mczen-nutrition` → click **Create**
3. On your computer, open a terminal in this folder and run:

```bash
git init
git add .
git commit -m "McZEN Clinical Nutrition AI - initial"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mczen-nutrition.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username.

---

## STEP 3 — Deploy to Vercel (free, 3 clicks)

1. Go to **https://vercel.com** → sign in with GitHub
2. Click **Add New → Project**
3. Find and click **Import** next to your `mczen-nutrition` repo
4. In the **Environment Variables** section, add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** paste your `sk-ant-...` key here
5. Click **Deploy**

✅ Vercel builds and gives you a live URL like:  
`https://mczen-nutrition.vercel.app`

---

## STEP 4 — Open on any phone

Share the Vercel URL with anyone.  
Open it in **Chrome / Safari on any Android or iPhone** — it works perfectly.

No app install needed. Just a link.

---

## Run locally (for testing before deploy)

```bash
# Install dependencies
npm install

# Create your local env file
cp .env.local.example .env.local
# Then edit .env.local and paste your real API key

# Start the development server
npm run dev

# Open in browser
# http://localhost:3000
```

---

## File structure

```
mczen-nutrition/
├── pages/
│   ├── index.js          ← Main app (all 6 modules)
│   ├── _app.js           ← App wrapper
│   └── api/
│       └── claude.js     ← Secure backend route (API key lives here)
├── styles/
│   └── globals.css       ← Global styles + print styles
├── .env.local.example    ← Template for API key (rename to .env.local)
├── next.config.js
├── package.json
└── README.md
```

---

## Why the API key is in `pages/api/claude.js`

The API key **never reaches the browser**. When a user's phone opens the app:

```
Phone (browser) → /api/claude (Vercel server) → Anthropic API
```

The key is only on the server. No one can steal it by inspecting the browser.

---

## Medical formulas used

| Calculation | Formula |
|---|---|
| BMI | Weight (kg) / Height² (m) |
| Ideal Body Weight | Devine Formula |
| Basal Metabolic Rate | Mifflin-St Jeor Equation |
| TDEE | BMR × Activity Factor |
| Protein | Condition-adjusted (0.6–1.8 g/kg) |
| Fluid | 30–35 mL/kg body weight |
| Macros | Condition-specific distribution |

---

## Costs

- **Vercel hosting:** Free (hobby tier)
- **GitHub:** Free
- **Claude API:** ~$0.003 per full patient session (very cheap)
  - You can set a monthly budget cap at console.anthropic.com

---

Built for McZEN Academy Clinical Nutrition Skills Workshop
