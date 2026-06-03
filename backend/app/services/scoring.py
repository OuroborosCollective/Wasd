# pyrefly: ignore [missing-import]
from __future__ import annotations

import logging
import re
import time
from dataclasses import dataclass
from typing import Optional, Any

# pyrefly: ignore [missing-import]
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

# pyrefly: ignore [missing-import]
from sqlalchemy import Column, String

# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session, declarative_base


logger = logging.getLogger(__name__)

Base = declarative_base()


class Config(Base):
    """
    Simple key/value config table.

    Expected optional keys:
    - sentiment_weight
    - density_weight
    - positivity_bias
    - min_text_chars
    - max_text_chars
    """

    __tablename__ = "config"

    key = Column(String, primary_key=True)
    value = Column(String, nullable=True)


@dataclass(frozen=True)
class SentimentEngineSettings:
    sentiment_weight: float = 0.70
    density_weight: float = 0.30
    positivity_bias: float = 0.00

    min_text_chars: int = 1
    max_text_chars: int = 20_000

    cache_ttl_seconds: float = 30.0


@dataclass(frozen=True)
class SentimentScoreBreakdown:
    final_score: float
    sentiment_score: float
    density_score: float
    compound: float
    word_count: int
    char_count: int
    sentiment_weight: float
    density_weight: float
    positivity_bias: float


