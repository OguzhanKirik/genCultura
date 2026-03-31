"""
GenCultura ROS2 Bridge
======================
Runs on the Linux robot laptop. Exposes a FastAPI HTTP server that:
  1. Receives mission commands from the GenCultura backend
  2. Sends NavigateToPose goals to Nav2
  3. At the destination, runs a VLM-guided capture loop
  4. POSTs captured images back to the GenCultura backend

Run with:
    python bridge_node.py \
        --backend-url http://192.168.1.2:8000 \
        --vlm-url https://xxxx.ngrok-free.app/v1 \
        --token <admin_jwt_token>
"""

import argparse
import asyncio
import base64
import io
import math
import threading
import time
import uuid
from enum import Enum
from pathlib import Path
from typing import Optional

import cv2
import httpx
import numpy as np
import rclpy
import yaml
from fastapi import FastAPI, HTTPException
from geometry_msgs.msg import PoseStamped, Twist
from nav2_msgs.action import NavigateToPose
from openai import OpenAI
from pydantic import BaseModel
from rclpy.action import ActionClient
from rclpy.executors import MultiThreadedExecutor
from rclpy.node import Node
from sensor_msgs.msg import Image
from cv_bridge import CvBridge
import uvicorn


# ── Config ────────────────────────────────────────────────────────────────────

ZONES_FILE = Path(__file__).parent / "zones.yaml"

parser = argparse.ArgumentParser()
parser.add_argument("--backend-url",  default="http://localhost:8000",   help="GenCultura backend URL")
parser.add_argument("--vlm-url",      default="http://localhost:8000/v1", help="vLLM OpenAI-compatible base URL")
parser.add_argument("--vlm-model",    default="Qwen/Qwen2.5-VL-7B-Instruct")
parser.add_argument("--token",        required=True,                      help="GenCultura JWT token for uploading images")
parser.add_argument("--port",         type=int, default=8001,             help="Bridge HTTP port")
parser.add_argument("--capture-attempts", type=int, default=5,           help="Max VLM-guided capture attempts")
args, _ = parser.parse_known_args()

with open(ZONES_FILE) as f:
    ZONES: dict = yaml.safe_load(f)["zones"]


# ── Mission state ─────────────────────────────────────────────────────────────

class MissionStatus(str, Enum):
    PENDING    = "pending"
    NAVIGATING = "navigating"
    AT_LOCATION = "at_location"
    CAPTURING  = "capturing"
    UPLOADING  = "uploading"
    DONE       = "done"
    FAILED     = "failed"

missions: dict[str, dict] = {}  # mission_id → {status, observation_id, zone_id, message, images}


# ── ROS2 Node ─────────────────────────────────────────────────────────────────

