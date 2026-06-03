# pyrefly: ignore [missing-import]
"""
Lead Logic Optimizer Schemas — Hardened Pydantic v2 Version

Features:
- Pydantic v2 compatible
- Deterministic lead IDs via UUIDv5
- Timezone-aware timestamps
- Platform normalization
- Strong identifier validation
- Scoring weight validation
- Agent task retry support
- Safer standardized API response
"""

from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any, List, Literal
import re
import uuid

from pydantic import (
    BaseModel,
    Field,
    field_validator,
    model_validator,
    ConfigDict,
)


# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

LOGIC_NAMESPACE_UUID = uuid.UUID("c9a64654-99d7-4d33-a1fa-3ac02d8c2b8e")

SUPPORTED_PLATFORMS = {
    "steam",
    "discord",
    "battlenet",
    "riot",
    "xbox",
    "playstation",
    "twitch",
    "youtube",
    "epic",
    "custom",
}


def utc_now() -> datetime:
    """Timezone-aware UTC timestamp."""
    return datetime.now(timezone.utc)


def stable_uuid_from_text(value: str) -> str:
    """
    Deterministic UUID based on stable text input.

    Useful for lead IDs because the same platform + identifier produces
    the same ID across runs.
    """
    normalized = value.strip().lower()
    return str(uuid.uuid5(LOGIC_NAMESPACE_UUID, normalized))


def clamp_score(value: float) -> float:
    """Clamp score into 0..100 range."""
    return max(0.0, min(100.0, float(value)))


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class LeadPlatform(str, Enum):
    STEAM = "steam"
    DISCORD = "discord"
    BATTLENET = "battlenet"
    RIOT = "riot"
    XBOX = "xbox"
    PLAYSTATION = "playstation"
    TWITCH = "twitch"
    YOUTUBE = "youtube"
    EPIC = "epic"
    CUSTOM = "custom"


class TaskStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class ErrorCode(str, Enum):
    VALIDATION_ERROR = "validation_error"
    EXTRACTION_ERROR = "extraction_error"
    SCORING_ERROR = "scoring_error"
    AGENT_ERROR = "agent_error"
    UNKNOWN_ERROR = "unknown_error"


# ---------------------------------------------------------------------------
# Core Schemas
# ---------------------------------------------------------------------------

