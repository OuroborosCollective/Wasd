import json
from dataclasses import dataclass, asdict
from typing import Any, Dict, List, Optional
from datetime import datetime

@dataclass
class KappaPosition:
    id: str
    latitude: float
    longitude: float
    timestamp: str
    metadata: Optional[Dict[str, Any]] = None

class KappaPosConverter:
    def __init__(self, provider_name: str):
        self.provider_name = provider_name

    def validate_input(self, data: Dict[str, Any]) -> bool:
        required_fields = ["id", "lat", "lon"]
        return all(field in data for field in required_fields)

    def convert(self, raw_data: Dict[str, Any]) -> KappaPosition:
        if not self.validate_input(raw_data):
            raise ValueError(f"Invalid input data for provider {self.provider_name}")

        try:
            return KappaPosition(
                id=str(raw_data["id"]),
                latitude=float(raw_data["lat"]),
                longitude=float(raw_data["lon"]),
                timestamp=raw_data.get("timestamp", datetime.utcnow().isoformat()),
                metadata=raw_data.get("extra_info")
            )
        except (TypeError, ValueError) as e:
            raise ValueError(f"Data type conversion error: {str(e)}")

    def process_batch(self, items: List[Dict[str, Any]]) -> List[KappaPosition]:
        converted_items: List[KappaPosition] = []
        for item in items:
            try:
                converted = self.convert(item)
                converted_items.append(converted)
            except ValueError:
                continue
        return converted_items

    def to_json(self, position: KappaPosition) -> str:
        return json.dumps(asdict(position))

if __name__ == "__main__":
    converter = KappaPosConverter(provider_name="GlobalLogistics_Alpha")
    
    sample_input = [
        {"id": "POS-001", "lat": 52.5200, "lon": 13.4050, "extra_info": {"speed": 50}},
        {"id": "POS-002", "lat": "48.8566", "lon": "2.3522", "timestamp": "2023-10-27T10:00:00Z"},
        {"id": "INVALID", "lat": None}
    ]
    
    results = converter.process_batch(sample_input)
    
    for res in results:
        print(f"Successfully converted position {res.id} at ({res.latitude}, {res.longitude})")