from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from sqlalchemy.orm import Session
from sqlalchemy import Column, String
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Config(Base):
    __tablename__ = "config"
    key = Column(String, primary_key=True)
    value = Column(String)

class SentimentEngine:
    def __init__(self):
        self.analyzer = SentimentIntensityAnalyzer()

    def calculate_score(self, db: Session, text: str) -> float:
        if not text or not text.strip():
            return 0.0

        try:
            s_weight_config = db.query(Config).filter(Config.key == "sentiment_weight").first()
            d_weight_config = db.query(Config).filter(Config.key == "density_weight").first()
            
            weight_sentiment = float(s_weight_config.value) if s_weight_config else 0.7
            weight_density = float(d_weight_config.value) if d_weight_config else 0.3
        except (Exception, ValueError):
            weight_sentiment = 0.7
            weight_density = 0.3

        # Sentiment Analysis: map compound score [-1.0, 1.0] to [0.0, 1.0]
        sentiment_result = self.analyzer.polarity_scores(text)
        score_sentiment = (sentiment_result["compound"] + 1) / 2

        # Word Density: ratio of words to characters, normalized (avg ~0.2)
        words = text.split()
        word_count = len(words)
        char_count = len(text)
        score_density = min((word_count / char_count) * 5.0, 1.0) if char_count > 0 else 0.0

        # Weighted calculation
        total_weight = weight_sentiment + weight_density
        if total_weight <= 0:
            return 0.0

        final_score = (score_sentiment * weight_sentiment + score_density * weight_density) / total_weight
        
        # Ensure result is within 0.0 - 1.0 and rounded
        return round(float(max(0.0, min(1.0, final_score))), 4)