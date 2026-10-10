from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime

from database import engine, SessionLocal, Base
from models import Quest
from schemas import QuestRequest, ReflectionRequest
from ai import generate_quest, evaluate_reflection


Base.metadata.create_all(bind=engine)

app = FastAPI(title="Offline Nature Quest")


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5500",
        "http://localhost:5500"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# ---------------- HOME ----------------

@app.get("/")
def home():
    return {
        "message": "Offline Nature Quest API running",
        "ai": "Gemma 3 270M",
        "mode": "offline"
    }


# ---------------- GENERATE QUEST ----------------

@app.post("/quests/generate")
def create_quest(request: QuestRequest):

    quest = generate_quest(
        request.duration,
        request.energy,
        request.difficulty
    )

    db = SessionLocal()

    new_quest = Quest(
        title=quest["title"],
        description=quest["description"],
        duration=quest["duration"],
        difficulty=quest["difficulty"],
        xp=quest["xp"],
        status="pending",
        created_at=datetime.now().isoformat()
    )

    db.add(new_quest)
    db.commit()
    db.refresh(new_quest)

    result = {
        "id": new_quest.id,
        "title": new_quest.title,
        "description": new_quest.description,
        "duration": new_quest.duration,
        "difficulty": new_quest.difficulty,
        "xp": new_quest.xp,
        "status": new_quest.status
    }

    db.close()

    return result


# ---------------- GET ALL QUESTS ----------------

@app.get("/quests")
def get_quests():

    db = SessionLocal()

    quests = db.query(Quest).order_by(
        Quest.id.desc()
    ).all()

    result = []

    for quest in quests:
        result.append({
            "id": quest.id,
            "title": quest.title,
            "description": quest.description,
            "duration": quest.duration,
            "difficulty": quest.difficulty,
            "xp": quest.xp,
            "status": quest.status,
            "reflection": quest.reflection,
            "feedback": quest.feedback
        })

    db.close()

    return result


# ---------------- GET ONE QUEST ----------------

@app.get("/quests/{quest_id}")
def get_quest(quest_id: int):

    db = SessionLocal()

    quest = db.query(Quest).filter(
        Quest.id == quest_id
    ).first()

    db.close()

    if not quest:
        raise HTTPException(
            status_code=404,
            detail="Quest not found"
        )

    return {
        "id": quest.id,
        "title": quest.title,
        "description": quest.description,
        "duration": quest.duration,
        "difficulty": quest.difficulty,
        "xp": quest.xp,
        "status": quest.status,
        "reflection": quest.reflection,
        "feedback": quest.feedback
    }


# ---------------- COMPLETE QUEST ----------------

@app.post("/quests/{quest_id}/complete")
def complete_quest(quest_id: int):
    db = SessionLocal()

    try:
        quest = db.query(Quest).filter(
            Quest.id == quest_id
        ).first()

        if not quest:
            raise HTTPException(
                status_code=404,
                detail="Quest not found"
            )

        if quest.status == "completed":
            raise HTTPException(
                status_code=400,
                detail="Quest already completed"
            )

        quest.status = "completed"
        quest.completed_at = datetime.now().isoformat()

        # Save values before closing the session.
        quest_id_result = quest.id
        xp_earned = quest.xp

        db.commit()

        return {
            "message": "Quest completed!",
            "quest_id": quest_id_result,
            "xp_earned": xp_earned
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()



# ---------------- REFLECTION ----------------

@app.post("/quests/{quest_id}/reflect")
def reflect(quest_id: int, request: ReflectionRequest):

    db = SessionLocal()

    quest = db.query(Quest).filter(
        Quest.id == quest_id
    ).first()

    if not quest:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Quest not found"
        )

    evaluation = evaluate_reflection(
        quest,
        request.reflection
    )

    quest.reflection = request.reflection
    quest.feedback = evaluation["feedback"]

    if evaluation["completed"]:
        quest.status = "completed"
        quest.completed_at = datetime.now().isoformat()

    db.commit()

    result = {
        "quest_id": quest.id,
        "completed": evaluation["completed"],
        "score": evaluation["score"],
        "feedback": evaluation["feedback"],
        "bonus_xp": evaluation["bonus_xp"]
    }

    db.close()

    return result


# ---------------- STATS ----------------

@app.get("/stats")
def get_stats():

    db = SessionLocal()

    quests = db.query(Quest).all()

    completed = [
        q for q in quests
        if q.status == "completed"
    ]

    total_xp = sum(q.xp for q in completed)

    level = (total_xp // 100) + 1
    xp_current = total_xp % 100

    db.close()

    return {
        "total_xp": total_xp,
        "level": level,
        "xp_current_level": xp_current,
        "completed_quests": len(completed),
        "total_quests": len(quests)
    }

# ---------delete quest----------#
@app.delete("/quests/{quest_id}")
def delete_quest(quest_id: int):
    db = SessionLocal()

    try:
        quest = db.query(Quest).filter(Quest.id == quest_id).first()

        if not quest:
            raise HTTPException(
                status_code=404,
                detail="Quest not found"
            )

        db.delete(quest)
        db.commit()

        return {
            "message": "Quest deleted successfully",
            "quest_id": quest_id
        }

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()

