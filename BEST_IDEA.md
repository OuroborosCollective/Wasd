import time
from typing import Dict, Any

class ARELogicEngine:
    """
    Stateless Logic Controller for identifying and executing the 'Best Idea'.
    Operates at a strictly enforced 10Hz cycle.
    """

    @staticmethod
    def run_tick(state: Dict[str, Any]) -> Dict[str, Any]:
        """
        Core 10Hz Logic Entry Point.
        :param state: The current world/system state (must contain all necessary context).
        :return: Action command based on the 'Best Idea' evaluation.
        """
        # 1. Perception: Extract features safely from stateless input
        # Robust extraction to handle missing keys or None values which would cause TypeErrors
        raw_health = state.get("health")
        system_health = float(raw_health) if raw_health is not None else 1.0
        
        raw_tasks = state.get("tasks")
        task_queue = raw_tasks if (raw_tasks is not None and hasattr(raw_tasks, "__len__")) else []
        
        raw_entropy = state.get("entropy")
        environment_entropy = float(raw_entropy) if raw_entropy is not None else 0.5

        # 2. Idea Generation: Transform state into potential high-value actions
        ideas = [
            {
                "label": "SELF_OPTIMIZATION",
                "utility": (1.0 - system_health) * 2.0,
                "command": "SYS_MAINTENANCE_RUN"
            },
            {
                "label": "TASK_EXECUTION",
                "utility": len(task_queue) * 0.5 if system_health > 0.2 else 0.0,
                "command": "EXECUTE_NEXT_TASK"
            },
            {
                "label": "INNOVATION_SEARCH",
                "utility": environment_entropy * 1.2,
                "command": "EXPLORE_NEW_HEURISTICS"
            },
            {
                "label": "IDLE_CONSERVATION",
                "utility": 0.1,
                "command": "LOW_POWER_MODE"
            }
        ]

        # 3. Decision Logic: Select the 'Beste Idee' (Highest Utility)
        best_idea = max(ideas, key=lambda x: x["utility"])

        # 4. Response Mapping (Stateless Action Return)
        return {
            "status": "SUCCESS",
            "tick_timestamp": time.time(),
            "decision": {
                "selected_idea": best_idea["label"],
                "utility_score": best_idea["utility"],
                "action": best_idea["command"]
            },
            "meta": {
                "conformance": "10Hz",
                "state_persisted": False
            }
        }

def start_logic_loop():
    """
    10Hz Runner for the ARE Logic Engine.
    Ensures 100ms loop intervals.
    """
    # Example Initial State
    current_mock_state = {
        "health": 0.85,
        "tasks": ["Process_Data", "Sync_Nodes"],
        "entropy": 0.7
    }

    print(f"--- ARE-Logic Engine Started [10Hz Conformance] ---")
    
    try:
        while True:
            start_cycle = time.perf_counter()

            # Execute Stateless Tick
            output = ARELogicEngine.run_tick(current_mock_state)
            
            # Print decision for monitoring
            decision = output["decision"]
            print(f"[{time.strftime('%H:%M:%S')}] Best Idea: {decision['selected_idea']} "
                  f"(Utility: {decision['utility_score']:.2f}) -> Executing: {decision['action']}")

            # Calculate sleep to maintain 10Hz (0.1s)
            # This accounts for the time spent in logic and printing
            elapsed = time.perf_counter() - start_cycle
            wait_time = 0.1 - elapsed
            if wait_time > 0:
                time.sleep(wait_time)
            else:
                print(f"WARN: Logic cycle exceeded 100ms: {elapsed:.4f}s")

    except KeyboardInterrupt:
        print("\n--- ARE-Logic Engine Terminated Safely ---")

if __name__ == "__main__":
    start_logic_loop()