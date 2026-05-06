from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime
import re
import uuid

class LeadExtraction(BaseModel):
    """Schema for raw lead data extracted from various gaming platforms."""
    model_config = ConfigDict(populate_by_name=True)

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), description="Internal unique identifier for the lead")
    platform: str = Field(..., description="Target gaming platform, e.g., Steam, Discord, BattleNet, Riot")
    identifier: str = Field(..., description="The unique profile identifier or tag (e.g., User#1234)")
    extracted_at: datetime = Field(default_factory=datetime.utcnow, description="Timestamp of extraction")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional context-specific data")

    @field_validator('identifier')
    @classmethod
    def validate_gaming_id(cls, v: str, info) -> str:
        platform = info.data.get('platform', '').lower()
        if not platform:
            return v
            
        if platform == 'battlenet':
            if not re.match(r'^.{3,12}#[0-9]{4,5}$', v):
                raise ValueError('Invalid BattleTag format (e.g., User#1234)')
        elif platform == 'discord':
            # Discord IDs are snowflakes (17-20 digits)
            if not re.match(r'^\d{17,20}$', v):
                raise ValueError('Invalid Discord Snowflake ID')
        elif platform == 'steam':
            # SteamID64 (starts with 7656119) or Vanity URL
            if not re.match(r'^(7656119[0-9]{10}|[a-zA-Z0-9_-]{2,32})$', v):
                raise ValueError('Invalid SteamID64 or vanity URL')
        elif platform == 'riot':
            # Riot ID: Name#Tag
            if not re.match(r'^.{3,16}#[a-zA-Z0-9]{1,5}$', v):
                raise ValueError('Invalid Riot ID format')
        return v

class ScoringParameters(BaseModel):
    """Configuration for the logic-optimizer scoring algorithm."""
    activity_weight: float = Field(default=0.4, ge=0.0, le=1.0)
    skill_level_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    social_reach_weight: float = Field(default=0.2, ge=0.0, le=1.0)
    retention_potential_weight: float = Field(default=0.1, ge=0.0, le=1.0)
    min_qualification_threshold: float = Field(default=40.0, ge=0.0, le=100.0)
    use_ai_enhancement: bool = Field(default=True)

class OptimizationMetrics(BaseModel):
    """Performance and accuracy metrics for a specific optimization run."""
    processing_latency_ms: float = Field(..., description="Total processing time in milliseconds")
    extraction_success_rate: float = Field(..., ge=0.0, le=1.0)
    false_positive_rate: float = Field(..., ge=0.0, le=1.0)
    cost_per_extraction: float = Field(..., description="Estimated compute cost for this operation")
    throughput_per_second: float = Field(..., description="Calculated throughput of the logic engine")
    model_confidence_score: float = Field(..., ge=0.0, le=1.0)

class LeadProfile(BaseModel):
    """The final processed lead object including scores and qualification status."""
    extraction_data: LeadExtraction
    scores: Dict[str, float] = Field(..., description="Individual component scores")
    final_score: float = Field(..., ge=0.0, le=100.0)
    is_qualified: bool = Field(..., description="Determines if lead meets minimum qualification threshold")
    metrics: OptimizationMetrics
    processed_at: datetime = Field(default_factory=datetime.utcnow)

class AgentOptimizationTask(BaseModel):
    """Schema for internal agent task distribution within the Metaverse context."""
    task_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_id: str = Field(..., description="The Jules agent assigned to this task")
    priority: int = Field(default=1, ge=1, le=10)
    payload: Dict[str, Any]
    status: str = Field(default="pending", pattern="^(pending|processing|completed|failed)$")

class LogicOptimizerResponse(BaseModel):
    """Standardized API response for logic service operations."""
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)