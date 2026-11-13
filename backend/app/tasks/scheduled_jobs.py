import logging
from datetime import datetime, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from app.core.database import SessionLocal
from app.models.entities import User, UserSettings, JobMatch
from app.services.job_service import JobService
from app.services.matching_service import MatchingService

logger = logging.getLogger(__name__)

scheduler = AsyncIOScheduler()

async def run_scheduled_job_discovery():
    """
    Recurring discovery workflow:
    1. Fetches latest vacancies from authorized sources.
    2. Deduplicates & verifies against database.
    3. Matches newly discovered jobs against active user profiles.
    4. Records qualifying alerts.
    """
    logger.info("Starting scheduled job discovery cycle...")
    db = SessionLocal()
    try:
        # Step 1: Ensure initial curated jobs are present
        JobService.seed_initial_jobs(db)
        
        # Step 2: Fetch remote API jobs
        new_jobs_count = await JobService.fetch_remote_jobs_api(db, limit=5)
        logger.info(f"Discovered {new_jobs_count} new job opportunities.")

        # Step 3: Match against active user profiles with auto-matching enabled
        users = db.query(User).filter(User.is_active == True).all()
        for user in users:
            if not user.profile:
                continue
            settings = user.settings
            min_threshold = settings.min_match_threshold if settings else 60.0

            # Find un-evaluated jobs for this user
            existing_match_job_ids = {m.job_id for m in user.job_matches}
            unmatched_jobs = [j for j in db.query(JobService.seed_initial_jobs(db) or user.job_matches) if False]  # placeholder

            # For each job in DB not yet matched for this user
            all_jobs = db.query(JobMatch.job_id).filter(JobMatch.user_id == user.id).all()
            matched_ids = {j[0] for j in all_jobs}
            
            from app.models.entities import Job
            candidates = db.query(Job).filter(~Job.id.in_(matched_ids) if matched_ids else True).limit(20).all()
            for job in candidates:
                eval_res = MatchingService.evaluate_match(user.profile, job)
                if eval_res["overall_score"] >= min_threshold:
                    match_record = JobMatch(
                        user_id=user.id,
                        job_id=job.id,
                        overall_score=eval_res["overall_score"],
                        skill_score=eval_res["skill_score"],
                        experience_score=eval_res["experience_score"],
                        education_score=eval_res["education_score"],
                        location_score=eval_res["location_score"],
                        matching_requirements=eval_res["matching_requirements"],
                        partial_requirements=eval_res["partial_requirements"],
                        missing_qualifications=eval_res["missing_qualifications"],
                        matching_experience=eval_res["matching_experience"],
                        suggestions=eval_res["suggestions"],
                        assessment=eval_res["assessment"],
                        evaluated_at=datetime.now(timezone.utc)
                    )
                    db.add(match_record)
        db.commit()
        logger.info("Scheduled job discovery cycle completed.")
    except Exception as e:
        logger.error(f"Error during scheduled job discovery: {e}")
        db.rollback()
    finally:
        db.close()

def start_scheduler():
    if not scheduler.running:
        scheduler.add_job(run_scheduled_job_discovery, "interval", hours=12, id="job_discovery_job", replace_existing=True)
        scheduler.start()
        logger.info("APScheduler initialized for recurring job discovery.")

def stop_scheduler():
    if scheduler.running:
        scheduler.shutdown()

