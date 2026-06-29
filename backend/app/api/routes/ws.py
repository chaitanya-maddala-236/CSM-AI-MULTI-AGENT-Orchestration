"""WebSocket route for real-time agent run status."""
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query
from app.websocket import manager

router = APIRouter(tags=["websocket"])


@router.websocket("/ws/agents/{customer_id}")
async def agent_status_ws(websocket: WebSocket, customer_id: str):
    """Subscribe to agent run updates for a specific customer."""
    await manager.connect(websocket, customer_id)
    try:
        while True:
            # Keep alive — client can send pings
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        manager.disconnect(websocket, customer_id)


@router.websocket("/ws/notifications")
async def global_notifications_ws(websocket: WebSocket):
    """Subscribe to platform-wide notifications (churn alerts, new recs)."""
    from app.websocket import global_manager
    await global_manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text('{"type":"pong"}')
    except WebSocketDisconnect:
        global_manager.disconnect(websocket)
