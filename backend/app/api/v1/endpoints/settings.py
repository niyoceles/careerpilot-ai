from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.dependencies import get_current_user
from app.models.entities import User, UserSettings
from app.schemas.all_schemas import UserSettingsResponse, UserSettingsUpdate

router = APIRouter(prefix="/settings", tags=["User Settings"])

@router.get("", response_model=UserSettingsResponse)
def get_user_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings

@router.put("", response_model=UserSettingsResponse)
def update_user_settings(
    payload: UserSettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    settings = db.query(UserSettings).filter(UserSettings.user_id == current_user.id).first()
    if not settings:
        settings = UserSettings(user_id=current_user.id)
        db.add(settings)

    fields = [
        "preferred_locations", "job_categories", "remote_only",
        "min_experience_years", "min_match_threshold",
        "recurring_search_frequency", "notification_email", "auto_matching_enabled",
        "ai_provider", "ai_model", "ai_api_key"
    ]
    for field in fields:
        val = getattr(payload, field, None)
        if val is not None:
            setattr(settings, field, val)

    db.commit()
    db.refresh(settings)
    return settings

