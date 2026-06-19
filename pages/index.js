import { useState, useRef } from 'react';
import Head from 'next/head';

// ═══════════════════════════════════════════════════════════
// CLINICAL FORMULAS — ALL EVIDENCE-BASED
// ═══════════════════════════════════════════════════════════

function calcBMI(w, h) { return w / Math.pow(h / 100, 2); }

function bmiCategory(bmi) {
  // Asian BMI cutoffs (relevant for Indian patients)
  if (bmi < 16)   return { l: 'Severe Underweight', c: '#1565C0' };
  if (bmi < 18.5) return { l: 'Underweight', c: '#1976D2' };
  if (bmi < 23)   return { l: 'Normal (Asian BMI)', c: '#2E7D32' };
  if (bmi < 25)   return { l: 'Overweight Risk', c: '#F57C00' };
  if (bmi < 30)   return { l: 'Overweight', c: '#E65100' };
  if (bmi < 35)   return { l: 'Obese Class I', c: '#B71C1C' };
  return { l: 'Obese Class II/III', c: '#880E4F' };
}

// Devine Formula — Ideal Body Weight
function calcIBW(gender, hCm) {
  const excess = Math.max(0, hCm / 2.54 - 60);
  return gender === 'Male' ? 50 + 2.3 * excess : 45.5 + 2.3 * excess;
}

// Mifflin-St Jeor — Basal Metabolic Rate
function calcBMR(w, h, age, gender) {
  return (10 * w + 6.25 * h - 5 * age) + (gender === 'Male' ? 5 : -161);
}

// Protein requirement — adjusted for clinical condition
function getProteinReq(w, ibw, conditions) {
  const refW = w > ibw * 1.2 ? ibw + 0.4 * (w - ibw) : w; // Adjusted BW for obese
  let rate = 0.8, note = 'Standard RDA';
  if (conditions.includes('CKD (Non-Dialysis)'))          { rate = 0.6; note = 'Restricted — CKD pre-dialysis'; }
  else if (conditions.includes('Dialysis'))               { rate = 1.4; note = 'High — dialysis patients'; }
  else if (conditions.includes('Cancer / Critically Ill')){ rate = 1.6; note = 'High — hypermetabolic state'; }
  else if (conditions.some(c => c.includes('Diabetes')))  { rate = 1.1; note = 'Moderate — diabetes management'; }
  else if (conditions.includes('Malnutrition'))           { rate = 1.5; note = 'High — nutritional repletion'; }
  else if (conditions.includes('Athlete'))                { rate = 1.8; note = 'High — athletic performance'; }
  else if (conditions.includes('Pregnancy'))              { rate = 1.1; note = 'Increased — pregnancy needs'; }
  else if (conditions.includes('Elderly (>65y)'))         { rate = 1.0; note = 'Increased — older adults'; }
  return { g: Math.round(refW * rate), rate, note, refW: Math.round(refW) };
}

// Macronutrient distribution — condition-adjusted
function getMacros(cals, conditions) {
  let [c, p, f] = [55, 20, 25];
  if (conditions.some(x => x.includes('Diabetes')))   [c, p, f] = [45, 20, 35];
  else if (conditions.includes('CKD (Non-Dialysis)')) [c, p, f] = [65, 10, 25];
  return {
    carb: { pct: c, g: Math.round(cals * c / 100 / 4) },
    prot: { pct: p, g: Math.round(cals * p / 100 / 4) },
    fat:  { pct: f, g: Math.round(cals * f / 100 / 9) },
  };
}

// ═══════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════

const CONDITIONS = [
  'Type 2 Diabetes', 'Type 1 Diabetes', 'Pre-diabetes (IGT/IFG)',
  'Hypertension (High BP)', 'Dyslipidemia', 'PCOS/PCOD',
  'Hypothyroidism', 'Hyperthyroidism',
  'CKD (Non-Dialysis)', 'Dialysis', 'NAFLD/Fatty Liver',
  'Anemia', 'Iron Deficiency', 'Vitamin D Deficiency', 'Vitamin B12 Deficiency',
  'Osteoporosis', 'IBS/IBD', 'Celiac Disease',
  'Cancer / Critically Ill', 'Malnutrition', 'Athlete', 'Pregnancy', 'Lactation', 'Elderly (>65y)',
];

const DIET_TYPES = [
  'Lacto-Vegetarian', 'Vegan', 'Eggetarian', 'Non-Vegetarian',
  'Jain (No Root Veg)', 'Gluten-Free',
];

const GOALS = [
  'Weight Loss', 'Weight Maintenance', 'Weight Gain', 'Therapeutic / Disease Management',
];

const ACTIVITY = {
  '1.2':   'Sedentary — desk job, no exercise',
  '1.375': 'Lightly Active — 1–3 days/week',
  '1.55':  'Moderately Active — 3–5 days/week',
  '1.725': 'Very Active — 6–7 days/week',
  '1.9':   'Extra Active — physical job + 2× training',
};

