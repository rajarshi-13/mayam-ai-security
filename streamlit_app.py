import streamlit as st
import subprocess
import requests



# -------------------------------
# CONFIG
# -------------------------------
BACKEND_URL = "http://127.0.0.1:8000"

st.set_page_config(page_title="MAYAM Control Center", layout="wide")

# -------------------------------
# TITLE
# -------------------------------
st.title("🧠 MAYAM AI Cybersecurity Control Center")

# -------------------------------
# SIDEBAR (CONTROL PANEL)
# -------------------------------
st.sidebar.header("⚙️ System Control")

if st.sidebar.button("▶️ Start Backend"):
    try:
        subprocess.Popen(
            ["uvicorn", "app.main:app", "--reload"],
            cwd="backend"
        )
        st.success("Backend started")
    except Exception as e:
        st.error(str(e))

if st.sidebar.button("📥 Fetch Emails"):
    try:
        subprocess.run(
            ["python", "app/services/gmail_fetch.py"],
            cwd="backend"
        )
        st.success("Emails fetched")
    except Exception as e:
        st.error(str(e))

if st.sidebar.button("🔄 Refresh"):
    st.rerun()

# -------------------------------
# FETCH DATA
# -------------------------------
def fetch_reports():
    try:
        res = requests.get(f"{BACKEND_URL}/reports")
        return res.json()
    except:
        return []

reports = fetch_reports()

# -------------------------------
# LIVE FEED
# -------------------------------
st.subheader("📡 Live Threat Feed")

if not reports:
    st.warning("No data available")
else:
    for report in reports:

        category = report.get("category", "safe")
        score = report.get("risk_score", 0)

        # -------------------------------
        # SMART VERDICT (FIXED LOGIC)
        # -------------------------------
        if score >= 70:
            verdict = "🔴 HIGH RISK – DO NOT INTERACT"
            color = "#ff4d4d"
        elif score >= 40:
            verdict = "🟡 SUSPICIOUS – VERIFY FIRST"
            color = "#ffa500"
        else:
            verdict = "🟢 SAFE – LOW RISK"
            color = "#2ecc71"

        # -------------------------------
        # CARD UI
        # -------------------------------
        st.markdown(
            f"""
            <div style="
                border: 2px solid {color};
                border-radius: 12px;
                padding: 15px;
                margin-bottom: 15px;
                background-color: #111;
            ">
                <h3>{verdict}</h3>
                <p><b>Risk Score:</b> {score}</p>
                <p><b>Type:</b> {report.get('type')}</p>
                <p><b>Explanation:</b> {report.get('explanation')}</p>
                <p><b>Action:</b> {report.get('action')}</p>
            </div>
            """,
            unsafe_allow_html=True
        )

        # -------------------------------
        # DETAILS
        # -------------------------------
        with st.expander("View Details"):
            st.write("### Sender")
            st.write(report.get("sender", "Unknown"))

            st.write("### Content")
            st.code(report.get("content", ""))

            st.write("### Tactics (Psychology)")
            st.write(report.get("tactics", []))

# -------------------------------
# ANALYTICS
# -------------------------------
st.subheader("📊 Analytics")

if reports:
    safe = sum(1 for r in reports if r["category"] == "safe")
    suspicious = sum(1 for r in reports if r["category"] == "suspicious")
    threat = sum(1 for r in reports if r["category"] == "threat")

    col1, col2, col3 = st.columns(3)

    col1.metric("🟢 Safe", safe)
    col2.metric("🟡 Suspicious", suspicious)
    col3.metric("🔴 Threat", threat)

    total = len(reports)
    threat_rate = (threat / total) * 100 if total else 0

    st.metric("Threat Detection Rate", f"{threat_rate:.1f}%")

# -------------------------------
# MANUAL ANALYSIS
# -------------------------------
st.subheader("🧪 Analyze Message")

user_text = st.text_area("Paste message")

if st.button("Analyze"):
    payload = {
        "type": "message",
        "content": user_text,
        "sender": "",
        "links": [],
        "timestamp": ""
    }

    try:
        res = requests.post(f"{BACKEND_URL}/analyze/message", json=payload)
        result = res.json()

        st.success("Analysis Complete")

        st.write("### Verdict:", result.get("category"))
        st.write("### Risk:", result.get("risk_score"))

        st.write("### Why?")
        st.info(result.get("explanation"))

        st.write("### What should you do?")
        st.error(result.get("recommended_action"))

        st.write("### Suggested Reply")
        st.success(result.get("safe_reply"))

    except Exception as e:
        st.error(str(e))

st.subheader("💬 MAYAM Assistant")

user_input = st.text_input("Ask anything about this threat")

if st.button("Ask MAYAM"):

    res = requests.post("http://127.0.0.1:8000/chat", json={
        "message": user_input,
        "context": st.session_state.get("last_analysis", "")
    })

    data = res.json()

    st.write("🤖 MAYAM:")
    st.write(data["response"])