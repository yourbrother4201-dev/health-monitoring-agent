from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import csv
import io
import json
import xml.etree.ElementTree as ET

from fastapi import UploadFile, File

from backend.database.database import (
    init_db,
    get_health_summary,
    get_medications,
    get_dose_log,
    get_metrics,
    add_metric,
)

from backend.analytics import get_health_analytics
from backend.insights import generate_health_insights
from backend.agent import run_agent
from backend.reports import generate_health_report
from typing import Optional
from fastapi import HTTPException
from backend.tools.medicine_tools import check_medication_interactions
from backend.database.database import (
    get_fitness_activities,
    add_fitness_activity,
    get_fitness_summary,
    add_health_goal,
    get_health_goals,
    get_health_goal_progress,

)

app = FastAPI(
    title="Smart Health Assistant API",
    description="Backend API for the Track B Smart Health Assistant",
    version="1.0.0"
)


ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174"
]


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


# Initialize database
init_db()


class QuestionRequest(BaseModel):
    question: str = Field(
        min_length=1,
        max_length=500
    )

class FitnessActivityRequest(BaseModel):
    activity_type: str = Field(min_length=1, max_length=50)
    duration_minutes: Optional[int] = Field(default=None, ge=0, le=1440)
    steps: Optional[int] = Field(default=None, ge=0, le=200000)
    distance_km: Optional[float] = Field(default=None, ge=0, le=1000)
    calories_burned: Optional[int] = Field(default=None, ge=0, le=20000)
    sleep_hours: Optional[float] = Field(default=None, ge=0, le=24)
    notes: str = Field(default="", max_length=500)



class HealthGoalRequest(BaseModel):
    goal_type: str = Field(min_length=1, max_length=50)
    target_value: float = Field(gt=0, le=1000000)
    unit: str = Field(min_length=1, max_length=30)


class MedicationInteractionRequest(BaseModel):
    medications: list[str] = Field(min_length=1)


@app.get("/")
def home():
    return {
        "message": "Smart Health Assistant API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


@app.get("/health/summary")
def health_summary():
    return get_health_summary()


@app.get("/medications")
def medications():
    return get_medications(
        active_only=True
    )


@app.get("/dose-history")
def dose_history():
    return get_dose_log()


@app.get("/health-metrics")
def health_metrics():
    return get_metrics()


@app.get("/analytics")
def analytics():
    return get_health_analytics()


@app.get("/insights")
def health_insights():
    return generate_health_insights()


@app.post("/ask")
def ask_question(request: QuestionRequest):

    answer = run_agent(
        request.question
    )

    return {
        "question": request.question,
        "answer": answer
    }


@app.get("/fitness-activities")
def fitness_activities():
    return get_fitness_activities()


@app.post("/fitness-activities")
def create_fitness_activity(request: FitnessActivityRequest):
    activity_type = request.activity_type.strip()

    if not activity_type:
        raise HTTPException(
            status_code=422,
            detail="Activity type cannot be empty."
        )

    measurements = [
        request.duration_minutes,
        request.steps,
        request.distance_km,
        request.calories_burned,
        request.sleep_hours,
    ]

    if all(value is None for value in measurements):
        raise HTTPException(
            status_code=422,
            detail="Provide at least one fitness measurement."
        )

    activity_id = add_fitness_activity(
        activity_type=activity_type,
        duration_minutes=request.duration_minutes,
        steps=request.steps,
        distance_km=request.distance_km,
        calories_burned=request.calories_burned,
        sleep_hours=request.sleep_hours,
        notes=request.notes,
    )

    return {
        "message": "Fitness activity saved successfully.",
        "id": activity_id,
    }


@app.post("/medication-interactions")
def medication_interactions(request: MedicationInteractionRequest):
    medication_names = [
        name.strip()
        for name in request.medications
        if name.strip()
    ]

    if not medication_names:
        raise HTTPException(
            status_code=422,
            detail="Provide at least one medication name."
        )

    return check_medication_interactions(medication_names)






@app.get("/fitness-summary")
def fitness_summary():
    return get_fitness_summary()


@app.get("/health-goals")
def health_goals():
    return get_health_goals()


@app.post("/health-goals")
def create_health_goal(request: HealthGoalRequest):
    goal_type = request.goal_type.strip()
    unit = request.unit.strip()

    if not goal_type or not unit:
        raise HTTPException(
            status_code=422,
            detail="Goal type and unit cannot be empty."
        )

    goal_id = add_health_goal(
        goal_type=goal_type,
        target_value=request.target_value,
        unit=unit,
    )

    return {
        "message": "Health goal created successfully.",
        "id": goal_id,
    }

@app.get("/health-goals/progress")
def health_goal_progress():
    return get_health_goal_progress()




@app.post("/health-data/import")
async def import_health_data(file: UploadFile = File(...)):
    filename = (file.filename or "").lower()
    content = await file.read()

    if len(content) > 2 * 1024 * 1024:
        raise HTTPException(
            status_code=413,
            detail="File must be smaller than 2 MB."
        )

    try:
        if filename.endswith(".json"):
            data = json.loads(content.decode("utf-8"))

        elif filename.endswith(".csv"):
            text_data = content.decode("utf-8-sig")
            data = list(csv.DictReader(io.StringIO(text_data)))

        elif filename.endswith(".xml"):
            root = ET.fromstring(content)
            data = [
                {child.tag: child.text for child in item}
                for item in root
            ]

        else:
            raise HTTPException(
                status_code=400,
                detail="Only JSON, CSV, and XML files are supported."
            )

    except (json.JSONDecodeError, UnicodeDecodeError, ET.ParseError, csv.Error):
        raise HTTPException(
            status_code=400,
            detail="Invalid or unreadable health data file."
        )

    # Normalize supported records into a list.
    if isinstance(data, dict):
        records = data.get("records", data.get("health_data", data))
        if isinstance(records, dict):
            records = [records]
    elif isinstance(data, list):
        records = data
    else:
        raise HTTPException(
            status_code=400,
            detail="File must contain health metric records."
        )

    if not isinstance(records, list):
        raise HTTPException(
            status_code=400,
            detail="Invalid health record structure."
        )

    imported = 0
    skipped = 0

    for record in records:
        if not isinstance(record, dict):
            skipped += 1
            continue

        metric_type = (
            record.get("metric_type")
            or record.get("type")
            or record.get("name")
        )
        value = record.get("value")
        unit = record.get("unit") or ""

        if metric_type is None or value is None:
            skipped += 1
            continue

        metric_type = str(metric_type).strip()
        unit = str(unit).strip()

        if not metric_type or len(metric_type) > 100 or len(unit) > 30:
            skipped += 1
            continue

        try:
            numeric_value = float(value)
            if not __import__("math").isfinite(numeric_value):
                skipped += 1
                continue
        except (ValueError, TypeError):
            skipped += 1
            continue

        add_metric(metric_type, numeric_value, unit)
        imported += 1

    return {
        "message": "Health data import completed.",
        "filename": filename,
        "format": filename.rsplit(".", 1)[-1],
        "imported_records": imported,
        "skipped_records": skipped,
    }


@app.get("/health-report")
def health_report():
    return generate_health_report()