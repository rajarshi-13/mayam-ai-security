import os
from dotenv import load_dotenv
from langchain_groq import ChatGroq

load_dotenv()

llm = ChatGroq(
    model="llama-3.1-8b-instant",
    api_key=os.getenv("GROQ_API_KEY")
)

def chat_response(user_msg, context):

    prompt = f"""
You are MAYAM — a cybersecurity AI mentor.

Your job:
- Teach users about scams
- Explain attacker psychology
- Help them respond safely

Context of recent analysis:
{context}

User message:
{user_msg}

Rules:
- Be practical
- No technical jargon
- Focus on human psychology
- Keep answers short and clear

If user asks:
- "why scam?" → explain tactics
- "what reply?" → give safe reply
- "what next?" → predict attacker move

Return plain text (NOT JSON).
"""

    try:
        res = llm.invoke(prompt)
        return {
            "response": res.content.strip()
        }
    except:
        return {
            "response": "Unable to process right now"
        }