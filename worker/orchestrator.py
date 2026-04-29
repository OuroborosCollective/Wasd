import redis
import random
import time
from jinja2 import Template
from enum import Enum
from typing import Dict, Any, Optional

class OrchestratorState(Enum):
    IDLE = "IDLE"
    COOLDOWN = "COOLDOWN"
    THINKING = "THINKING"
    INTERACTING = "INTERACTING"

class HumanInteractionOrchestrator:
    def __init__(self, redis_host: str = 'localhost', redis_port: int = 6379, db: int = 0):
        self.redis = redis.StrictRedis(
            host=redis_host, 
            port=redis_port, 
            db=db, 
            decode_responses=True
        )
        self.state = OrchestratorState.IDLE
        self.cooldown_prefix = "matrix:cooldown:"

    def _get_human_delay(self, mu: float, sigma: float) -> float:
        return max(0.2, random.gauss(mu, sigma))

    def _check_cooldown(self, profile_id: str) -> bool:
        return self.redis.exists(f"{self.cooldown_prefix}{profile_id}")

    def _set_cooldown(self, profile_id: str, mu: float = 300, sigma: float = 60):
        duration = int(max(30, random.gauss(mu, sigma)))
        self.redis.setex(f"{self.cooldown_prefix}{profile_id}", duration, "active")

    def _simulate_mouse_jitter(self) -> Dict[str, int]:
        return {
            "x": random.randint(-12, 12),
            "y": random.randint(-12, 12),
            "hold_ms": random.randint(50, 150)
        }

    def render_message(self, template_str: str, context: Dict[str, Any]) -> str:
        template = Template(template_str)
        return template.render(**context)

    def execute(self, profile_id: str, template_str: str, context: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        if self._check_cooldown(profile_id):
            self.state = OrchestratorState.COOLDOWN
            return {
                "status": "skipped",
                "reason": "cooldown_active",
                "ttl": self.redis.ttl(f"{self.cooldown_prefix}{profile_id}")
            }

        try:
            self.state = OrchestratorState.THINKING
            # Simulate initial perception delay
            time.sleep(self._get_human_delay(2.5, 0.8))

            self.state = OrchestratorState.INTERACTING
            
            # Message preparation
            message = self.render_message(template_str, context)
            
            # Simulate mouse movement jitter
            jitter = self._simulate_mouse_jitter()
            
            # Simulate interaction time (typing/clicking)
            typing_speed = self._get_human_delay(1.5, 0.3)
            time.sleep(typing_speed)

            # Apply Cooldown to Redis Matrix
            self._set_cooldown(profile_id)
            
            self.state = OrchestratorState.IDLE
            
            return {
                "status": "success",
                "payload": {
                    "message": message,
                    "mouse_jitter": jitter,
                    "execution_time": time.time()
                }
            }
        except Exception as e:
            self.state = OrchestratorState.IDLE
            return {"status": "error", "message": str(e)}

    def get_current_state(self) -> str:
        return self.state.value

if __name__ == "__main__":
    # Example usage:
    # orchestrator = HumanInteractionOrchestrator()
    # result = orchestrator.execute("user_1", "Hi {{ name }}, how are you?", {"name": "Max"})
    pass