// Lab reference ranges (gender-aware)
const LAB_REF = {
  hb:       { label: 'Hemoglobin',          unit: 'g/dL',    lo: g => g === 'Male' ? 13.5 : 12.0, hi: g => g === 'Male' ? 17.5 : 15.5 },
  iron:     { label: 'Serum Iron',          unit: 'mcg/dL',  lo: g => g === 'Male' ? 60   : 50,   hi: () => 170 },
  ferritin: { label: 'Ferritin',            unit: 'ng/mL',   lo: g => g === 'Male' ? 20   : 10,   hi: g => g === 'Male' ? 250 : 120 },
  b12:      { label: 'Vitamin B12',         unit: 'pg/mL',   lo: () => 200,  hi: () => 900 },
  fbs:      { label: 'Fasting Blood Sugar', unit: 'mg/dL',   lo: () => 70,   hi: () => 99 },
  hba1c:    { label: 'HbA1c',              unit: '%',        lo: () => 0,    hi: () => 5.7 },
  albumin:  { label: 'Serum Albumin',       unit: 'g/dL',    lo: () => 3.5,  hi: () => 5.0 },
  tp:       { label: 'Total Protein',       unit: 'g/dL',    lo: () => 6.3,  hi: () => 8.2 },
  cr:       { label: 'Creatinine',          unit: 'mg/dL',   lo: () => 0,    hi: g => g === 'Male' ? 1.35 : 1.04 },
  tc:       { label: 'Total Cholesterol',   unit: 'mg/dL',   lo: () => 0,    hi: () => 200 },
  ldl:      { label: 'LDL',                unit: 'mg/dL',   lo: () => 0,    hi: () => 100 },
  hdl:      { label: 'HDL',                unit: 'mg/dL',   lo: g => g === 'Male' ? 40 : 50, hi: () => 999 },
  tg:       { label: 'Triglycerides',       unit: 'mg/dL',   lo: () => 0,    hi: () => 150 },
  vitd:     { label: 'Vitamin D',           unit: 'ng/mL',   lo: () => 30,   hi: () => 100 },
  tsh:      { label: 'TSH',                unit: 'mIU/L',   lo: () => 0.4,  hi: () => 4.0 },
};

// ═══════════════════════════════════════════════════════════
// AI API CALL — calls our secure /api/claude route
// ═══════════════════════════════════════════════════════════

async function callAI(system, user) {
  const r = await fetch('/api/claude', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });
  const d = await r.json();
  if (d.error) throw new Error(typeof d.error === 'string' ? d.error : (d.error.message || 'API error'));
  return d.content.map(b => b.text || '').join('');
}

// ═══════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════