class BridgeNode(Node):
    def __init__(self):
        super().__init__("gencultura_bridge")
        self._nav_client  = ActionClient(self, NavigateToPose, "navigate_to_pose")
        self._cmd_vel_pub = self.create_publisher(Twist, "cmd_vel", 10)
        self._bridge      = CvBridge()
        self._latest_image: Optional[np.ndarray] = None
        self._image_lock  = threading.Lock()

        self.create_subscription(Image, "/camera/image_raw", self._image_cb, 10)
        self.get_logger().info("GenCultura bridge node ready")

    def _image_cb(self, msg: Image):
        try:
            cv_img = self._bridge.imgmsg_to_cv2(msg, desired_encoding="bgr8")
            with self._image_lock:
                self._latest_image = cv_img.copy()
        except Exception as e:
            self.get_logger().warn(f"Image conversion failed: {e}")

    def capture_jpeg(self) -> Optional[bytes]:
        with self._image_lock:
            if self._latest_image is None:
                return None
            img = self._latest_image.copy()
        _, buf = cv2.imencode(".jpg", img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return buf.tobytes()

    def rotate_in_place(self, angle_rad: float, speed: float = 0.3):
        """Rotate robot by angle_rad (positive = left)."""
        twist = Twist()
        twist.angular.z = speed if angle_rad > 0 else -speed
        duration = abs(angle_rad) / speed
        end = time.time() + duration
        rate = self.create_rate(20)
        while time.time() < end:
            self._cmd_vel_pub.publish(twist)
            rate.sleep()
        self._cmd_vel_pub.publish(Twist())  # stop

    async def navigate_to_zone(self, zone_id: str) -> bool:
        """Send NavigateToPose goal and wait for result. Returns True on success."""
        zone = ZONES.get(zone_id)
        if zone is None:
            self.get_logger().error(f"Unknown zone: {zone_id}")
            return False

        if not self._nav_client.wait_for_server(timeout_sec=10.0):
            self.get_logger().error("Nav2 action server not available")
            return False

        goal = NavigateToPose.Goal()
        goal.pose = PoseStamped()
        goal.pose.header.frame_id = "map"
        goal.pose.header.stamp = self.get_clock().now().to_msg()
        goal.pose.pose.position.x = float(zone["x"])
        goal.pose.pose.position.y = float(zone["y"])

        yaw = float(zone.get("yaw", 0.0))
        goal.pose.pose.orientation.z = math.sin(yaw / 2)
        goal.pose.pose.orientation.w = math.cos(yaw / 2)

        self.get_logger().info(f"Navigating to {zone_id} ({zone['x']}, {zone['y']})")

        future = self._nav_client.send_goal_async(goal)
        loop = asyncio.get_event_loop()
        goal_handle = await loop.run_in_executor(None, lambda: rclpy.spin_until_future_complete(self, future) or future.result())

        if not goal_handle.accepted:
            self.get_logger().error("Navigation goal rejected")
            return False

        result_future = goal_handle.get_result_async()
        result = await loop.run_in_executor(None, lambda: rclpy.spin_until_future_complete(self, result_future) or result_future.result())

        return result is not None


# ── VLM helpers ───────────────────────────────────────────────────────────────

vlm_client = OpenAI(base_url=args.vlm_url, api_key="no-key")


def ask_vlm_plant_visible(jpeg_bytes: bytes) -> dict:
    """Ask VLM if a plant is clearly visible. Returns {visible: bool, suggestion: str}."""
    b64 = base64.b64encode(jpeg_bytes).decode()
    try:
        resp = vlm_client.chat.completions.create(
            model=args.vlm_model,
            messages=[{
                "role": "user",
                "content": [
                    {
                        "type": "text",
                        "text": (
                            "Look at this image from a greenhouse robot camera. "
                            "Is there a plant clearly visible and reasonably centered? "
                            "Reply with JSON only: "
                            "{\"visible\": true/false, \"suggestion\": \"none|rotate_left|rotate_right|move_closer\"}"
                        ),
                    },
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/jpeg;base64,{b64}"},
                    },
                ],
            }],
            max_tokens=60,
            temperature=0.1,
        )
        import json, re
        text = resp.choices[0].message.content or ""
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if match:
            return json.loads(match.group(0))
    except Exception:
        pass
    return {"visible": True, "suggestion": "none"}  # fail open


# ── Mission runner ────────────────────────────────────────────────────────────

