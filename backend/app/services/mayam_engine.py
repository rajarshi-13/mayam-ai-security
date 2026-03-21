import os
import re
import json
from urllib.parse import urlparse
from dotenv import load_dotenv
from langchain_groq import ChatGroq

# -------------------------------
# ENV + LLM SETUP
# -------------------------------
load_dotenv()

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

TRUSTED_DOMAINS = [
    "google.com", "accounts.google.com", "gmail.com",
    "chatgpt.com", "openai.com", "github.com",
    "amazon.in", "amazon.com", "youtube.com",
    "linkedin.com", "microsoft.com", "apple.com",
    "netflix.com", "facebook.com", "instagram.com",
    "twitter.com", "x.com", "paypal.com", "stripe.com",
    "localhost:5173", "127.0.0.1:8000"
]

# -------------------------------
# 1. HEURISTIC ENGINE (RULE-BASED)
# -------------------------------
def get_heuristics_score(url: str):
    score = 0
    reasons = []
    
    parsed = urlparse(url.lower())
    domain = parsed.netloc or url.lower()
    
    # Remove port if exists
    domain = domain.split(':')[0]
    
    # 1. IP Address as Domain
    if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", domain):
        score += 40
        reasons.append("IP address used instead of domain name")
        
    # 2. Typosquatting / Homograph check (Basic)
    # Check if domain is 'almost' a trusted domain
    for trusted in TRUSTED_DOMAINS:
        if domain != trusted and trusted in domain:
            # e.g., login-google.com or google.com.secure-login.net
            score += 30
            reasons.append(f"Domain contains trusted brand name '{trusted}' but isn't the official site")
            
    # 3. Excessive Subdomains
    if domain.count('.') > 3:
        score += 15
        reasons.append("Unusual number of subdomains detected")
        
    # 4. Suspicious Keywords in URL
    suspicious_keywords = ["login", "secure", "verify", "update", "account", "banking", "wallet", "signin"]
    if any(kw in url.lower() for kw in suspicious_keywords) and domain not in TRUSTED_DOMAINS:
        score += 10
        reasons.append("URL contains sensitive keywords often used in phishing")
        
    # 5. Length Check (Phishing URLs are often very long)
    if len(url) > 100:
        score += 10
        reasons.append("URL is unusually long")

    return score, reasons

# -------------------------------
# 2. SENDER ANALYSIS
# -------------------------------
def analyze_sender(sender):
    if not sender:
        return "low"

    sender = sender.lower()

    trusted_domains = [
        "google.com",
        "accounts.google.com",
        "amazon.in",
        "bank.com"
    ]

    if any(domain in sender for domain in trusted_domains):
        return "low"

    if any(fake in sender for fake in ["fake", "support123", "noreply-secure"]):
        return "high"

    if "@" not in sender:
        return "high"

    return "medium"


# -------------------------------
# 4. LLM ANALYSIS (CONTROLLED)
# -------------------------------
def generate_analysis(content):

    prompt = f"""
You are an AI cybersecurity assistant named MAYAM.

Analyze this message or URL and classify it realistically.

Message/URL:
{content}

Rules:
- If it is a known malicious site, asks for sensitive info (password, OTP, bank details, money), or is an obvious phishing attempt → "threat"
- If it has suspicious elements like typosquatting, unusual domain, creates artificial urgency, or lacks security features → "suspicious"
- If it is a well-known trusted domain or a clearly safe message → "safe"

Be practical. Do NOT overestimate risk, but prioritize user safety.

Return ONLY JSON:

{{
 "risk_score": number (0-100),
 "category": "safe | suspicious | threat",
 "tactics": ["list", "of", "tactics", "if", "any"],
 "explanation": "one short clear sentence on why",
 "recommended_action": "brief actionable advice",
 "safe_reply": "if message, what user can reply safely",
 "next_likely_step": "what an attacker might do next"
}}
"""

    try:
        response = llm.invoke(prompt)
        raw = response.content.strip()
        cleaned = raw.replace("```json", "").replace("```", "").strip()
        result = json.loads(cleaned)
        
        # Standardize category
        cat = result.get("category", "suspicious").lower()
        if "threat" in cat or "fake" in cat or "danger" in cat:
            result["category"] = "threat"
        elif "safe" in cat or "trusted" in cat:
            result["category"] = "safe"
        else:
            result["category"] = "suspicious"
            
        return result
    except:
        return {
            "risk_score": 50,
            "category": "suspicious",
            "tactics": [],
            "explanation": "Could not analyze properly",
            "recommended_action": "Be cautious",
            "safe_reply": "I will verify this first",
            "next_likely_step": "Unknown"
        }

# -------------------------------
# 4. MAIN ENGINE
# -------------------------------
def analyze_input(data: dict) -> dict:
    content = data.get("content", "")
    content_lower = content.lower()
    
    # 1. HEURISTIC PRE-SCAN (Rule-based)
    h_score, h_reasons = get_heuristics_score(content)
    
    # 2. AI ANALYSIS (LLM-based)
    result = generate_analysis(content)
    
    # 3. HYBRID INTEGRATION (Merging AI + Rules)
    # If heuristics found high risk but AI missed it, upgrade result
    if h_score >= 30:
        result["risk_score"] = max(result.get("risk_score", 0), h_score + 20)
        if result["risk_score"] > 60:
            result["category"] = "threat"
        elif result["risk_score"] > 30:
            result["category"] = "suspicious"
            
        # Append heuristic findings to explanation if not already present
        if h_reasons:
            h_text = " Heuristic findings: " + ", ".join(h_reasons)
            if h_text not in result["explanation"]:
                result["explanation"] += h_text

    # 4. LIGHT SAFETY GUARD (CRITICAL OVERRIDES)
    if "otp" in content_lower or "password" in content_lower or "cvv" in content_lower:
        result["category"] = "threat"
        result["risk_score"] = max(result.get("risk_score", 0), 95)
        result["explanation"] = "Direct request for highly sensitive credentials detected."
        result["recommended_action"] = "⚠️ STOP. This is a phishing attempt. Never share OTPs or passwords."

    # 5. TRUSTED DOMAIN FINAL VERIFICATION
    # Extra check: make sure it's not a subdomain trick like google.com.malicious.com
    for domain in TRUSTED_DOMAINS:
        pattern = rf"(^|https?://)([a-z0-9-]+\.)*{re.escape(domain)}(/|$)"
        if re.search(pattern, content_lower):
            # If it matches a trusted pattern perfectly, force safe
            result["category"] = "safe"
            result["risk_score"] = min(result.get("risk_score", 5), 5)
            result["explanation"] = f"Verified official {domain} domain."
            result["recommended_action"] = "Safe to proceed."
            break

    return result