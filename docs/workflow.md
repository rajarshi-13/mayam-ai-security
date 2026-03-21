# 🔄 MAYAM Workflow (Step-by-Step)

1️⃣ Input Capture
- User receives email / link / message
- TRAE collects and formats data

        ↓

2️⃣ API Call
- Sent to backend:
  POST /analyze/email
  POST /analyze/link
  POST /analyze/message

        ↓

3️⃣ MAYAM Processing

   🧠 Intent Detection
   → urgency, fear, authority, reward

   🔗 Link Analysis
   → IP links, short URLs, suspicious domains

   👤 Sender Analysis
   → fake or risky sender detection

   🤖 Deception Analysis (LLM)
   → explains how user is being manipulated

   📊 Risk Scoring
   → combines all signals (0–100)

   💡 Guidance (USP)
   → safe reply + next attacker step

        ↓

4️⃣ Output (JSON)

{
  risk_score,
  category,
  tactics,
  explanation,
  safe_reply,
  next_likely_step
}

        ↓

5️⃣ Dashboard Display

- ⚠️ Risk Level
- 🧠 Explanation
- 🎯 Tactics
- 💬 Safe Reply
- 🔮 Next Step Prediction

🔥 Final Outcome:
User understands the scam and avoids making a mistake.