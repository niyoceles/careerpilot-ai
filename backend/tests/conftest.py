import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.database import Base, get_db
from app.main import app
from app.models.entities import User, Job, JobSource, ProfessionalProfile, Skill, WorkExperience
from app.core.security import get_password_hash, create_access_token

# In-memory SQLite for high-speed isolated tests
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    session = TestingSessionLocal()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session):
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()

@pytest.fixture
def test_user(db_session):
    user = User(
        email="testcandidate@example.com",
        hashed_password=get_password_hash("TestPassword123!"),
        full_name="Jean Luc Mugisha",
        is_active=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Add profile
    profile = ProfessionalProfile(
        user_id=user.id,
        full_name=user.full_name,
        email=user.email,
        phone="+250788123456",
        location="Kigali, Rwanda",
        summary="Experienced Full Stack Software Engineer with deep background in Python and React.",
        total_experience_years=4.0,
        preferred_locations=["Rwanda", "Remote"],
        preferred_job_titles=["Senior Software Engineer"],
        is_confirmed=True
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)

    # Add skills
    skills_data = [
        ("Python", "technical", "advanced", 4.0),
        ("FastAPI", "technical", "advanced", 3.0),
        ("React", "technical", "advanced", 3.0),
        ("PostgreSQL", "technical", "intermediate", 3.0),
        ("Docker", "technical", "intermediate", 2.0),
    ]
    for s_name, cat, prof, yrs in skills_data:
        db_session.add(Skill(profile_id=profile.id, name=s_name, category=cat, proficiency=prof, years_of_experience=yrs))

    # Add experience
    db_session.add(WorkExperience(
        profile_id=profile.id,
        company="Kigali Tech Labs",
        position="Full Stack Engineer",
        location="Kigali, Rwanda",
        start_date="2021",
        end_date="Present",
        is_current=True,
        description="Developed cloud applications and high-throughput microservices.",
        achievements=["Engineered RESTful APIs serving 200,000+ monthly requests."]
    ))
    db_session.commit()

    return user

@pytest.fixture
def auth_headers(test_user):
    token = create_access_token(subject=test_user.id)
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def sample_job(db_session):
    source = JobSource(name="Test Source", source_type="api", is_active=True)
    db_session.add(source)
    db_session.commit()

    job = Job(
        source_id=source.id,
        title="Full Stack Software Engineer",
        company="Rwanda Tech Innovations",
        location="Kigali, Rwanda",
        location_type="hybrid",
        description="We are seeking a Full Stack Software Engineer with 3+ years experience in Python, FastAPI, and React.",
        requirements=["3+ years software development", "Proficiency in Python and React", "Experience with PostgreSQL"],
        responsibilities=["Build user interfaces", "Maintain backend APIs"],
        required_skills=["Python", "FastAPI", "React", "PostgreSQL"],
        salary_min=40000,
        salary_max=60000,
        verification_status="verified"
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job

