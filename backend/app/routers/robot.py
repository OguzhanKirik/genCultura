"""
Robot mission endpoints — proxy between the frontend and the ROS2 bridge.

POST /robot/mission        start a robot mission for an observation
GET  /robot/mission/{id}   poll mission status
GET  /robot/zones          list known zones from the bridge
"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from app.dependencies import get_current_user
from app.models.user import User
from app.config import get_settings
import app.services.robot_service as robot_svc

settings = get_settings()
router = APIRouter()


def _require_bridge():
    if not settings.robot_bridge_url:
        raise HTTPException(503, "Robot bridge not configured (ROBOT_BRIDGE_URL is empty)")


class MissionRequest(BaseModel):
    observation_id: str
    zone_id: str


@router.post("/mission", status_code=201)
async def start_mission(
    req: MissionRequest,
    current_user: User = Depends(get_current_user),
):
    _require_bridge()
    try:
        result = await robot_svc.send_mission(
            observation_id=req.observation_id,
            zone_id=req.zone_id,
            token="",  # bridge uses its own --token flag; no need to proxy JWT
        )
        return result
    except Exception as e:
        raise HTTPException(502, f"Bridge error: {e}")


@router.get("/mission/{mission_id}")
async def get_mission(
    mission_id: str,
    current_user: User = Depends(get_current_user),
):
    _require_bridge()
    try:
        return await robot_svc.get_mission_status(mission_id)
    except Exception as e:
        raise HTTPException(502, f"Bridge error: {e}")


@router.get("/zones")
async def get_zones(current_user: User = Depends(get_current_user)):
    _require_bridge()
    try:
        return {"zones": await robot_svc.list_zones()}
    except Exception as e:
        raise HTTPException(502, f"Bridge error: {e}")
