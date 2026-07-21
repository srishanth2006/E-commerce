"""
routers/websocket.py
---------------------
WebSocket endpoint for real-time notifications.
Admin/staff can connect to receive live updates when new orders arrive.
"""
import json
import asyncio
from typing import Set

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["WebSocket"])

# Connected admin clients
connected_clients: Set[WebSocket] = set()

# Store the event loop reference at startup
_event_loop = None


def set_event_loop(loop):
    global _event_loop
    _event_loop = loop


async def broadcast(message: dict):
    """Send a message to all connected admin clients."""
    dead = set()
    for ws in connected_clients:
        try:
            await ws.send_json(message)
        except Exception:
            dead.add(ws)
    connected_clients -= dead


def broadcast_sync(message: dict):
    """Thread-safe broadcast call from sync route handlers."""
    global _event_loop
    loop = _event_loop
    if loop is None:
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = None
    if loop is None:
        return
    try:
        if loop.is_running():
            asyncio.run_coroutine_threadsafe(broadcast(message), loop)
        else:
            loop.create_task(broadcast(message))
    except RuntimeError:
        pass


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