class LeadExtraction(BaseModel):
    """
    Schema for raw lead data extracted from gaming platforms.

    Deterministic behavior:
    - If id is omitted, it is generated from platform + identifier.
    - Same platform + identifier = same lead id.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        extra="allow",
        validate_assignment=True,
        str_strip_whitespace=True,
    )

    id: Optional[str] = Field(
        default=None,
        description="Deterministic internal unique identifier for the lead",
    )

    platform: LeadPlatform = Field(
        ...,
        description="Target gaming platform, e.g. Steam, Discord, BattleNet, Riot",
    )

    identifier: str = Field(
        ...,
        min_length=1,
        max_length=128,
        description="Unique profile identifier or tag, e.g. User#1234",
    )

    extracted_at: datetime = Field(
        default_factory=utc_now,
        description="Timestamp of extraction",
    )

    source: Optional[str] = Field(
        default=None,
        max_length=256,
        description="Optional source system or campaign name",
    )

    confidence_hint: Optional[float] = Field(
        default=None,
        ge=0.0,
        le=1.0,
        description="Optional upstream confidence value",
    )

    metadata: Dict[str, Any] = Field(
        default_factory=dict,
        description="Additional context-specific data",
    )

    @field_validator("platform", mode="before")
    @classmethod
    def normalize_platform(cls, value: Any) -> Any:
        if isinstance(value, str):
            normalized = value.strip().lower().replace("_", "").replace("-", "")

            aliases = {
                "battle.net": "battlenet",
                "battle_net": "battlenet",
                "battle-net": "battlenet",
                "bnet": "battlenet",
                "psn": "playstation",
                "playstationnetwork": "playstation",
                "yt": "youtube",
                "youtubegaming": "youtube",
                "epicgames": "epic",
            }

            normalized = aliases.get(normalized, normalized)

            if normalized not in SUPPORTED_PLATFORMS:
                raise ValueError(f"Unsupported platform: {value}")

            return normalized

        return value

    @field_validator("identifier")
    @classmethod
    def validate_gaming_id(cls, value: str, info) -> str:
        identifier = value.strip()
        platform = info.data.get("platform")

        if isinstance(platform, LeadPlatform):
            platform_value = platform.value
        else:
            platform_value = str(platform).lower() if platform else ""

        if not platform_value:
            return identifier

        if platform_value == "battlenet":
            # BattleTag: Name#1234 or Name#12345
            if not re.match(r"^[A-Za-z0-9À-ÿ_. -]{3,12}#[0-9]{4,5}$", identifier):
                raise ValueError("Invalid BattleTag format, expected e.g. User#1234")

        elif platform_value == "discord":
            # Discord snowflake ID. New usernames are not always discriminator-based.
            if not re.match(r"^\d{17,20}$", identifier):
                raise ValueError("Invalid Discord Snowflake ID, expected 17-20 digits")

        elif platform_value == "steam":
            # SteamID64 or vanity URL
            if not re.match(r"^(7656119[0-9]{10}|[a-zA-Z0-9_-]{2,32})$", identifier):
                raise ValueError("Invalid SteamID64 or Steam vanity identifier")

        elif platform_value == "riot":
            # Riot ID: GameName#TAG
            if not re.match(r"^[A-Za-z0-9À-ÿ_. -]{3,16}#[A-Za-z0-9]{1,5}$", identifier):
                raise ValueError("Invalid Riot ID format, expected Name#Tag")

        elif platform_value == "xbox":
            # Xbox gamertag
            if not re.match(r"^[A-Za-z0-9 ]{3,15}$", identifier):
                raise ValueError("Invalid Xbox gamertag format")

        elif platform_value == "playstation":
            # PSN Online ID
            if not re.match(r"^[A-Za-z][A-Za-z0-9_-]{2,15}$", identifier):
                raise ValueError("Invalid PlayStation Network ID")

        elif platform_value == "twitch":
            if not re.match(r"^[a-zA-Z0-9_]{3,25}$", identifier):
                raise ValueError("Invalid Twitch username")

        elif platform_value == "youtube":
            # Channel ID, handle, or custom username
            if not re.match(r"^(@[A-Za-z0-9_.-]{3,30}|UC[A-Za-z0-9_-]{20,32}|[A-Za-z0-9_.-]{3,64})$", identifier):
                raise ValueError("Invalid YouTube channel identifier")

        elif platform_value == "epic":
            if not re.match(r"^[A-Za-z0-9_. -]{3,32}$", identifier):
                raise ValueError("Invalid Epic Games identifier")

        elif platform_value == "custom":
            if len(identifier) < 2:
                raise ValueError("Custom identifier must contain at least 2 characters")

        return identifier

    @model_validator(mode="after")
    def assign_deterministic_id(self) -> "LeadExtraction":
        if not self.id:
            self.id = stable_uuid_from_text(f"{self.platform.value}:{self.identifier}")
        return self


class ScoringParameters(BaseModel):
    """
    Configuration for the logic-optimizer scoring algorithm.

    The four scoring weights must add up to roughly 1.0.
    """

    model_config = ConfigDict(
        validate_assignment=True,
        extra="forbid",
    )

    activity_weight: float = Field(default=0.4, ge=0.0, le=1.0)
    skill_level_weight: float = Field(default=0.3, ge=0.0, le=1.0)
    social_reach_weight: float = Field(default=0.2, ge=0.0, le=1.0)
    retention_potential_weight: float = Field(default=0.1, ge=0.0, le=1.0)

    min_qualification_threshold: float = Field(
        default=40.0,
        ge=0.0,
        le=100.0,
    )

    use_ai_enhancement: bool = Field(default=True)

    deterministic_mode: bool = Field(
        default=True,
        description="When true, scoring should avoid nondeterministic randomness",
    )

    score_version: str = Field(
        default="logic-score-v1",
        pattern=r"^[a-zA-Z0-9_.-]{3,64}$",
    )

    @model_validator(mode="after")
    def validate_weight_sum(self) -> "ScoringParameters":
        total = (
            self.activity_weight
            + self.skill_level_weight
            + self.social_reach_weight
            + self.retention_potential_weight
        )

        if abs(total - 1.0) > 0.0001:
            raise ValueError(
                f"Scoring weights must sum to 1.0, got {total:.4f}"
            )

        return self


class LeadScoreBreakdown(BaseModel):
    """Individual component scores used to calculate final_score."""

    model_config = ConfigDict(extra="forbid", validate_assignment=True)

    activity: float = Field(default=0.0, ge=0.0, le=100.0)
    skill_level: float = Field(default=0.0, ge=0.0, le=100.0)
    social_reach: float = Field(default=0.0, ge=0.0, le=100.0)
    retention_potential: float = Field(default=0.0, ge=0.0, le=100.0)

    ai_enhancement_bonus: float = Field(
        default=0.0,
        ge=-20.0,
        le=20.0,
        description="Optional bounded bonus or penalty from AI enrichment",
    )

    final_raw: Optional[float] = Field(
        default=None,
        description="Optional unrounded raw score before clamp",
    )


class OptimizationMetrics(BaseModel):
    """Performance and accuracy metrics for a specific optimization run."""

    model_config = ConfigDict(extra="forbid", validate_assignment=True)

    processing_latency_ms: float = Field(
        ...,
        ge=0.0,
        description="Total processing time in milliseconds",
    )

    extraction_success_rate: float = Field(..., ge=0.0, le=1.0)
    false_positive_rate: float = Field(..., ge=0.0, le=1.0)

    cost_per_extraction: float = Field(
        ...,
        ge=0.0,
        description="Estimated compute cost for this operation",
    )

    throughput_per_second: float = Field(
        ...,
        ge=0.0,
        description="Calculated throughput of the logic engine",
    )

    model_confidence_score: float = Field(..., ge=0.0, le=1.0)

    engine_tick_hz: float = Field(
        default=10.0,
        ge=0.1,
        le=240.0,
        description="Logic engine tick rate used during processing",
    )

    deterministic_hash: Optional[str] = Field(
        default=None,
        description="Optional hash of deterministic scoring inputs",
    )


class LeadProfile(BaseModel):
    """
    Final processed lead object including scores and qualification status.
    """

    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
    )

    extraction_data: LeadExtraction

    score_breakdown: LeadScoreBreakdown = Field(
        ...,
        description="Individual component scores",
    )

    final_score: float = Field(..., ge=0.0, le=100.0)

    is_qualified: bool = Field(
        ...,
        description="Determines if lead meets minimum qualification threshold",
    )

    qualification_reason: Optional[str] = Field(
        default=None,
        max_length=512,
        description="Human-readable explanation of qualification result",
    )

    metrics: OptimizationMetrics

    processed_at: datetime = Field(default_factory=utc_now)

    tags: List[str] = Field(
        default_factory=list,
        description="Optional routing or segmentation tags",
    )

    @field_validator("tags")
    @classmethod
    def normalize_tags(cls, tags: List[str]) -> List[str]:
        cleaned: List[str] = []

        for tag in tags:
            normalized = tag.strip().lower().replace(" ", "_")
            if normalized and normalized not in cleaned:
                cleaned.append(normalized)

        return cleaned


# ---------------------------------------------------------------------------
# Agent Schemas
# ---------------------------------------------------------------------------

class AgentOptimizationTask(BaseModel):
    """
    Schema for internal agent task distribution within the Metaverse context.
    """

    model_config = ConfigDict(
        extra="forbid",
        validate_assignment=True,
        str_strip_whitespace=True,
    )

    task_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique task identifier",
    )

    agent_id: str = Field(
        ...,
        min_length=2,
        max_length=128,
        description="Agent assigned to this task",
    )

    priority: int = Field(default=1, ge=1, le=10)

    payload: Dict[str, Any]

    status: TaskStatus = Field(default=TaskStatus.PENDING)

    created_at: datetime = Field(default_factory=utc_now)

    updated_at: datetime = Field(default_factory=utc_now)

    retries: int = Field(
        default=0,
        ge=0,
        le=10,
        description="Number of retry attempts already performed",
    )

    max_retries: int = Field(
        default=3,
        ge=0,
        le=10,
        description="Maximum allowed retry attempts",
    )

    error: Optional[str] = Field(default=None, max_length=2048)

    deterministic_task_key: Optional[str] = Field(
        default=None,
        description="Optional stable key for deduplicating repeated tasks",
    )

    @model_validator(mode="after")
    def assign_task_key(self) -> "AgentOptimizationTask":
        if not self.deterministic_task_key:
            base = f"{self.agent_id}:{self.priority}:{repr(sorted(self.payload.items()))}"
            self.deterministic_task_key = stable_uuid_from_text(base)
        return self

    def can_retry(self) -> bool:
        return self.status == TaskStatus.FAILED and self.retries < self.max_retries


# ---------------------------------------------------------------------------
# Response Schemas
# ---------------------------------------------------------------------------

class LogicError(BaseModel):
    """Structured API error."""

    model_config = ConfigDict(extra="forbid")

    code: ErrorCode = Field(default=ErrorCode.UNKNOWN_ERROR)
    message: str
    details: Optional[Dict[str, Any]] = None


class LogicOptimizerResponse(BaseModel):
    """
    Standardized API response for logic service operations.
    """

    model_config = ConfigDict(
        populate_by_name=True,
        extra="forbid",
    )

    success: bool

    data: Optional[Any] = None

    error: Optional[LogicError] = None

    timestamp: datetime = Field(default_factory=utc_now)

    request_id: str = Field(
        default_factory=lambda: str(uuid.uuid4()),
        description="Unique request id for traceability",
    )

    engine_version: str = Field(
        default="logic-optimizer-v1",
        description="Internal logic engine version",
    )

    @model_validator(mode="after")
    def validate_response_state(self) -> "LogicOptimizerResponse":
        if self.success and self.error is not None:
            raise ValueError("Successful response cannot contain error")

        if not self.success and self.error is None:
            raise ValueError("Failed response must contain error")

        return self

    @classmethod
    def ok(
        cls,
        data: Optional[Any] = None,
        *,
        engine_version: str = "logic-optimizer-v1",
    ) -> "LogicOptimizerResponse":
        return cls(
            success=True,
            data=data,
            engine_version=engine_version,
        )

    @classmethod
    def fail(
        cls,
        message: str,
        *,
        code: ErrorCode = ErrorCode.UNKNOWN_ERROR,
        details: Optional[Dict[str, Any]] = None,
        engine_version: str = "logic-optimizer-v1",
    ) -> "LogicOptimizerResponse":
        return cls(
            success=False,
            error=LogicError(
                code=code,
                message=message,
                details=details,
            ),
            engine_version=engine_version,
        )


# ---------------------------------------------------------------------------
# Deterministic Scoring Helper
# ---------------------------------------------------------------------------

def calculate_final_score(
    breakdown: LeadScoreBreakdown,
    params: ScoringParameters,
) -> float:
    """
    Deterministic weighted score calculation.

    No random values.
    No time-based scoring.
    Same inputs = same output.
    """

    raw_score = (
        breakdown.activity * params.activity_weight
        + breakdown.skill_level * params.skill_level_weight
        + breakdown.social_reach * params.social_reach_weight
        + breakdown.retention_potential * params.retention_potential_weight
        + breakdown.ai_enhancement_bonus
    )

    return round(clamp_score(raw_score), 4)


def build_lead_profile(
    extraction: LeadExtraction,
    breakdown: LeadScoreBreakdown,
    params: ScoringParameters,
    metrics: OptimizationMetrics,
) -> LeadProfile:
    """
    Build a complete LeadProfile deterministically from extraction + scores.
    """

    final_score = calculate_final_score(breakdown, params)
    is_qualified = final_score >= params.min_qualification_threshold

    reason = (
        f"Qualified: score {final_score} >= threshold {params.min_qualification_threshold}"
        if is_qualified
        else f"Rejected: score {final_score} < threshold {params.min_qualification_threshold}"
    )

    breakdown.final_raw = final_score

    return LeadProfile(
        extraction_data=extraction,
        score_breakdown=breakdown,
        final_score=final_score,
        is_qualified=is_qualified,
        qualification_reason=reason,
        metrics=metrics,
    )


# ---------------------------------------------------------------------------
# Example Usage
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    extraction = LeadExtraction(
        platform="steam",
        identifier="76561198000000000",
        metadata={
            "activity_days_30": 22,
            "guild_count": 3,
            "estimated_skill_tier": "high",
        },
    )

    params = ScoringParameters(
        activity_weight=0.4,
        skill_level_weight=0.3,
        social_reach_weight=0.2,
        retention_potential_weight=0.1,
        min_qualification_threshold=40.0,
        use_ai_enhancement=True,
        deterministic_mode=True,
    )

    breakdown = LeadScoreBreakdown(
        activity=80.0,
        skill_level=72.0,
        social_reach=45.0,
        retention_potential=65.0,
        ai_enhancement_bonus=3.5,
    )

    metrics = OptimizationMetrics(
        processing_latency_ms=12.4,
        extraction_success_rate=0.98,
        false_positive_rate=0.03,
        cost_per_extraction=0.001,
        throughput_per_second=320.0,
        model_confidence_score=0.91,
        engine_tick_hz=10.0,
        deterministic_hash=stable_uuid_from_text(
            f"{extraction.platform.value}:{extraction.identifier}:{breakdown.model_dump_json()}"
        ),
    )

    profile = build_lead_profile(
        extraction=extraction,
        breakdown=breakdown,
        params=params,
        metrics=metrics,
    )

    response = LogicOptimizerResponse.ok(data=profile.model_dump(mode="json"))

    print(response.model_dump_json(indent=2))
