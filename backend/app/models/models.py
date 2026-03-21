from sqlalchemy import Column, Integer, String, Text
from .db import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)

    type = Column(String)
    sender = Column(String)
    content = Column(Text)

    category = Column(String)
    risk_score = Column(Integer)

    explanation = Column(Text)
    action = Column(Text)