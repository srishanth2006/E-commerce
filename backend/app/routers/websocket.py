"""
routers/websocket.py
---------------------
WebSocket endpoint for real-time notifications.
Admin/staff can connect to receive live updates when new orders arrive.
"""
import json
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])

# Connected admin clients
connected_clients: Set[WebSocket] = set()


async def broadcast(message: dict):
    """Send a message to all connected admin clients."""
    dead = set()
    for ws in connected_clients:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    connected_clients -= dead


@router.websocket("/ws/notifications")
async def notification_ws(websocket: WebSocket):
    await websocket.accept()
    connected_clients.add(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Client can send pings
            if data == "ping":
                await websocket.send_json({"type": "pong"})
    except WebSocketDisconnect:
        connected_clients.discard(websocket)
    except Exception:
        connected_clients.discard(websocket)