class SentimentEngine:
    """
    Deterministic scoring engine for text sentiment + density.

    Output range:
    - 0.0 = very weak / negative
    - 0.5 = neutral
    - 1.0 = strong / positive

    Design goals:
    - Safe DB config loading
    - Bounded weights
    - No Date.now-style scoring randomness
    - Optional config cache
    - Stable fallback behavior
    """

    CONFIG_SENTIMENT_WEIGHT = "sentiment_weight"
    CONFIG_DENSITY_WEIGHT = "density_weight"
    CONFIG_POSITIVITY_BIAS = "positivity_bias"
    CONFIG_MIN_TEXT_CHARS = "min_text_chars"
    CONFIG_MAX_TEXT_CHARS = "max_text_chars"

    WORD_RE = re.compile(r"[A-Za-zÀ-ÖØ-öø-ÿ0-9_'-]+", re.UNICODE)

    def __init__(self, settings: Optional[SentimentEngineSettings] = None):
        self.default_settings = settings or SentimentEngineSettings()
        self._cached_settings: Optional[SentimentEngineSettings] = None
        self._cache_loaded_at: float = 0.0

        try:
            self.analyzer: Optional[SentimentIntensityAnalyzer] = SentimentIntensityAnalyzer()
        except Exception:
            logger.exception("Failed to initialize SentimentIntensityAnalyzer")
            self.analyzer = None

    def calculate_score(self, db: Optional[Session], text: str) -> float:
        """
        Main simple scoring API.
        Returns only final score.
        """
        return self.calculate_breakdown(db, text).final_score

    def calculate_breakdown(self, db: Optional[Session], text: str) -> SentimentScoreBreakdown:
        """
        Full scoring API.
        Returns score plus useful debug/telemetry fields.
        """

        if not isinstance(text, str):
            return self._empty_breakdown(final_score=0.0)

        clean_text = self._normalize_text(text)
        settings = self._get_settings(db)

        if len(clean_text) < settings.min_text_chars:
            return self._empty_breakdown(final_score=0.0)

        if len(clean_text) > settings.max_text_chars:
            clean_text = clean_text[: settings.max_text_chars]

        if self.analyzer is None:
            logger.warning("Sentiment analyzer is unavailable. Returning neutral fallback score.")
            return self._empty_breakdown(final_score=0.5)

        sentiment_score, compound = self._calculate_sentiment_score(clean_text, settings)
        density_score, word_count, char_count = self._calculate_density_score(clean_text)

        final_score = self._weighted_score(
            sentiment_score=sentiment_score,
            density_score=density_score,
            sentiment_weight=settings.sentiment_weight,
            density_weight=settings.density_weight,
        )

        return SentimentScoreBreakdown(
            final_score=final_score,
            sentiment_score=sentiment_score,
            density_score=density_score,
            compound=compound,
            word_count=word_count,
            char_count=char_count,
            sentiment_weight=settings.sentiment_weight,
            density_weight=settings.density_weight,
            positivity_bias=settings.positivity_bias,
        )

    def refresh_config_cache(self) -> None:
        """
        Forces config to be loaded again on next call.
        Useful after admin config updates.
        """
        self._cached_settings = None
        self._cache_loaded_at = 0.0

    def _get_settings(self, db: Optional[Session]) -> SentimentEngineSettings:
        """
        Loads config safely from DB with short TTL cache.
        If db is None or broken, defaults are used.
        """

        now = time.monotonic()

        if (
            self._cached_settings is not None
            and now - self._cache_loaded_at <= self.default_settings.cache_ttl_seconds
        ):
            return self._cached_settings

        settings = self.default_settings

        if db is None:
            self._cached_settings = settings
            self._cache_loaded_at = now
            return settings

        try:
            raw_config = {
                item.key: item.value
                for item in db.query(Config).filter(
                    Config.key.in_(
                        [
                            self.CONFIG_SENTIMENT_WEIGHT,
                            self.CONFIG_DENSITY_WEIGHT,
                            self.CONFIG_POSITIVITY_BIAS,
                            self.CONFIG_MIN_TEXT_CHARS,
                            self.CONFIG_MAX_TEXT_CHARS,
                        ]
                    )
                ).all()
                if item and item.key
            }

            settings = SentimentEngineSettings(
                sentiment_weight=self._safe_float(
                    raw_config.get(self.CONFIG_SENTIMENT_WEIGHT),
                    default=self.default_settings.sentiment_weight,
                    min_value=0.0,
                    max_value=10.0,
                ),
                density_weight=self._safe_float(
                    raw_config.get(self.CONFIG_DENSITY_WEIGHT),
                    default=self.default_settings.density_weight,
                    min_value=0.0,
                    max_value=10.0,
                ),
                positivity_bias=self._safe_float(
                    raw_config.get(self.CONFIG_POSITIVITY_BIAS),
                    default=self.default_settings.positivity_bias,
                    min_value=-0.5,
                    max_value=0.5,
                ),
                min_text_chars=self._safe_int(
                    raw_config.get(self.CONFIG_MIN_TEXT_CHARS),
                    default=self.default_settings.min_text_chars,
                    min_value=1,
                    max_value=10_000,
                ),
                max_text_chars=self._safe_int(
                    raw_config.get(self.CONFIG_MAX_TEXT_CHARS),
                    default=self.default_settings.max_text_chars,
                    min_value=10,
                    max_value=1_000_000,
                ),
                cache_ttl_seconds=self.default_settings.cache_ttl_seconds,
            )

        except Exception:
            logger.exception("Error fetching sentiment configuration from database. Using defaults.")
            settings = self.default_settings

        self._cached_settings = settings
        self._cache_loaded_at = now
        return settings

    def _calculate_sentiment_score(
        self,
        text: str,
        settings: SentimentEngineSettings,
    ) -> tuple[float, float]:
        """
        VADER compound score:
        - raw range: [-1.0, 1.0]
        - normalized range: [0.0, 1.0]
        """

        try:
            if self.analyzer is None:
                return 0.5, 0.0

            result: dict[str, Any] = self.analyzer.polarity_scores(text)
            compound = self._safe_float(
                result.get("compound"),
                default=0.0,
                min_value=-1.0,
                max_value=1.0,
            )

            normalized = (compound + 1.0) / 2.0
            biased = normalized + settings.positivity_bias

            return self._clamp01(biased), compound

        except Exception:
            logger.exception("Error during sentiment analysis")
            return 0.5, 0.0

    def _calculate_density_score(self, text: str) -> tuple[float, int, int]:
        """
        Stable word-density score.

        Instead of simple split(), this uses a regex tokenizer.
        Score rewards readable text density without exploding on whitespace.
        """

        try:
            clean_text = text.strip()
            char_count = len(clean_text)

            if char_count <= 0:
                return 0.0, 0, 0

            words = self.WORD_RE.findall(clean_text)
            word_count = len(words)

            if word_count <= 0:
                return 0.0, 0, char_count

            average_word_length = char_count / max(1, word_count)

            # Sweet spot ungefähr 4-7 chars pro Wort.
            # Sehr kurze Spam-Tokens und riesige Textblöcke werden weniger stark belohnt.
            if average_word_length <= 0:
                density_score = 0.0
            else:
                density_score = min(1.0, 5.0 / average_word_length)

            # Kleine Texte nicht künstlich überbewerten.
            if word_count < 3:
                density_score *= 0.65

            return self._clamp01(density_score), word_count, char_count

        except Exception:
            logger.exception("Error during density calculation")
            return 0.0, 0, 0

    def _weighted_score(
        self,
        sentiment_score: float,
        density_score: float,
        sentiment_weight: float,
        density_weight: float,
    ) -> float:
        try:
            sentiment_weight = max(0.0, float(sentiment_weight))
            density_weight = max(0.0, float(density_weight))

            total_weight = sentiment_weight + density_weight

            if total_weight <= 0.0:
                logger.warning("Total sentiment score weight is zero. Returning neutral score.")
                return 0.5

            score = (
                sentiment_score * sentiment_weight
                + density_score * density_weight
            ) / total_weight

            return round(self._clamp01(score), 4)

        except Exception:
            logger.exception("Error during weighted sentiment score aggregation")
            return 0.0

    @staticmethod
    def _normalize_text(text: str) -> str:
        """
        Normalizes whitespace while preserving deterministic content.
        """
        return " ".join(text.strip().split())

    @staticmethod
    def _safe_float(
        value: Any,
        default: float,
        min_value: float,
        max_value: float,
    ) -> float:
        try:
            if value is None:
                return default

            parsed = float(value)

            if parsed != parsed:
                return default

            if parsed == float("inf") or parsed == float("-inf"):
                return default

            return max(min_value, min(max_value, parsed))

        except Exception:
            return default

    @staticmethod
    def _safe_int(
        value: Any,
        default: int,
        min_value: int,
        max_value: int,
    ) -> int:
        try:
            if value is None:
                return default

            parsed = int(value)
            return max(min_value, min(max_value, parsed))

        except Exception:
            return default

    @staticmethod
    def _clamp01(value: float) -> float:
        return max(0.0, min(1.0, float(value)))

    @staticmethod
    def _empty_breakdown(final_score: float) -> SentimentScoreBreakdown:
        return SentimentScoreBreakdown(
            final_score=round(max(0.0, min(1.0, float(final_score))), 4),
            sentiment_score=0.0,
            density_score=0.0,
            compound=0.0,
            word_count=0,
            char_count=0,
            sentiment_weight=0.70,
            density_weight=0.30,
            positivity_bias=0.0,
            )
