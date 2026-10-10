from pydantic import BaseModel


class QuestRequest(BaseModel):
    duration: int
    energy: str
    difficulty: int


class ReflectionRequest(BaseModel):
    reflection: str