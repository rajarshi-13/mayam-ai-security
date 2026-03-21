from fastapi import APIRouter, Request
from app.services.chat_engine import chat_response

# THIS LINE IS IMPORTANT
router = APIRouter()

@router.post("/chat")
async def chat(request: Request):
    data = await request.json()
    user_msg = data.get("message")
    context = data.get("context", "")

    return chat_response(user_msg, context)