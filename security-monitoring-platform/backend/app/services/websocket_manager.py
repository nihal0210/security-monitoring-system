import json
import logging
from datetime import datetime
from typing import List
from fastapi import WebSocket

logger = logging.getLogger("uvicorn.error")

class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"[WebSocket] Client connected. Total active: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"[WebSocket] Client disconnected. Total active: {len(self.active_connections)}")

    async def broadcast(self, event_type: str, data: dict):
        if not self.active_connections:
            return

        payload = {
            "type": event_type,
            "data": data,
            "broadcast_time": datetime.utcnow().isoformat()
        }
        text = json.dumps(payload, default=str)

        disconnected = []
        for connection in self.active_connections:
            try:
                await connection.send_text(text)
            except Exception as e:
                logger.warning(f"[WebSocket] Error broadcasting to client: {e}")
                disconnected.append(connection)

        for dead_conn in disconnected:
            self.disconnect(dead_conn)

ws_manager = WebSocketManager()
