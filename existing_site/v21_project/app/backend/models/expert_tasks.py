from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Expert_tasks(Base):
    __tablename__ = "expert_tasks"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    from_currency = Column(String, nullable=False)
    to_currency = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    status = Column(String, nullable=False)
    executed_count = Column(Integer, nullable=True)
    skipped_count = Column(Integer, nullable=True)
    total_fees = Column(String, nullable=True)
    last_rate = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)