"""WebSocket support for live agent run status updates."""
from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, Set
import asyncio
import json


class ConnectionManager:
    """Manages active WebSocket connections, namespaced by customer_id."""

    def __init__(self):
        self._connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, customer_id: str):
        await websocket.accept()
        self._connections.setdefault(customer_id, set()).add(websocket)

    def disconnect(self, websocket: WebSocket, customer_id: str):
        if customer_id in self._connections:
            self._connections[customer_id].discard(websocket)
            if not self._connections[customer_id]:
                del self._connections[customer_id]

    async def broadcast(self, customer_id: str, data: dict):
        dead = set()
        for ws in self._connections.get(customer_id, set()):
            try:
                await ws.send_text(json.dumps(data))
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections.get(customer_id, set()).discard(ws)


manager = ConnectionManager()


class GlobalNotificationManager:
    """Broadcasts platform-wide notifications (churn alerts, new recs, etc.)."""

    def __init__(self):
        self._connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self._connections.discard(websocket)

    async def broadcast_alert(self, alert_type: str, message: str, customer_name: str = "", severity: str = "info"):
        payload = {
            "type": "notification",
            "alert_type": alert_type,
            "message": message,
            "customer_name": customer_name,
            "severity": severity,
        }
        dead = set()
        for ws in list(self._connections):
            try:
                await ws.send_text(json.dumps(payload))
            except Exception:
                dead.add(ws)
        for ws in dead:
            self._connections.discard(ws)


global_manager = GlobalNotificationManager()
