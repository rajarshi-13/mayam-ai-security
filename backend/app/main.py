from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.analyze import router as analyze_router
from app.routes.chat import router as chat_router
from app.routes.system import router as system_router
from app.models.db import engine, SessionLocal
from app.models.models import Base, Report

app = FastAPI()

# -------------------------------
# CORS
# -------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# -------------------------------
# GET REPORTS
# -------------------------------
@app.get("/reports")
async def get_reports():
    db = SessionLocal()
    reports = db.query(Report).all()
    db.close()
    return reports[::-1]

# -------------------------------
# INCLUDE ROUTERS
# -------------------------------
app.include_router(analyze_router)
app.include_router(chat_router)
app.include_router(system_router)

# -------------------------------
# ROOT
# -------------------------------
@app.get("/")
async def root():
    return {"message": "MAYAM Backend Running"}
