# CareerPilot AI — Autonomous AI Job Application Agent Platform

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3+-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4+-3178C6.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4+-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![LangGraph](https://img.shields.io/badge/LangGraph-Agent_Orchestrator-blue.svg)](https://langchain-ai.github.io/langgraph/)
[![Ollama](https://img.shields.io/badge/Ollama-Qwen3_Inference-black.svg?logo=ollama&logoColor=white)](https://ollama.com)

**CareerPilot AI** is an enterprise-grade personal AI career assistant that manages the full job application lifecycle. It automates resume parsing, maintains a verified master professional profile, continuously discovers regional and remote tech vacancies, calculates transparent multidimensional compatibility scores, crafts ATS-optimized tailored CVs and cover letters, drafts application emails with direct mail links, schedules mock interviews with STAR evaluation, and manages applications through a real-time Kanban pipeline.

---

## Architecture Overview

```
careerpilot-ai/
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/  # Auth, CV, Profile, Jobs, Matching, Documents, Applications, Interviews, AI, Settings
│   │   ├── core/              # Config, Database (Postgres/SQLite), Security (JWT/bcrypt), Dependencies
│   │   ├── models/            # SQLAlchemy UUID entities (User, CV, Profile, Job, Match, Application, Document, etc.)
│   │   ├── schemas/           # Pydantic v2 schemas for request validation & structured JSON outputs
│   │   ├── services/          # CV parser, ATS Document generator (PDF/DOCX), AI service, Matching, Interview prep
│   │   ├── agents/            # LangGraph StateGraph orchestrator coordinating specialized sub-agents
│   │   ├── tasks/             # APScheduler & Celery background jobs for recurring discovery
│   │   ├── utils/             # Input sanitizers, prompt-injection defense, storage interface
│   │   └── main.py            # FastAPI entrypoint, lifespan startup/shutdown, CORS, seeders
│   ├── tests/                 # Automated unit & integration tests (pytest & pytest-asyncio)
│   ├── Dockerfile             # Multi-stage production container
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── layouts/           # Enterprise dashboard layout with dark/light mode & responsive sidebar
│   │   ├── pages/             # Overview, My CV, Profile, Find Jobs, Job Matches, Applications, Documents, Interview Prep, AI Assistant, Settings
│   │   ├── services/api.ts    # Centralized typed HTTP client with JWT handling
│   │   ├── contexts/          # AuthContext with token refresh and protection
│   │   └── types/             # TypeScript interfaces mirroring backend schemas
│   ├── Dockerfile             # Multi-stage Vite build + Nginx reverse proxy
│   └── package.json
└── docker-compose.yml         # Multi-service setup (PostgreSQL, Redis, Backend, Frontend)
```

---

## Key Features & Agents

1. **CV Analyzer Agent**:
   - Parses real PDF and DOCX uploads using `pypdf` and `python-docx`.
   - Extracts contact info, dates, employment history, education, skills, and projects without fabricating missing details.
   - Preserves original files while building an editable master profile.

2. **Professional Profile Agent**:
   - Maintains a central source of truth for all career documents.
   - Includes full human confirmation lock (`is_confirmed`) before documents are drafted.

3. **Job Discovery Agent**:
   - Real-time search prioritizing **Rwanda**, **Kigali**, **East Africa**, and **Global Remote** vacancies.
   - Authorized feeds from RemoteOK API, curated regional listings, manual entry, and URL scraper.
   - Deduplication using SHA-256 company-title hashing and verification timestamps.

4. **Transparent Weighted Matching Engine**:
   - Multi-factor evaluation: Skills (40%), Experience (25%), Education (15%), Location (10%), Responsibilities (10%).
   - Generates matching requirements, partial requirements, missing qualifications, and concrete recommendations.

5. **CV Tailoring & Document Generation**:
   - Compiles ATS-compliant resumes in both **DOCX** (via `python-docx`) and **PDF** (via `reportlab`).
   - Generates customized cover letters tailored to target job requirements.
   - Drafts application emails with verified recipient fields, direct `mailto:` links, and Gmail Web draft URLs.

6. **Interview Preparation & Mock Simulator**:
   - Generates Technical, Behavioral (STAR method), Leadership, Situational, and HR questions.
   - Interactive practice mode: type answers and receive instant AI scores (0–100) with actionable critique.

7. **Application Tracker**:
   - Dual-view tracker: Interactive drag/click **Kanban Board** and searchable **Table View**.
   - Full lifecycle statuses: *Saved, Analyzing, Ready to Apply, Applied, Assessment, Interview, Offer, Rejected, Withdrawn*.

8. **Conversational AI Assistant**:
   - Direct conversational interface connected to backend agent tools for skill audits, vacancy discovery, and interview roleplay.
   - Integrated Ollama health monitor with fallback execution engine.

---

## 🚀 How to Run the Application (Step-by-Step)

You can run CareerPilot AI using either **Fast Local Setup** (recommended for local development with zero external dependencies) or **Docker Compose** (full stack with PostgreSQL and Redis).

---

### Option 1: Fast Local Setup (Recommended)

#### Step 1: Set Up Backend Environment & Dependencies
Open a terminal in the project root:
```bash
# 1. Activate the Python virtual environment
source venv/bin/activate

# 2. (If setting up fresh) install dependencies
pip install -r backend/requirements.txt
```

#### Step 2: Start the FastAPI Backend Server
```bash
# Set PYTHONPATH so the backend app module is discoverable
export PYTHONPATH=backend

# Start Uvicorn server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
- **Backend API URL**: `http://localhost:8000`
- **Interactive OpenAPI Documentation (Swagger)**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **API Health Check**: `http://localhost:8000/health`

*(Note: SQLite database `careerpilot.db` and initial verified vacancies in Rwanda and Remote are automatically initialized on startup).*

#### Step 3: Start the Frontend Client
Open a **second terminal window** in the project root:
```bash
cd frontend

# Install node dependencies (if not already installed)
npm install

# Start Vite development server
npm run dev
```
- **Frontend Web Dashboard**: Open [http://localhost:5173](http://localhost:5173) in your browser.

#### Step 4: (Optional) Enable Local AI Inference with Ollama
CareerPilot AI runs with a built-in adaptive engine by default so all features work immediately out of the box. To run local LLM inference with Qwen3:
```bash
# Open a third terminal window:
ollama serve

# In another terminal tab:
ollama run qwen3
```
CareerPilot will automatically detect the running Ollama model and show the **Ready (Online)** green badge in the dashboard sidebar.

---

### Option 2: One-Command Docker Compose

To start the entire production-grade stack including **PostgreSQL 16**, **Redis 7**, **FastAPI Backend**, and **Nginx Frontend**:

```bash
# In the project root:
docker-compose up --build
```

- **Frontend Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API & Swagger Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **PostgreSQL Database**: `localhost:5432` (User: `careerpilot`, Pass: `careerpilot_secure_password`, DB: `careerpilot`)
- **Redis Cache**: `localhost:6379`

To stop the containers:
```bash
docker-compose down
```

---

### 📋 First Steps: End-to-End User Walkthrough

1. **Sign In**: Navigate to [http://localhost:5173](http://localhost:5173). Register an account or click **"Fill with Demo Rwanda Tech Candidate"** to populate prefilled credentials.
2. **Upload CV**: Click **My CV** in the sidebar and upload a PDF or DOCX resume. The CV Analyzer Agent will automatically parse your contacts, employment dates, skills, and projects.
3. **Confirm Master Profile**: Go to **Professional Profile**, review extracted details, and click **"Confirm Master Profile"** to lock your verified profile as the source of truth.
4. **Discover Jobs**: Go to **Find Jobs** to view verified opportunities across Kigali, East Africa, and Remote tech hubs. You can also import any live job link via **"Import from URL"** or click **"Discover Feeds"**.
5. **View Compatibility Matches**: Go to **Job Matches** to inspect multidimensional scores (Skills, Experience, Education, Location) and missing requirement analyses.
6. **Generate Tailored Documents**: In **Job Matches** or **Documents**, click **"Generate Tailored CV"** or **"Draft Cover Letter"**. Both **DOCX** and **PDF** formats are created and immediately downloadable.
7. **Draft Application Email**: Generate a customized application email and click **"Send via Mail"** or **"Gmail Web"** to prepare your submission with human review.
8. **Track Applications**: Go to **Applications** to manage your submissions in either the drag-and-drop **Kanban Board** or the **Table View**.
9. **Prepare for Interviews**: In **Interview Prep**, select a vacancy to generate Technical, Behavioral (STAR), and Leadership questions. Use **Mock Interview Mode** to type your responses and receive instant AI feedback and scoring!
10. **Chat with AI Assistant**: Go to **AI Assistant** to ask real-time questions, run skill gap analyses, or practice interview scenarios.

## 🤖 AI Model & Inference Engine (Local & Cloud)

CareerPilot AI powers all career advice, CV analysis, document tailoring, and mock interview scoring dynamically through its AI model adapter. **No hardcoded or canned mock responses are used.**

### Supported AI Providers
1. **Ollama (Default Local Inference - Qwen3)**:
   - Zero cloud costs, runs completely on your machine.
   - Install Ollama (`ollama serve`) and pull the model:
     ```bash
     ollama run qwen3
     ```
2. **Google Gemini (Cloud Adapter)**:
   - High speed and generous free tier.
   - Set in **Platform Settings** in the dashboard, or set `GEMINI_API_KEY` and `GEMINI_MODEL=gemini-2.0-flash` in `.env`.
3. **OpenAI (GPT-4o)**:
   - Set `OPENAI_API_KEY` and `OPENAI_MODEL=gpt-4o` in Settings or `.env`.
4. **Groq (Ultra-Fast Cloud Inference)**:
   - Sub-second Llama 3.3 and Qwen 2.5 inference.
   - Set `GROQ_API_KEY` and `GROQ_MODEL=llama-3.3-70b-versatile` in Settings or `.env`.

If an AI provider is unreachable, CareerPilot provides clear, honest diagnostic notices and terminal instructions in both the UI and API, guiding you on how to start the model.

---

## Docker & Docker Compose Deployment

To run the complete production stack (PostgreSQL, Redis, Backend, Frontend with Nginx):

```bash
docker-compose up --build
```

- **Frontend Application**: `http://localhost:3000`
- **Backend API & Docs**: `http://localhost:8000/api/v1/docs`
- **PostgreSQL Database**: `localhost:5432`
- **Redis Cache**: `localhost:6379`

---

## Testing

Execute the test suite covering CV parsing, weighted matching, document generation, agent workflows, and API authentication:

```bash
source venv/bin/activate
PYTHONPATH=backend pytest backend/tests/ -v
```

All 6 test suites execute in < 2 seconds using in-memory SQLite isolation.

---

## Final Acceptance Verification Checklist

- [x] **Registration & Authentication**: JWT token authentication with bcrypt password hashing and user data isolation.
- [x] **CV Upload & Parsing**: Accepts PDF and DOCX, extracts text and structure without inventing data.
- [x] **Master Profile Editing**: Full user control over summary, skills, experience, education, and human confirmation lock.
- [x] **Job Discovery**: Curated verified opportunities prioritizing Rwanda, Kigali, East Africa, and Remote, with public API integration.
- [x] **Transparent Job Matching**: Multi-factor weighted scoring model with actionable suggestions and missing requirements analysis.
- [x] **ATS Document Generation**: Produces real, downloadable `.pdf` and `.docx` customized resumes and cover letters.
- [x] **Application Email Generation**: Formats subject, body, recipient, and one-click mailto / Gmail Web draft links.
- [x] **Application Tracking**: Kanban and Table views with full status lifecycle, follow-up dates, and activity logging.
- [x] **Interview Preparation & Mock Simulator**: Technical, behavioral, and leadership question generator with interactive AI mock scoring.
- [x] **Conversational AI Assistant**: Real-time agent chat connected to live backend tools.
- [x] **Ollama & Qwen3 Integration**: Health check monitoring, setup guidance, and adaptive fallback.
- [x] **Scheduled Discovery**: Background scheduler running periodic discovery and match digest creation.
- [x] **Docker Infrastructure**: Multi-stage Dockerfiles and docker-compose orchestration.

