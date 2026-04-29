from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any, List
import re

class LeadExtraction(BaseModel):
    platform: str = Field(..., description="Target gaming platform, e.g., Steam, Discord, BattleNet")
    identifier: str = Field(..., description="The unique profile identifier or tag")
    extracted_at: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)

    @field_validator('identifier')
    @classmethod
    def validate_gaming_id(cls, v, info):
        platform = info.data.get('platform', '').lower()
        if platform == 'battlenet':
            if not re.match(r'^.{3,12}#[0-9]{4,5}$', v):
                raise ValueError('Invalid BattleTag format (e.g., User#1234)')
        elif platform == 'discord':
            if not re.match(r'^\d{17,20}$', v):
                raise ValueError('Invalid Discord Snowflake ID')
        elif platform == 'steam':
            if not re.match(r'^(7656119[0-9]{10}|[a-zA-Z0-9_-]{2,32})$', v):
                raise ValueError('Invalid SteamID64 or vanity URL')
        elif platform == 'riot':
            if not re.match(r'^.{3,16}#[a-zA-Z0-9]{1,5}$', v):
                raise ValueError('Invalid Riot ID format')
        return v

class ScoringParameters(BaseModel):
    activity_weight: float = Field(default=0.4, ge=0.0, le=1.0)
    skill_level_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    social_reach_weight: float = Field(default=0.2, ge=0.0, le=1.0)
    retention_potential_weight: float = Field(default=0.1, ge=0.0, le=1.0)
    min_qualification_threshold: float = Field(default=40.0, ge=0.0, le=100.0)
    use_ai_enhancement: bool = Field(default=True)

class OptimizationMetrics(BaseModel):
    processing_latency_ms: float = Field(..., description="Total processing time in milliseconds")
    extraction_success_rate: float = Field(..., ge=0.0, le=1.0)
    false_positive_rate: float = Field(..., ge=0.0, le=1.0)
    cost_per_extraction: float
    throughput_per_second: float
    model_confidence_score: float = Field(..., ge=0.0, le=1.0)

class LeadProfile(BaseModel):
    extraction_data: LeadExtraction
    scores: Dict[str, float]
    final_score: float
    is_qualified: bool
    metrics: OptimizationMetrics