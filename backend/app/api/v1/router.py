from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    cv,
    profile,
    jobs,
    matching,
    documents,
    applications,
    interviews,
    ai,
    settings,
    dashboard,
)

api_router = APIRouter()

api_router.include_router(auth.router)
api_router.include_router(cv.router)
api_router.include_router(profile.router)
api_router.include_router(jobs.router)
api_router.include_router(matching.router)
api_router.include_router(documents.router)
api_router.include_router(applications.router)
api_router.include_router(interviews.router)
api_router.include_router(ai.router)
api_router.include_router(settings.router)
api_router.include_router(dashboard.router)

