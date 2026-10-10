from sqlalchemy import Column, Integer, String, Text
from database import Base

class Quest(Base):
    __tablename__ = "quests"

    id = Column(Integer, primary_key=True, index=True)

    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)

    duration = Column(Integer, nullable=False)
    difficulty = Column(Integer, nullable=False)
    xp = Column(Integer, nullable=False)

    status = Column(String, default="pending")

    reflection = Column(Text, nullable=True)
    feedback = Column(Text, nullable=True)

    created_at = Column(String, nullable=True)
    completed_at = Column(String, nullable=True)