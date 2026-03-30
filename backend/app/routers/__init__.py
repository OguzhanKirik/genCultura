from fastapi import APIRouter
from .auth import router as auth_router
from .observations import router as observations_router
from .search import router as search_router
from .users import router as users_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(observations_router, prefix="/observations", tags=["observations"])
api_router.include_router(search_router, prefix="/search", tags=["search"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
