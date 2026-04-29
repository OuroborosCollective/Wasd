from sqlalchemy import Column, Integer, String, JSON, Float, ForeignKey, DateTime, Boolean, create_engine
from sqlalchemy.orm import DeclarativeBase, relationship, sessionmaker
from datetime import datetime

class Base(DeclarativeBase):
    pass

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    platform = Column(String, index=True)
    profile_data = Column(JSON)
    score = Column(Float, default=0.0)
    status = Column(String, default="new")
    interactions = relationship("Interaction", back_populates="lead")

class Config(Base):
    __tablename__ = "configs"
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String, unique=True, index=True)
    value = Column(JSON)

class Interaction(Base):
    __tablename__ = "interactions"
    id = Column(Integer, primary_key=True, index=True)
    lead_id = Column(Integer, ForeignKey("leads.id"))
    type = Column(String)
    success = Column(Boolean, default=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    lead = relationship("Lead", back_populates="interactions")

DATABASE_URL = "sqlite:///./app.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def init_db():
    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()