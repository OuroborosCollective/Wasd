from fastapi import FastAPI, APIRouter, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import json
import asyncio

app = FastAPI(title="Lead Optimizer Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

router = APIRouter()

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            await connection.send_text(json.dumps(message))

manager = ConnectionManager()

@router.post("/conv/{lead_id}")
async def trigger_optimizer(lead_id: str):
    # Logik für den Optimizer-Trigger
    update_data = {
        "type": "OPTIMIZER_TRIGGERED",
        "lead_id": lead_id,
        "status": "processing",
        "timestamp": "2023-10-27T10:00:00Z"
    }
    await manager.broadcast(update_data)
    return {"status": "success", "lead_id": lead_id, "message": "Optimization started"}

@router.websocket("/ws/analytics")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # Beispielhafter Herzschlag oder Empfang von Client-Daten
            data = await websocket.receive_text()
            # Echo oder Verarbeitung
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        manager.disconnect(websocket)

app.include_router(router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)