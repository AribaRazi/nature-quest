import requests
import json

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "gemma3:270m"


def ask_gemma(prompt):

    response = requests.post(
        OLLAMA_URL,
        json={
            "model": MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"
        },
        timeout=120
    )

    response.raise_for_status()

    return json.loads(response.json()["response"])

def generate_quest(duration, energy, difficulty):
    prompt = f"""
You are NatureQuest, a creative outdoor activity planner.

Create ONE specific, simple, enjoyable outdoor quest for an ordinary person
in their everyday surroundings.

USER SETTINGS:
- Available time: {duration} minutes
- Energy level: {energy}
- Difficulty: {difficulty} out of 5

IMPORTANT RULES:
1. Assume the person is near their home, apartment, balcony,
   rooftop, garden, local street, or nearby park.
2. NEVER assume they can visit a forest, mountain, lake, wildlife
   sanctuary, or travel somewhere special.
3. Do NOT give generic tasks like "explore nature" or
   "observe flora and fauna".
4. Give a DIFFERENT, specific activity each time.
5. The quest must be realistic, safe, and possible with no equipment.
6. Give exactly 3 to 5 actionable steps as a JSON array of strings.
7. Every step must tell the user exactly what to do.
8. Match the activity to the time, energy, and difficulty.
9. Keep the total activity within the available time.
10. Do not require buying anything, taking photos, using the internet,
    or entering private property.
11. Keep the language friendly, simple, and encouraging.
12. Return valid JSON only. No Markdown or extra text.

IDEAS FOR INSPIRATION — choose one idea and make it specific.
Do not copy the same idea every time:
- Take a short walk and notice three different sounds.
- Find five different shades of green on your usual street.
- Sit outside for five minutes without looking at your phone.
- Notice how sunlight and shadows fall on nearby objects.
- Find three interesting shapes in clouds, leaves, or buildings.
- Walk a familiar route slowly and notice something you usually miss.
- Find a quiet spot and identify sounds from near to far.
- Notice the wind on your skin and how it changes along your walk.
- Find three small details in your surroundings you have never noticed.
- Take a gentle walking break and mentally describe your surroundings.
- Notice how the same place looks different from another safe viewpoint.
- Spend a few minutes observing one ordinary object outdoors.

OUTPUT FORMAT:
{{
  "title": "A short, creative title",
  "description": "One sentence explaining the quest.",
  "steps": [
    "First specific action",
    "Second specific action",
    "Third specific action"
  ],
  "duration": {duration},
  "difficulty": {difficulty},
  "xp": 30
}}

XP must be an integer between 10 and 100.
Use a short title. Avoid vague wording.
"""
    result = ask_gemma(prompt)

    # Validate and normalize the small model's output.
    result["title"] = str(result.get("title", "A Little Outdoor Reset")).strip()
    result["description"] = str(
        result.get("description", "Take a short break outdoors and notice your surroundings.")
    ).strip()

    steps = result.get("steps", [])
    if not isinstance(steps, list):
        steps = []

    result["steps"] = [
        str(step).strip() for step in steps
        if isinstance(step, str) and step.strip()
    ][:5]

    result["duration"] = duration
    result["difficulty"] = difficulty

    try:
        result["xp"] = max(10, min(100, int(result.get("xp", 30))))
    except (ValueError, TypeError):
        result["xp"] = 30

    # Ensure the quest always has actionable steps.
    if len(result["steps"]) < 3:
        result["steps"] = [
            f"Walk outdoors safely for {max(2, duration // 3)} minutes.",
            "Pause and identify three different sounds around you.",
            "Before returning, notice one detail you usually overlook."
        ]

    return result

def evaluate_reflection(quest, reflection):

    prompt = f"""
You are evaluating a real-world outdoor challenge.

Quest:
{quest.description}

User reflection:
{reflection}

Evaluate whether the user meaningfully completed the quest.

Return ONLY JSON:

{{
    "completed": true,
    "score": 0,
    "feedback": "...",
    "bonus_xp": 0
}}

Rules:
- score is between 0 and 100
- bonus_xp is between 0 and 20
- feedback should be encouraging
- do not invent activities the user did not mention
"""

    return ask_gemma(prompt)