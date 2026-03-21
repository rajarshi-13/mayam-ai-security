from fastapi import APIRouter, Request
from app.services.mayam_engine import analyze_input
from app.models.db import SessionLocal
from app.models.models import Report

router = APIRouter()

@router.post("/analyze/email")
async def analyze_email(request: Request):
    data = await request.json()
    result = analyze_input(data)
    db = SessionLocal()
    new_report = Report(
        type=data.get("type"),
        sender=data.get("sender"),
        content=data.get("content"),
        category=result.get("category"),
        risk_score=result.get("risk_score"),
        explanation=result.get("explanation"),
        action=result.get("recommended_action")
    )
    db.add(new_report)
    db.commit()
    db.close()
    return result

@router.post("/analyze/link")
async def analyze_link(request: Request):
    data = await request.json()
    result = analyze_input(data)
    db = SessionLocal()
    new_report = Report(
        type=data.get("type"),
        sender="",
        content=data.get("content"),
        category=result.get("category"),
        risk_score=result.get("risk_score"),
        explanation=result.get("explanation"),
        action=result.get("recommended_action")
    )
    db.add(new_report)
    db.commit()
    db.close()
    return result

@router.post("/analyze/message")
async def analyze_message(request: Request):
    data = await request.json()
    return analyze_input(data)
