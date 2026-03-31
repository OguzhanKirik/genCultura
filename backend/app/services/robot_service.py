"""HTTP client for the ROS2 bridge running on the robot laptop."""
import httpx
from app.config import get_settings

settings = get_settings()


async def send_mission(observation_id: str, zone_id: str, token: str) -> dict:
    """POST /mission to the bridge. Returns {mission_id, ...}."""
    url = f"{settings.robot_bridge_url}/mission"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.post(
            url,
            json={"observation_id": observation_id, "zone_id": zone_id},
            headers={"Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()


async def get_mission_status(mission_id: str) -> dict:
    """GET /mission/{id} from the bridge."""
    url = f"{settings.robot_bridge_url}/mission/{mission_id}"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json()


async def list_zones() -> list[str]:
    """GET /zones from the bridge."""
    url = f"{settings.robot_bridge_url}/zones"
    async with httpx.AsyncClient(timeout=10) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        return resp.json().get("zones", [])