async def run_mission(mission_id: str, node: BridgeNode):
    m = missions[mission_id]
    obs_id   = m["observation_id"]
    zone_id  = m["zone_id"]

    try:
        # 1. Navigate
        missions[mission_id]["status"] = MissionStatus.NAVIGATING
        missions[mission_id]["message"] = f"Navigating to {zone_id}..."
        success = await node.navigate_to_zone(zone_id)

        if not success:
            raise RuntimeError(f"Navigation to {zone_id} failed")

        # 2. VLM-guided capture loop
        missions[mission_id]["status"] = MissionStatus.AT_LOCATION
        missions[mission_id]["message"] = "Arrived — scanning for plant..."

        await asyncio.sleep(1.5)  # let robot settle

        captured_images: list[bytes] = []
        adjustments = {
            "rotate_left":  ( 0.3, node.rotate_in_place),
            "rotate_right": (-0.3, node.rotate_in_place),
        }

        for attempt in range(args.capture_attempts):
            missions[mission_id]["status"] = MissionStatus.CAPTURING
            missions[mission_id]["message"] = f"Capture attempt {attempt + 1}/{args.capture_attempts}"

            jpeg = node.capture_jpeg()
            if jpeg is None:
                await asyncio.sleep(0.5)
                continue

            result = ask_vlm_plant_visible(jpeg)

            if result.get("visible"):
                captured_images.append(jpeg)
                if len(captured_images) >= 3:
                    break
                await asyncio.sleep(0.5)
            else:
                suggestion = result.get("suggestion", "none")
                if suggestion in adjustments:
                    angle, fn = adjustments[suggestion]
                    await asyncio.get_event_loop().run_in_executor(None, fn, angle)
                    await asyncio.sleep(0.5)

        if not captured_images:
            raise RuntimeError("No plant visible after all capture attempts")

        # 3. Upload images to GenCultura
        missions[mission_id]["status"] = MissionStatus.UPLOADING
        missions[mission_id]["message"] = f"Uploading {len(captured_images)} image(s)..."

        async with httpx.AsyncClient(timeout=30) as client:
            for i, jpeg in enumerate(captured_images):
                await client.post(
                    f"{args.backend_url}/api/v1/observations/{obs_id}/media",
                    headers={"Authorization": f"Bearer {args.token}"},
                    files={"file": (f"robot_{i+1}.jpg", jpeg, "image/jpeg")},
                    data={"media_type": "image"},
                )

            # Trigger VLM re-analysis
            await client.post(
                f"{args.backend_url}/api/v1/observations/{obs_id}/enrich",
                headers={"Authorization": f"Bearer {args.token}"},
            )

        missions[mission_id]["status"]  = MissionStatus.DONE
        missions[mission_id]["message"] = f"Done — {len(captured_images)} image(s) captured and analysed."
        missions[mission_id]["image_count"] = len(captured_images)

    except Exception as e:
        missions[mission_id]["status"]  = MissionStatus.FAILED
        missions[mission_id]["message"] = str(e)


# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="GenCultura ROS2 Bridge")
bridge_node: Optional[BridgeNode] = None


class MissionRequest(BaseModel):
    observation_id: str
    zone_id: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/zones")
def list_zones():
    return {"zones": list(ZONES.keys())}


@app.post("/mission", status_code=201)
async def start_mission(req: MissionRequest):
    if req.zone_id not in ZONES:
        raise HTTPException(400, f"Unknown zone '{req.zone_id}'. Known zones: {list(ZONES.keys())}")

    mission_id = str(uuid.uuid4())
    missions[mission_id] = {
        "id":             mission_id,
        "observation_id": req.observation_id,
        "zone_id":        req.zone_id,
        "status":         MissionStatus.PENDING,
        "message":        "Mission queued",
        "image_count":    0,
    }

    asyncio.create_task(run_mission(mission_id, bridge_node))
    return {"mission_id": mission_id}


@app.get("/mission/{mission_id}")
def get_mission(mission_id: str):
    if mission_id not in missions:
        raise HTTPException(404, "Mission not found")
    return missions[mission_id]


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    global bridge_node

    rclpy.init()
    bridge_node = BridgeNode()

    executor = MultiThreadedExecutor()
    executor.add_node(bridge_node)
    ros_thread = threading.Thread(target=executor.spin, daemon=True)
    ros_thread.start()

    print(f"ROS2 bridge running on http://0.0.0.0:{args.port}")
    print(f"Backend: {args.backend_url}")
    print(f"VLM:     {args.vlm_url}")
    print(f"Zones:   {list(ZONES.keys())}")

    uvicorn.run(app, host="0.0.0.0", port=args.port)


if __name__ == "__main__":
    main()
