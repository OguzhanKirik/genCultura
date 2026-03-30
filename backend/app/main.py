from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.config import get_settings
from app.routers import api_router

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Ensure media directory exists at startup
    Path(settings.media_dir).mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(
    title="GenCultura API",
    description="Greenhouse operational knowledge capture and retrieval",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded media files
media_dir = Path(settings.media_dir)
media_dir.mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=str(media_dir)), name="media")

app.include_router(api_router)
