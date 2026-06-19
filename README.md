# 🌿 McZEN Clinical Nutrition AI

> AI-powered clinical nutrition platform built for **McZEN Academy** workshops and patient consultations.

Built with **Next.js** + **Google Gemini AI (1.5 Flash)** — fully free, no credit card required.

---

## Features

| Module | Description |
|---|---|
| 👤 Patient Profile | Complete intake form — name, age, gender, height, weight, activity level, dietary type, medical conditions, allergies, chief complaint |
| 📊 Clinical Assessment | Auto-calculates BMI, Ideal Body Weight, BMR, TDEE, Target Calories, Protein & Fluid requirements using evidence-based formulas |
| 🔬 Lab Analysis | Enter biochemical lab values → real-time Low/Normal/High status → AI generates full nutritional diagnosis with PES statements |
| 🍽️ Meal Plan | AI generates a personalized 1-day Indian therapeutic meal plan with exact quantities, calories, and protein per meal |
| 💬 Counseling | Live AI nutrition counseling chat — fully context-aware, personalized to active patient's profile and conditions |
| 📋 Diet Report | Complete clinical diet prescription report — professional format, printable to PDF |

---

## Medical Formulas Used

| Calculation | Formula / Method |
|---|---|
| BMI | Weight (kg) ÷ Height² (m) — Asian cutoffs applied |
| Ideal Body Weight | Devine Formula |
| Basal Metabolic Rate | Mifflin-St Jeor Equation |
| Total Daily Energy (TDEE) | BMR × Activity Factor |
| Protein Requirement | Condition-adjusted (0.6–1.8 g/kg) |
| Fluid Requirement | 30–35 mL/kg body weight |
| Macronutrient Distribution | Condition-specific (Diabetes, CKD, General) |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, React 18 |
| Backend (API Route) | Next.js API Routes (Node.js) |
| AI Engine | Google Gemini 1.5 Flash |
| Hosting | Vercel (free) |
| Styling | Inline styles + CSS (McZEN teal theme) |

---

## Getting Started

### Step 1 — Get a Free Gemini API Key

1. Go to **https://aistudio.google.com**
2. Sign in with your Google account
3. Click **Get API Key** → **Create API Key**
4. Copy the key (starts with `AIzaSy...`)
5. No credit card. No payment. 100% free.

### Step 2 — Install and Run Locally

```bash
# Clone the repository
git clone https://github.com/jhansi-jjs/mczen-nutrition.git
cd mczen-nutrition

# Install dependencies
npm install

# Create your environment file
cp .env.local.example .env.local
```

Open `.env.local` and paste your key:
```
GEMINI_API_KEY=AIzaSy...your-actual-key-here
```

```bash
# Start the development server
npm run dev
```

Open **http://localhost:3000** in your browser.

### Step 3 — Deploy to Vercel (Live Link)

1. Go to **https://vercel.com** → sign in with GitHub
2. Click **Add New → Project** → import `mczen-nutrition`
3. Under **Environment Variables**, add:
   - Name: `GEMINI_API_KEY`
   - Value: your `AIzaSy...` key
4. Click **Deploy**

Your live URL will be ready in ~60 seconds. Works on any phone or device.

---

## Project Structure

```
mczen-nutrition/
├── pages/
│   ├── index.js              ← Full app — all 6 modules
│   ├── _app.js               ← App wrapper
│   └── api/
│       └── claude.js         ← Secure backend route — API key never reaches browser
├── styles/
│   └── globals.css           ← Global styles, mobile styles, print styles
├── .env.local.example        ← Environment variable template
├── .env.local                ← Your real API key (never commit this)
├── next.config.js
├── package.json
└── README.md
```

---

## Security Architecture

The API key is stored **only on the server** and never exposed to the browser.

```
Patient's Phone (browser)
        ↓  HTTPS request
Vercel Server (/api/claude)   ← API key lives here, server-side only
        ↓  Authenticated request
Google Gemini API
        ↓  AI response
Patient's Phone (browser)
```

---

## Cost

| Service | Cost |
|---|---|
| Vercel Hosting | Free (Hobby tier) |
| GitHub | Free |
| Google Gemini API | Free (1M tokens/day, 15 req/min) |
| **Total** | **₹0 / month** |

The free Gemini tier easily handles hundreds of patient sessions per day.

---

## Lab Parameters Supported

| Category | Parameters |
|---|---|
| Hematology | Hemoglobin, Serum Iron, Ferritin, Vitamin B12 |
| Glucose | Fasting Blood Sugar, HbA1c |
| Protein Status | Serum Albumin, Total Protein |
| Renal Function | Serum Creatinine |
| Lipid Profile | Total Cholesterol, LDL, HDL, Triglycerides |
| Vitamins & Thyroid | Vitamin D, TSH |

---

## Medical Conditions Supported

Type 2 Diabetes, Type 1 Diabetes, Pre-diabetes, Hypertension, Dyslipidemia, PCOS/PCOD, Hypothyroidism, Hyperthyroidism, CKD (Non-Dialysis), Dialysis, NAFLD/Fatty Liver, Anemia, Iron Deficiency, Vitamin D Deficiency, Vitamin B12 Deficiency, Osteoporosis, IBS/IBD, Celiac Disease, Cancer/Critical Illness, Malnutrition, Athlete, Pregnancy, Lactation, Elderly (>65y)

---

## License

Built exclusively for **McZEN Academy — Clinical Nutrition Skills Workshop**
© 2026 McZEN Academy. All rights reserved.
