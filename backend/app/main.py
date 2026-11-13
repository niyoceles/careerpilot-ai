import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse

from app.core.config import settings
from app.core.database import Base, engine, SessionLocal
from app.models import *  # Ensure all models are registered
from app.api.v1.router import api_router
from app.services.job_service import JobService
from app.tasks.scheduled_jobs import start_scheduler, stop_scheduler

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not exist
    Base.metadata.create_all(bind=engine)
    
    # Seed initial verified jobs
    db = SessionLocal()
    try:
        JobService.seed_initial_jobs(db)
    except Exception as e:
        print(f"Notice: Initial job seeding skipped: {e}")
    finally:
        db.close()

    # Start recurring discovery scheduler
    try:
        start_scheduler()
    except Exception as e:
        print(f"Notice: Scheduler skipped: {e}")

    yield

    # Shutdown
    try:
        stop_scheduler()
    except Exception:
        pass

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="CareerPilot AI — A Production-Oriented AI Job Application Agent Platform",
    version="1.0.0",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# CORS configuration for local dev and frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount generated and uploads folders for downloads if present
if os.path.exists(settings.STORAGE_DIR):
    app.mount("/storage", StaticFiles(directory=settings.STORAGE_DIR), name="storage")

# Include v1 Router
app.include_router(api_router, prefix=settings.API_V1_STR)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": settings.DATABASE_URL.split("://")[0],
        "ai_provider": settings.AI_PROVIDER
    }

@app.get("/")
def root():
    return {
        "message": "Welcome to CareerPilot AI API",
        "documentation": f"{settings.API_V1_STR}/docs",
        "health": "/health"
    }

