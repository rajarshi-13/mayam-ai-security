# INPUT FORMAT
{
 "type": "email | link | message",
 "content": "string",
 "sender": "string (optional)",
 "links": ["array of urls"],
 "timestamp": "string"
}

# OUTPUT FORMAT
{
 "risk_score": 0-100,
 "category": "safe | suspicious | threat",
 "tactics": ["urgency", "fear", "authority"],
 "explanation": "string",
 "recommended_action": "string",
 "sender_risk": "low | medium | high"
}