export default function McZENApp() {
  const [tab, setTab] = useState(0);

  const [pt, setPt] = useState({
    name: '', age: '', gender: 'Female', h: '', w: '', uw: '',
    act: '1.2', diet: 'Lacto-Vegetarian', allergy: '',
    goal: 'Weight Loss', conditions: [], complaint: '',
  });

  const [labs, setLabs] = useState(
    Object.fromEntries(Object.keys(LAB_REF).map(k => [k, '']))
  );

  const [results, setResults]   = useState({});
  const [loading, setLoading]   = useState({});
  const [errors,  setErrors]    = useState({});
  const [chatLog, setChatLog]   = useState([]);
  const [chatMsg, setChatMsg]   = useState('');
  const chatEndRef = useRef(null);

  const hasPatient = pt.name && pt.age && pt.h && pt.w;

  // ── Derived clinical calculations ──
  const CALC = hasPatient ? (() => {
    const w = +pt.w, h = +pt.h, a = +pt.age, g = pt.gender;
    const bmi  = calcBMI(w, h);
    const ibw  = calcIBW(g, h);
    const bmr  = calcBMR(w, h, a, g);
    const af   = +pt.act;
    const tdee = bmr * af;
    let cals   = tdee;
    if (pt.goal.includes('Loss')) cals -= 500;
    if (pt.goal.includes('Gain')) cals += 500;
    const prot   = getProteinReq(w, ibw, pt.conditions);
    const macros = getMacros(cals, pt.conditions);
    const fluid  = Math.round(a > 65 ? w * 30 : w * 35);
    const pibw   = (w / ibw * 100).toFixed(1);
    const bc     = bmiCategory(bmi);
    return { bmi: bmi.toFixed(1), bmiLabel: bc.l, bmiColor: bc.c, ibw: ibw.toFixed(1), pibw, bmr: Math.round(bmr), tdee: Math.round(tdee), cals: Math.round(cals), af, prot, macros, fluid };
  })() : null;

  // ── Patient context string for AI prompts ──
  const ptCtx = () => CALC ? [
    `PATIENT: ${pt.name}, ${pt.age}y, ${pt.gender}`,
    `Height:${pt.h}cm, Weight:${pt.w}kg, UBW:${pt.uw || 'N/A'}kg`,
    `BMI:${CALC.bmi} (${CALC.bmiLabel}), IBW:${CALC.ibw}kg, %IBW:${CALC.pibw}%`,
    `BMR:${CALC.bmr}kcal, TDEE:${CALC.tdee}kcal, Target:${CALC.cals}kcal (${pt.goal})`,
    `Protein:${CALC.prot.g}g/day (${CALC.prot.rate}g/kg — ${CALC.prot.note}), Fluid:${CALC.fluid}mL/day`,
    `Macros: Carb ${CALC.macros.carb.pct}% (${CALC.macros.carb.g}g), Protein ${CALC.macros.prot.pct}% (${CALC.macros.prot.g}g), Fat ${CALC.macros.fat.pct}% (${CALC.macros.fat.g}g)`,
    `Diet:${pt.diet}, Allergies:${pt.allergy || 'None'}`,
    `Conditions:${pt.conditions.join(', ') || 'None'}`,
    `Chief Complaint:${pt.complaint || 'Not stated'}`,
  ].join('\n') : 'No patient data entered.';

  const labCtx = () => {
    const entries = Object.entries(labs)
      .filter(([, v]) => v)
      .map(([k, v]) => `${LAB_REF[k].label}: ${v} ${LAB_REF[k].unit}`);
    return entries.length ? entries.join(' | ') : 'No lab values entered.';
  };

  // ── State helpers ──
  const setF = (k, v) => setPt(p => ({ ...p, [k]: v }));
  const toggleCond = c => setPt(p => ({
    ...p,
    conditions: p.conditions.includes(c)
      ? p.conditions.filter(x => x !== c)
      : [...p.conditions, c],
  }));
  const setL = (k, v) => setLabs(l => ({ ...l, [k]: v }));

  // Real-time lab status
  const labStatus = (key, val) => {
    if (!val) return null;
    const v = parseFloat(val), ref = LAB_REF[key];
    const lo = ref.lo(pt.gender), hi = ref.hi(pt.gender);
    if (v < lo) return { s: '↓ Low', c: '#1565C0', bg: '#E3F2FD' };
    if (v > hi) return { s: '↑ High', c: '#B71C1C', bg: '#FFEBEE' };
    return { s: '✓ Normal', c: '#2E7D32', bg: '#E8F5E9' };
  };

  // ── Generic AI task runner ──
  const doAI = async (key, sys, usr) => {
    setLoading(l => ({ ...l, [key]: true }));
    setErrors(e => ({ ...e, [key]: '' }));
    try {
      const res = await callAI(sys, usr);
      setResults(r => ({ ...r, [key]: res }));
    } catch (e) {
      setErrors(er => ({ ...er, [key]: e.message }));
    }
    setLoading(l => ({ ...l, [key]: false }));
  };

  // ── AI: Lab Analysis ──
  const analyzeLabs = () => doAI('labs',
    `You are a senior clinical dietitian. Analyze these lab values for nutritional implications.
Be structured and clinically precise. Use this exact format:

BIOCHEMICAL STATUS:
[Parameter] | [Value] | [Status] | [Nutritional significance]
(one row per parameter provided)

NUTRITIONAL PROBLEMS IDENTIFIED:
1. [Problem]
(list every identified problem)

NUTRITIONAL DIAGNOSIS (PES Statement):
[Problem] related to [Etiology] as evidenced by [Signs/Symptoms].
(write 1–2 PES statements)

KEY DIETARY IMPLICATIONS:
• [specific, actionable dietary recommendation]
(list 4–5 key points)`,
    `${ptCtx()}\n\nLAB VALUES PROVIDED: ${labCtx()}\n\nProvide complete, accurate nutritional analysis.`
  );

  // ── AI: Meal Plan ──
  const genMealPlan = () => doAI('meal',
    `You are an expert Indian clinical dietitian. Create a 1-day therapeutic meal plan with exact quantities (in grams / mL / standard cups), and approximate kcal + protein per meal. Fully personalize for the patient's conditions, dietary type, calorie target, and protein target.

Use exactly this format:
⏰ EARLY MORNING (6–7 AM): [foods + quantities] — ~[X] kcal | [Y]g protein
🍳 BREAKFAST (8–9 AM): [foods + quantities] — ~[X] kcal | [Y]g protein
🍎 MID-MORNING SNACK (11 AM): [food + qty] — ~[X] kcal | [Y]g protein
🍛 LUNCH (1–2 PM): [foods + quantities] — ~[X] kcal | [Y]g protein
🫖 EVENING SNACK (5 PM): [food + qty] — ~[X] kcal | [Y]g protein
🌙 DINNER (8 PM): [foods + quantities] — ~[X] kcal | [Y]g protein
📊 DAILY TOTAL: ~[total] kcal | ~[total]g protein

❌ FOODS TO STRICTLY AVOID: [specific list]
💊 SUPPLEMENTS RECOMMENDED: [specific list or "None needed"]
💡 KEY TIPS: [3 practical patient-friendly tips]`,
    `${ptCtx()}\nLab Analysis: ${results.labs || 'Not performed'}\nTarget: ${CALC?.cals} kcal/day | ${CALC?.prot.g}g protein/day | ${pt.diet} diet\n\nGenerate personalized meal plan.`
  );

  // ── AI: Diet Report ──
  const genReport = () => doAI('report',
    `You are a clinical dietitian writing a formal diet prescription for a patient's medical record. Be professional and clinically specific. Include all sections below:

1. PATIENT SUMMARY
2. NUTRITIONAL ASSESSMENT (BMI status, energy balance, macronutrient needs)
3. NUTRITIONAL DIAGNOSIS
4. DIETARY PRESCRIPTION (exact calorie target, protein, macros, meal pattern — be specific with numbers)
5. RECOMMENDED FOODS (specific Indian foods grouped by category)
6. FOODS TO RESTRICT / AVOID (specific list with reasons)
7. LIFESTYLE RECOMMENDATIONS
8. SUPPLEMENT RECOMMENDATIONS (with doses if applicable)
9. MONITORING & FOLLOW-UP PLAN (frequency, parameters to track)`,
    `${ptCtx()}\nLab Results: ${labCtx()}\nMeal Plan Generated: ${results.meal || 'Not generated'}\nDate: ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}\n\nGenerate complete clinical diet prescription.`
  );

  // ── AI: Counseling Chat ──
  const sendChat = async () => {
    if (!chatMsg.trim() || loading.chat) return;
    const userMsg = chatMsg.trim();
    setChatMsg('');
    const newLog = [...chatLog, { role: 'user', content: userMsg }];
    setChatLog(newLog);
    setLoading(l => ({ ...l, chat: true }));
    try {
      const r = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          system: `You are an empathetic, knowledgeable clinical dietitian at McZEN Academy. Provide accurate, evidence-based, compassionate nutrition counseling. Keep answers practical and easy for patients to understand. Avoid medical jargon where possible. If a question is outside nutrition scope, acknowledge it and suggest the appropriate professional.

CURRENT PATIENT PROFILE:
${ptCtx()}`,
          messages: newLog.map(m => ({ role: m.role, content: m.content })),
        }),
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error.message || JSON.stringify(d.error));
      setChatLog(c => [...c, { role: 'assistant', content: d.content[0].text }]);
    } catch (e) {
      setChatLog(c => [...c, { role: 'assistant', content: `⚠️ Error: ${e.message}` }]);
    }
    setLoading(l => ({ ...l, chat: false }));
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
  };

  // ── Shared styles ──
  const S = {
    card:   { background: '#fff', borderRadius: 12, padding: 20, marginBottom: 14, boxShadow: '0 2px 10px rgba(0,137,123,.07)', border: '1px solid #D9EFEC' },
    inp:    { width: '100%', padding: '8px 12px', borderRadius: 8, border: '1.5px solid #B2DFDB', fontSize: 14, outline: 'none', color: '#1A2E2E', background: '#fff', fontFamily: 'inherit', boxSizing: 'border-box' },
    lbl:    { fontSize: 11, fontWeight: 700, color: '#00695C', marginBottom: 4, display: 'block', textTransform: 'uppercase', letterSpacing: .8 },
    btn:    (bg = '#00897B', dis = false) => ({ background: dis ? '#80CBC4' : bg, color: '#fff', border: 'none', borderRadius: 9, padding: '11px 22px', cursor: dis ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit', transition: 'all .2s', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: dis ? .75 : 1 }),
    stat:   (c) => ({ background: '#F0FDF4', borderRadius: 10, padding: 14, border: `2px solid ${c}22`, textAlign: 'center' }),
    errBox: { background: '#FFEBEE', borderRadius: 8, padding: 12, color: '#B71C1C', fontSize: 13, marginTop: 10 },
  };

  const TABS = ['👤 Patient', '📊 Assessment', '🔬 Lab Analysis', '🍽️ Meal Plan', '💬 Counseling', '📋 Diet Report'];

  // ══════════════════════════════════════════════════════════
  return (
    <>
      <Head>
        <title>McZEN Clinical Nutrition AI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="description" content="AI-powered clinical nutrition platform by McZEN Academy" />
        <meta name="theme-color" content="#004D40" />
      </Head>

      <div style={{ fontFamily: "'Inter','Segoe UI',system-ui,sans-serif", background: '#EEF4F3', minHeight: '100vh' }}>

        {/* ── HEADER ── */}
        <div style={{ background: 'linear-gradient(135deg,#004D40 0%,#00897B 65%,#26A69A 100%)', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 16px rgba(0,77,64,.35)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ width: 46, height: 46, background: 'rgba(255,255,255,.18)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, flexShrink: 0 }}>🌿</div>
          <div style={{ flex: 1 }}>
            <div style={{ color: 'rgba(178,223,219,.85)', fontSize: 10, fontWeight: 800, letterSpacing: 2.5, textTransform: 'uppercase' }}>McZEN Academy</div>
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>Clinical Nutrition AI</div>
            <div style={{ color: 'rgba(178,223,219,.8)', fontSize: 11 }}>AI-Powered Dietetics Platform</div>
          </div>
          {hasPatient && (
            <div style={{ background: 'rgba(255,255,255,.14)', borderRadius: 10, padding: '8px 14px', textAlign: 'right', flexShrink: 0 }}>
              <div style={{ color: 'rgba(178,223,219,.8)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Active Patient</div>
              <div style={{ color: '#fff', fontWeight: 800, fontSize: 15 }}>{pt.name}</div>
              <div style={{ color: 'rgba(178,223,219,.8)', fontSize: 12 }}>{pt.age}y • {pt.gender}</div>
            </div>
          )}
        </div>

        {/* ── NAVIGATION ── */}
        <nav style={{ background: '#00695C', display: 'flex', overflowX: 'auto', padding: '0 6px', gap: 2, position: 'sticky', top: 74, zIndex: 99 }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{
              padding: '11px 13px', border: 'none', whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit',
              background: tab === i ? '#EEF4F3' : 'transparent',
              color: tab === i ? '#00695C' : 'rgba(178,223,219,.9)',
              fontWeight: tab === i ? 700 : 500, fontSize: 12.5,
              borderRadius: tab === i ? '8px 8px 0 0' : 0,
              marginTop: tab === i ? 4 : 0, transition: 'all .2s',
            }}>{t}</button>
          ))}
        </nav>

        {/* ── CONTENT ── */}
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 14px' }}>

          {/* ════════════ TAB 0: PATIENT PROFILE ════════════ */}
          {tab === 0 && (
            <div>
              <h2 style={{ color: '#004D40', fontSize: 17, marginBottom: 16, fontWeight: 800 }}>👤 New Patient Profile</h2>

              <div style={S.card}>
                <h3 style={{ color: '#00695C', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Basic Information</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={S.lbl}>Patient Full Name *</label>
                    <input style={S.inp} placeholder="Enter full name" value={pt.name} onChange={e => setF('name', e.target.value)} />
                  </div>
                  <div>
                    <label style={S.lbl}>Age (Years) *</label>
                    <input style={S.inp} type="number" min="1" max="120" placeholder="e.g. 35" value={pt.age} onChange={e => setF('age', e.target.value)} />
                  </div>
                  <div>
                    <label style={S.lbl}>Gender *</label>
                    <select style={S.inp} value={pt.gender} onChange={e => setF('gender', e.target.value)}>
                      <option>Female</option><option>Male</option><option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Height (cm) *</label>
                    <input style={S.inp} type="number" placeholder="e.g. 162" value={pt.h} onChange={e => setF('h', e.target.value)} />
                  </div>
                  <div>
                    <label style={S.lbl}>Current Weight (kg) *</label>
                    <input style={S.inp} type="number" placeholder="e.g. 70" value={pt.w} onChange={e => setF('w', e.target.value)} />
                  </div>
                  <div>
                    <label style={S.lbl}>Usual Body Weight (kg)</label>
                    <input style={S.inp} type="number" placeholder="Before illness/change" value={pt.uw} onChange={e => setF('uw', e.target.value)} />
                  </div>
                  <div>
                    <label style={S.lbl}>Nutritional Goal</label>
                    <select style={S.inp} value={pt.goal} onChange={e => setF('goal', e.target.value)}>
                      {GOALS.map(g => <option key={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <h3 style={{ color: '#00695C', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Activity & Dietary Preferences</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={S.lbl}>Physical Activity Level *</label>
                    <select style={S.inp} value={pt.act} onChange={e => setF('act', e.target.value)}>
                      {Object.entries(ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Dietary Type</label>
                    <select style={S.inp} value={pt.diet} onChange={e => setF('diet', e.target.value)}>
                      {DIET_TYPES.map(d => <option key={d}>{d}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={S.lbl}>Food Allergies / Intolerances</label>
                    <input style={S.inp} placeholder="e.g. peanuts, lactose, gluten" value={pt.allergy} onChange={e => setF('allergy', e.target.value)} />
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={S.lbl}>Chief Complaint / Reason for Visit</label>
                    <textarea style={{ ...S.inp, minHeight: 64, resize: 'vertical' }} placeholder="e.g. uncontrolled blood sugar, unexplained weight gain, fatigue after meals, bloating..." value={pt.complaint} onChange={e => setF('complaint', e.target.value)} />
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <h3 style={{ color: '#00695C', fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Medical Conditions</h3>
                <p style={{ fontSize: 12, color: '#546E6E', marginBottom: 12 }}>Select all that apply — directly affects protein, calorie, and dietary recommendations:</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {CONDITIONS.map(c => {
                    const sel = pt.conditions.includes(c);
                    return (
                      <label key={c} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '7px 10px', borderRadius: 8, fontSize: 12.5, background: sel ? '#E0F2F1' : '#F5F5F5', border: `1.5px solid ${sel ? '#00897B' : 'transparent'}`, color: sel ? '#004D40' : '#546E6E', fontWeight: sel ? 600 : 400, transition: 'all .15s' }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleCond(c)} style={{ flexShrink: 0 }} />
                        {c}
                      </label>
                    );
                  })}
                </div>
              </div>

              <button disabled={!hasPatient} onClick={() => setTab(1)} style={{ ...S.btn('#00897B', !hasPatient), width: '100%', borderRadius: 10, fontSize: 15 }}>
                {hasPatient ? 'Continue to Clinical Assessment →' : '⚠️ Fill required fields (*) to continue'}
              </button>
            </div>
          )}

          {/* ════════════ TAB 1: ASSESSMENT ════════════ */}
          {tab === 1 && !hasPatient && (
            <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
              <div style={{ color: '#00695C', fontWeight: 700, marginBottom: 12 }}>Patient Profile Required</div>
              <button onClick={() => setTab(0)} style={S.btn()}>← Go to Patient Profile</button>
            </div>
          )}
          {tab === 1 && hasPatient && CALC && (
            <div>
              <h2 style={{ color: '#004D40', fontSize: 17, marginBottom: 16, fontWeight: 800 }}>📊 Clinical Nutritional Assessment</h2>

              <div style={{ ...S.card, background: 'linear-gradient(135deg,#E0F2F1,#F0FDF4)', border: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 42, height: 42, background: '#00897B', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>👤</div>
                  <div>
                    <div style={{ fontWeight: 800, color: '#004D40', fontSize: 15 }}>{pt.name}</div>
                    <div style={{ color: '#00695C', fontSize: 12 }}>{pt.age}y • {pt.gender} • {pt.diet} • Goal: {pt.goal}</div>
                  </div>
                </div>
                {pt.conditions.length > 0 && (
                  <div style={{ marginTop: 10, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {pt.conditions.map(c => <span key={c} style={{ background: '#00897B', color: '#fff', borderRadius: 20, padding: '2px 10px', fontSize: 11, fontWeight: 700 }}>{c}</span>)}
                  </div>
                )}
              </div>

              <div style={S.card}>
                <h3 style={{ color: '#00695C', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Anthropometric Assessment</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                  {[
                    { l: 'BMI', v: `${CALC.bmi} kg/m²`, n: CALC.bmiLabel, c: CALC.bmiColor },
                    { l: 'Ideal Body Weight', v: `${CALC.ibw} kg`, n: 'Devine Formula', c: '#00897B' },
                    { l: '% Ideal Body Weight', v: `${CALC.pibw}%`, n: +CALC.pibw < 90 ? '⚠️ Below IBW' : +CALC.pibw > 120 ? '🔴 Obese Range' : '✅ Normal Range', c: '#00695C' },
                  ].map(x => (
                    <div key={x.l} style={S.stat(x.c)}>
                      <div style={{ fontSize: 10, color: '#546E6E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 3 }}>{x.l}</div>
                      <div style={{ fontSize: 21, fontWeight: 800, color: x.c, lineHeight: 1.1 }}>{x.v}</div>
                      <div style={{ fontSize: 11, color: x.c, fontWeight: 700, marginTop: 3 }}>{x.n}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={S.card}>
                <h3 style={{ color: '#00695C', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Energy Requirements</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 14 }}>
                  {[
                    { l: 'Basal Metabolic Rate', v: `${CALC.bmr} kcal`, n: 'Mifflin-St Jeor Equation', c: '#0277BD' },
                    { l: 'Total Daily Energy (TDEE)', v: `${CALC.tdee} kcal`, n: `Activity Factor ${CALC.af} × BMR`, c: '#00897B' },
                    { l: 'Target Calories / Day', v: `${CALC.cals} kcal`, n: pt.goal, c: '#2E7D32' },
                  ].map(x => (
                    <div key={x.l} style={S.stat(x.c)}>
                      <div style={{ fontSize: 10, color: '#546E6E', fontWeight: 700, textTransform: 'uppercase', letterSpacing: .6, marginBottom: 3 }}>{x.l}</div>
                      <div style={{ fontSize: 21, fontWeight: 800, color: x.c, lineHeight: 1.1 }}>{x.v}</div>
                      <div style={{ fontSize: 11, color: '#546E6E', fontWeight: 600, marginTop: 3 }}>{x.n}</div>
                    </div>
                  ))}
                </div>

                <div style={{ background: '#E0F2F1', borderRadius: 10, padding: 14 }}>
                  <div style={{ fontWeight: 700, color: '#00695C', fontSize: 13, marginBottom: 10 }}>Macronutrient Distribution</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[
                      { l: 'Carbohydrates', pct: CALC.macros.carb.pct, g: CALC.macros.carb.g, c: '#FF8F00' },
                      { l: 'Protein',       pct: CALC.macros.prot.pct, g: CALC.macros.prot.g, c: '#1565C0' },
                      { l: 'Fat',           pct: CALC.macros.fat.pct,  g: CALC.macros.fat.g,  c: '#AD1457' },
                    ].map(m => (
                      <div key={m.l} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 11, color: '#546E6E', fontWeight: 700 }}>{m.l}</div>
                        <div style={{ fontSize: 20, fontWeight: 800, color: m.c }}>{m.g}g</div>
                        <div style={{ fontSize: 11, color: '#546E6E' }}>{m.pct}% of calories</div>
                        <div style={{ height: 6, background: '#B2DFDB', borderRadius: 4, marginTop: 4 }}>
                          <div style={{ height: '100%', width: `${m.pct}%`, background: m.c, borderRadius: 4 }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div style={S.card}>
                <h3 style={{ color: '#00695C', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Protein & Fluid Requirements</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ background: '#E3F2FD', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, color: '#546E6E', fontWeight: 700, textTransform: 'uppercase' }}>Daily Protein Requirement</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#1565C0', lineHeight: 1.1, marginTop: 4 }}>{CALC.prot.g}<span style={{ fontSize: 14 }}> g/day</span></div>
                    <div style={{ fontSize: 12, color: '#546E6E', marginTop: 4 }}>{CALC.prot.rate} g/kg × {CALC.prot.refW} kg</div>
                    <div style={{ fontSize: 11, color: '#1565C0', fontWeight: 700, marginTop: 4 }}>{CALC.prot.note}</div>
                  </div>
                  <div style={{ background: '#E8F5E9', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 10, color: '#546E6E', fontWeight: 700, textTransform: 'uppercase' }}>Daily Fluid Requirement</div>
                    <div style={{ fontSize: 28, fontWeight: 800, color: '#2E7D32', lineHeight: 1.1, marginTop: 4 }}>{CALC.fluid}<span style={{ fontSize: 14 }}> mL</span></div>
                    <div style={{ fontSize: 12, color: '#546E6E', marginTop: 4 }}>{(CALC.fluid / 1000).toFixed(1)} Litres per day</div>
                    <div style={{ fontSize: 11, color: '#2E7D32', fontWeight: 700, marginTop: 4 }}>35 mL/kg body weight</div>
                  </div>
                </div>
              </div>

              {pt.conditions.length > 0 && (
                <div style={{ ...S.card, border: '2px solid #F57C00', background: '#FFF8E1' }}>
                  <h3 style={{ color: '#E65100', fontSize: 14, fontWeight: 700, marginBottom: 10 }}>⚠️ Condition-Specific Clinical Considerations</h3>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#3E2723', fontSize: 13, lineHeight: 1.9 }}>
                    {pt.conditions.some(c => c.includes('Diabetes')) && <li><strong>Diabetes:</strong> Distribute carbohydrates across 5–6 small meals. Prioritize low-GI foods. Monitor post-prandial glucose 2 hours after meals.</li>}
                    {pt.conditions.includes('Hypertension (High BP)') && <li><strong>Hypertension:</strong> Restrict sodium to 1,500–2,000 mg/day. DASH diet principles. Increase potassium (banana, spinach, sweet potato).</li>}
                    {pt.conditions.includes('CKD (Non-Dialysis)') && <li><strong>CKD:</strong> Protein restricted to 0.6 g/kg. Limit potassium, phosphorus, and sodium. Monitor fluid intake carefully.</li>}
                    {pt.conditions.some(c => c.includes('Anemia') || c.includes('Iron Deficiency')) && <li><strong>Anemia:</strong> Iron-rich foods: ragi, spinach, dates, jaggery. Pair with Vitamin C for absorption. Avoid tea/coffee 1 hour before/after meals.</li>}
                    {pt.conditions.includes('PCOS/PCOD') && <li><strong>PCOS:</strong> Low GI diet, anti-inflammatory foods. Prioritize chromium, inositol (millets), omega-3, magnesium. Avoid processed foods and refined sugar.</li>}
                    {pt.conditions.includes('Hypothyroidism') && <li><strong>Hypothyroidism:</strong> Limit raw goitrogens (cabbage, broccoli, soy). Ensure selenium and iodine from diet. Take thyroid medication 30–60 min before food.</li>}
                    {pt.conditions.includes('NAFLD/Fatty Liver') && <li><strong>NAFLD:</strong> Eliminate alcohol. Reduce fructose and refined carbs. Omega-3 from flaxseed, walnuts. Coffee may be hepatoprotective.</li>}
                    {pt.conditions.includes('Osteoporosis') && <li><strong>Osteoporosis:</strong> Calcium 1,000–1,200 mg/day (dairy, ragi, sesame seeds). Vitamin D 600–800 IU. Avoid soft drinks. Weight-bearing activity daily.</li>}
                    {pt.conditions.includes('IBS/IBD') && <li><strong>IBS/IBD:</strong> Low FODMAP diet during flares. Identify personal trigger foods. Small, frequent meals. Ensure hydration and electrolyte balance.</li>}
                    {pt.conditions.includes('NAFLD/Fatty Liver') && null}
                  </ul>
                </div>
              )}

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={() => setTab(2)} style={{ ...S.btn(), flex: 1, borderRadius: 10 }}>Proceed to Lab Analysis →</button>
                <button onClick={() => setTab(3)} style={{ ...S.btn('#00695C'), flex: 1, borderRadius: 10 }}>Skip to Meal Plan →</button>
              </div>
            </div>
          )}

          {/* ════════════ TAB 2: LAB ANALYSIS ════════════ */}
          {tab === 2 && (
            <div>
              <h2 style={{ color: '#004D40', fontSize: 17, marginBottom: 16, fontWeight: 800 }}>🔬 Biochemical Lab Analysis</h2>
              <p style={{ color: '#546E6E', fontSize: 13, marginBottom: 16 }}>Enter available values. Status shows in real-time. Leave blank if not tested.</p>

              {[
                { group: '🩸 Hematology',           color: '#1565C0', keys: ['hb','iron','ferritin','b12'] },
                { group: '🍬 Glucose Metabolism',    color: '#E65100', keys: ['fbs','hba1c'] },
                { group: '🧬 Protein Status',        color: '#6A1B9A', keys: ['albumin','tp'] },
                { group: '🫘 Renal Function',        color: '#1B5E20', keys: ['cr'] },
                { group: '💊 Lipid Profile',         color: '#B71C1C', keys: ['tc','ldl','hdl','tg'] },
                { group: '☀️ Vitamins & Thyroid',   color: '#004D40', keys: ['vitd','tsh'] },
              ].map(grp => (
                <div key={grp.group} style={{ ...S.card, borderLeft: `4px solid ${grp.color}` }}>
                  <h3 style={{ color: grp.color, fontSize: 13.5, fontWeight: 700, marginBottom: 12 }}>{grp.group}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                    {grp.keys.map(k => {
                      const ref = LAB_REF[k];
                      const st  = labStatus(k, labs[k]);
                      return (
                        <div key={k}>
                          <label style={{ ...S.lbl, color: grp.color }}>{ref.label} ({ref.unit})</label>
                          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                              style={{ ...S.inp, flex: 1 }}
                              type="number" step="0.01"
                              placeholder={`Ref: ${ref.lo(pt.gender)}–${ref.hi(pt.gender)}`}
                              value={labs[k]}
                              onChange={e => setL(k, e.target.value)}
                            />
                            {st && <span style={{ fontSize: 11.5, fontWeight: 700, color: st.c, background: st.bg, padding: '3px 8px', borderRadius: 6, whiteSpace: 'nowrap', flexShrink: 0 }}>{st.s}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              <button onClick={analyzeLabs} disabled={loading.labs} style={{ ...S.btn('#00897B', loading.labs), width: '100%', borderRadius: 10, fontSize: 15 }}>
                {loading.labs ? '⏳ Analyzing Lab Values with AI...' : '🔬 Analyze Labs with AI Clinical Dietitian'}
              </button>
              {errors.labs && <div style={S.errBox}>⚠️ {errors.labs}</div>}

              {results.labs && (
                <div style={{ ...S.card, border: '2px solid #00897B', background: '#F0FDF4', marginTop: 12 }}>
                  <h3 style={{ color: '#00695C', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🩺 AI Nutritional Analysis Report</h3>
                  <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.8, color: '#1A2E2E', fontFamily: 'inherit', margin: 0 }}>{results.labs}</pre>
                  <button onClick={() => setTab(3)} style={{ ...S.btn(), marginTop: 14, width: '100%', borderRadius: 10 }}>Proceed to Meal Plan →</button>
                </div>
              )}
            </div>
          )}

          {/* ════════════ TAB 3: MEAL PLAN ════════════ */}
          {tab === 3 && (
            <div>
              <h2 style={{ color: '#004D40', fontSize: 17, marginBottom: 16, fontWeight: 800 }}>🍽️ AI Therapeutic Meal Plan</h2>

              {!hasPatient ? (
                <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                  <div style={{ color: '#00695C', fontWeight: 700, marginBottom: 12 }}>Complete Patient Profile First</div>
                  <button onClick={() => setTab(0)} style={S.btn()}>← Patient Profile</button>
                </div>
              ) : (
                <>
                  {CALC && (
                    <div style={{ ...S.card, background: '#E0F2F1', border: 'none' }}>
                      <div style={{ fontWeight: 700, color: '#004D40', fontSize: 14, marginBottom: 8 }}>📋 Prescription Summary for {pt.name}</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, fontSize: 13 }}>
                        {[
                          { l: 'Target Calories', v: `${CALC.cals} kcal/day` },
                          { l: 'Protein Target', v: `${CALC.prot.g}g/day` },
                          { l: 'Dietary Type', v: pt.diet },
                          { l: 'Goal', v: pt.goal },
                        ].map(x => (
                          <div key={x.l}>
                            <div style={{ fontSize: 10, color: '#00695C', fontWeight: 700, textTransform: 'uppercase' }}>{x.l}</div>
                            <div style={{ fontWeight: 700, color: '#004D40', marginTop: 2 }}>{x.v}</div>
                          </div>
                        ))}
                      </div>
                      {pt.conditions.length > 0 && <div style={{ marginTop: 8, fontSize: 12, color: '#00695C' }}><strong>Conditions addressed:</strong> {pt.conditions.join(', ')}</div>}
                    </div>
                  )}

                  <button onClick={genMealPlan} disabled={loading.meal} style={{ ...S.btn('#00897B', loading.meal), width: '100%', borderRadius: 10, fontSize: 15, marginBottom: 12 }}>
                    {loading.meal ? '⏳ Generating Personalized Indian Meal Plan...' : '🍽️ Generate AI Meal Plan'}
                  </button>
                  {errors.meal && <div style={S.errBox}>⚠️ {errors.meal}</div>}

                  {results.meal && (
                    <div style={{ ...S.card, border: '2px solid #F9A825', background: '#FFFDE7' }}>
                      <h3 style={{ color: '#F57C00', fontSize: 14, fontWeight: 700, marginBottom: 12 }}>🍱 Personalized 1-Day Therapeutic Meal Plan</h3>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.9, color: '#1A2E2E', fontFamily: 'inherit', margin: 0 }}>{results.meal}</pre>
                      <div style={{ display: 'flex', gap: 12, marginTop: 14 }}>
                        <button onClick={() => setTab(4)} style={{ ...S.btn(), flex: 1, borderRadius: 10 }}>Counseling Chat →</button>
                        <button onClick={() => setTab(5)} style={{ ...S.btn('#004D40'), flex: 1, borderRadius: 10 }}>Generate Full Report →</button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* ════════════ TAB 4: COUNSELING ════════════ */}
          {tab === 4 && (
            <div>
              <h2 style={{ color: '#004D40', fontSize: 17, marginBottom: 16, fontWeight: 800 }}>💬 Nutrition Counseling AI</h2>

              {hasPatient && CALC && (
                <div style={{ ...S.card, background: '#E0F2F1', border: 'none', padding: '10px 16px', marginBottom: 12 }}>
                  <div style={{ fontSize: 12.5, color: '#00695C' }}>
                    <strong>Counseling for:</strong> {pt.name} • {pt.age}y {pt.gender} • BMI {CALC.bmi} ({CALC.bmiLabel}) • {pt.conditions.join(', ') || 'General Nutrition'} • {pt.diet}
                  </div>
                </div>
              )}

              <div className="chat-scroll" style={{ ...S.card, minHeight: 380, maxHeight: 460, overflowY: 'auto', background: '#FAFAFA', padding: 14 }}>
                {chatLog.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '28px 12px' }}>
                    <div style={{ fontSize: 44, marginBottom: 10 }}>🌿</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#00897B', marginBottom: 6 }}>McZEN Nutrition AI Counselor</div>
                    <div style={{ fontSize: 13, color: '#546E6E', marginBottom: 18 }}>Ask any nutrition question. All answers are personalized to the active patient.</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        'What foods should I avoid for my condition?',
                        'How do I improve hemoglobin naturally?',
                        'Give me high-protein vegetarian snacks',
                        'What supplements should I take?',
                        'Explain glycemic index in simple terms',
                        'How many meals should I eat per day?',
                      ].map(q => (
                        <button key={q} onClick={() => setChatMsg(q)} style={{ padding: '9px 11px', background: '#E0F2F1', border: '1px solid #B2DFDB', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: '#004D40', textAlign: 'left', fontFamily: 'inherit' }}>
                          💬 {q}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {chatLog.map((m, i) => (
                  <div key={i} style={{ marginBottom: 14, display: 'flex', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: m.role === 'user' ? '#00897B' : '#004D40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, flexShrink: 0 }}>
                      {m.role === 'user' ? '👤' : '🌿'}
                    </div>
                    <div style={{ maxWidth: '78%', background: m.role === 'user' ? '#E0F2F1' : '#fff', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '10px 14px', border: '1px solid #B2DFDB', fontSize: 13, lineHeight: 1.75, color: '#1A2E2E', whiteSpace: 'pre-wrap' }}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading.chat && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#004D40', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>🌿</div>
                    <div style={{ background: '#fff', borderRadius: '16px 16px 16px 4px', padding: '10px 16px', fontSize: 13, color: '#546E6E', border: '1px solid #B2DFDB' }}>Analyzing and preparing response...</div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                <input
                  style={{ ...S.inp, flex: 1 }}
                  placeholder="Type your nutrition question... (Enter to send)"
                  value={chatMsg}
                  onChange={e => setChatMsg(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                />
                <button onClick={sendChat} disabled={loading.chat || !chatMsg.trim()} style={{ ...S.btn('#00897B', loading.chat || !chatMsg.trim()), flexShrink: 0 }}>
                  Send →
                </button>
              </div>
              <div style={{ fontSize: 11, color: '#546E6E', marginTop: 6, textAlign: 'center' }}>
                Powered by Claude AI • Context-aware for {pt.name || 'patient'}
              </div>
            </div>
          )}

          {/* ════════════ TAB 5: DIET REPORT ════════════ */}
          {tab === 5 && (
            <div>
              <h2 style={{ color: '#004D40', fontSize: 17, marginBottom: 16, fontWeight: 800 }}>📋 Clinical Diet Prescription Report</h2>

              {!hasPatient ? (
                <div style={{ ...S.card, textAlign: 'center', padding: 40 }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>⚠️</div>
                  <div style={{ color: '#00695C', fontWeight: 700, marginBottom: 12 }}>Complete Patient Profile First</div>
                  <button onClick={() => setTab(0)} style={S.btn()}>← Patient Profile</button>
                </div>
              ) : (
                <>
                  <button onClick={genReport} disabled={loading.report} style={{ ...S.btn('#00897B', loading.report), width: '100%', borderRadius: 10, fontSize: 15, marginBottom: 12 }}>
                    {loading.report ? '⏳ Generating Clinical Report...' : '📋 Generate Full Clinical Diet Report'}
                  </button>
                  {errors.report && <div style={S.errBox}>⚠️ {errors.report}</div>}

                  {results.report && (
                    <>
                      <div id="printable-report" style={S.card}>
                        <div style={{ textAlign: 'center', borderBottom: '2px solid #B2DFDB', paddingBottom: 16, marginBottom: 20 }}>
                          <div style={{ fontSize: 20, fontWeight: 800, color: '#004D40' }}>🌿 McZEN Academy</div>
                          <div style={{ fontSize: 13.5, color: '#00897B', fontWeight: 700, marginTop: 2 }}>Clinical Nutrition Assessment & Diet Prescription</div>
                          <div style={{ fontSize: 12, color: '#546E6E', marginTop: 4 }}>
                            {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })} &nbsp;•&nbsp; Patient: {pt.name} &nbsp;•&nbsp; {pt.age}y {pt.gender}
                          </div>
                        </div>
                        <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.85, color: '#1A2E2E', fontFamily: 'inherit', margin: 0 }}>{results.report}</pre>
                        <div style={{ borderTop: '1px solid #B2DFDB', marginTop: 20, paddingTop: 10, textAlign: 'center', fontSize: 11, color: '#546E6E' }}>
                          McZEN Academy • Clinical Nutrition Platform • AI-Assisted Dietary Assessment & Prescription
                        </div>
                      </div>
                      <button onClick={() => window.print()} style={{ ...S.btn('#004D40'), width: '100%', borderRadius: 10, marginTop: 12, fontSize: 15 }}>
                        🖨️ Print / Save as PDF
                      </button>
                    </>
                  )}
                </>
              )}
            </div>
          )}

        </div>{/* /content */}
      </div>
    </>
  );
}
