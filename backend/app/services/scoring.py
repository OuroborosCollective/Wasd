# pyrefly: ignore [missing-import]
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sqlalchemy.orm import Session
from sqlalchemy import Column, String
from sqlalchemy.ext.declarative import declarative_base
import logging

# Setup Logger for the Scoring Service
logger = logging.getLogger(__name__)

Base = declarative_base()

class Config(Base):
    __tablename__ = "config"
    key = Column(String, primary_key=True)
    value = Column(String)

class SentimentEngine:
    def __init__(self):
        """
        Initializes the SentimentIntensityAnalyzer for the Jules Agent Framework.
        """
        try:
            self.analyzer = SentimentIntensityAnalyzer()
        except Exception as e:
            logger.error(f"Failed to initialize SentimentIntensityAnalyzer: {e}")
            self.analyzer = None

    def calculate_score(self, db: Session, text: str) -> float:
        """
        Calculates a weighted score based on sentiment and word density.
        Strictly validates inputs to prevent NoneType or casting errors.
        """
        # Strict Input Validation
        if not isinstance(text, str) or not text.strip():
            return 0.0

        if self.analyzer is None:
            logger.warning("SentimentEngine analyzer is not initialized. Returning default score.")
            return 0.0

        # Default Weights
        weight_sentiment = 0.7
        weight_density = 0.3

        # Database Configuration Retrieval with strict None-handling
        if db is not None:
            try:
                s_weight_config = db.query(Config).filter(Config.key == "sentiment_weight").first()
                if s_weight_config and s_weight_config.value is not None:
                    weight_sentiment = float(s_weight_config.value)

                d_weight_config = db.query(Config).filter(Config.key == "density_weight").first()
                if d_weight_config and d_weight_config.value is not None:
                    weight_density = float(d_weight_config.value)
            except Exception as e:
                logger.error(f"Error fetching configuration from database: {e}. Using defaults.")
                # Fallback to defaults already set above

        # Sentiment Analysis: map compound score [-1.0, 1.0] to [0.0, 1.0]
        try:
            sentiment_result = self.analyzer.polarity_scores(text)
            compound = sentiment_result.get("compound", 0.0)
            score_sentiment = (float(compound) + 1.0) / 2.0
        except Exception as e:
            logger.error(f"Error during sentiment analysis: {e}")
            score_sentiment = 0.5

        # Word Density: ratio of words to characters, normalized (avg ~0.2)
        try:
            clean_text = text.strip()
            words = clean_text.split()
            word_count = len(words)
            char_count = len(clean_text)
            
            # Prevent Division by Zero and handle empty string edge case
            if char_count > 0:
                # Normalization factor 5.0 assumes an average word length of 5 chars
                score_density = min((float(word_count) / float(char_count)) * 5.0, 1.0)
            else:
                score_density = 0.0
        except Exception as e:
            logger.error(f"Error during density calculation: {e}")
            score_density = 0.0

        # Weighted Calculation logic
        try:
            total_weight = weight_sentiment + weight_density
            if total_weight <= 0:
                logger.warning("Total weight is zero or negative. Returning neutral score.")
                return 0.5

            final_score = (score_sentiment * weight_sentiment + score_density * weight_density) / total_weight
            
            # Ensure result is within bounds [0.0, 1.0] and round to 4 decimal places
            return round(float(max(0.0, min(1.0, final_score))), 4)
        except Exception as e:
            logger.error(f"Error during final score aggregation: {e}")
            return 0.0