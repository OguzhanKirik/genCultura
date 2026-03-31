# GenCultura

Greenhouse operational knowledge capture — field workers log observations (text, voice, photo, video) from their phones, and a Vision Language Model provides AI-powered agronomic diagnosis.

## Stack

| Layer | Tech |
|-------|------|
| Backend | FastAPI + SQLAlchemy + PostgreSQL (pgvector) |
| Frontend | Next.js 14 + Tailwind CSS (PWA) |
| Database | PostgreSQL 16 with pgvector extension |
| AI / VLM | Qwen2.5-VL-7B-Instruct via vLLM on Google Colab |
| Tunnel | ngrok (exposes Colab model to local backend) |

---

## Waking Up the Full Setup

Every time you want to use the app, run these steps in order.

### Step 1 — Start the database

```bash
cd /Users/oguz/Desktop/workspace_py/genCultura
docker compose up db -d
```

### Step 2 — Start the backend

Open a terminal and keep it running:

```bash
cd /Users/oguz/Desktop/workspace_py/genCultura/backend
uvicorn app.main:app --host 0.0.0.0 --reload
```

### Step 3 — Start the frontend

Open a second terminal and keep it running:

```bash
cd /Users/oguz/Desktop/workspace_py/genCultura/frontend
npm run dev
```

### Step 4 — Start the VLM on Google Colab

1. Open `colab/gencultura_vlm.ipynb` in Google Colab
2. Set runtime to **A100 GPU**: Runtime → Change runtime type → A100
3. Run cells in order:
   - **Cell 1** — Install dependencies (skip if already done this session)
   - **Cell 2** — Set config (NGROK_TOKEN, MODEL, PORT)
   - **Cell 3** — Verify GPU
   - **Cell 4** — Start vLLM server (~3 min to load model)
   - **Cell 5 (tunnel)** — Start ngrok tunnel, prints the URL
   - **Cell 7** — Keep-alive (leave running)

4. Copy the 3 lines printed by Cell 5 into `.env`:
   ```
   OPENAI_BASE_URL=https://xxxx.ngrok-free.app/v1
   OPENAI_API_KEY=no-key
   LLM_MODEL=Qwen/Qwen2.5-VL-7B-Instruct
   ```

5. Restart the backend (Ctrl+C in Step 2 terminal, then re-run uvicorn)

### Step 5 — Access the app

| Device | URL |
|--------|-----|
| Mac browser | http://localhost:3000 |
| Phone (same WiFi) | http://192.168.1.2:3000 |
| Phone with camera/mic | Use the ngrok HTTPS URL from Cell 5 |

Default login: `admin@gencultura.local` / `changeme`

---

## First-Time Setup Only

Run these once after cloning or on a fresh environment:

```bash
# Install backend dependencies
cd backend
pip install -e ".[dev]"

# Run database migrations
alembic upgrade head

# Create the admin user
python seed.py

# Install frontend dependencies
cd ../frontend
npm install
```

---

## Shutting Down

```bash
# Stop the database
docker compose down

# Stop backend and frontend with Ctrl+C in their terminals

# Stop Colab: stop Cell 7 (keep-alive), then Runtime → Disconnect
```

---

## Project Structure

```
genCultura/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── routers/          # API endpoints
│   │   ├── models/           # SQLAlchemy ORM models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # LLM, embeddings, storage
│   ├── alembic/              # Database migrations
│   └── seed.py               # Creates initial admin user
├── frontend/                 # Next.js PWA
│   ├── src/
│   │   ├── app/              # Pages (App Router)
│   │   ├── components/       # React components
│   │   └── lib/              # API clients, hooks, auth
│   └── public/               # PWA manifest, service worker
├── colab/
│   └── gencultura_vlm.ipynb  # Colab notebook for VLM
├── .env                      # Environment config (never commit)
└── docker-compose.yml        # Database service
```

---

## Key Notes

- **ngrok URL changes** every time you restart the Colab tunnel — update `OPENAI_BASE_URL` in `.env` and restart the backend each time
- **Camera and microphone** require HTTPS — use the ngrok tunnel URL on your phone for full capture features
- **Colab sessions** max out at ~24h on Pro — you'll need to re-run the notebook periodically
- **Mac local IP** is `192.168.1.2` — if your network changes, run `ipconfig getifaddr en0` to get the new IP and update `CORS_ORIGINS` in `.env`
