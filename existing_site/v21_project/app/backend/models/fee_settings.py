from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Fee_settings(Base):
    __tablename__ = "fee_settings"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    pair_id = Column(Integer, nullable=False)
    fee_amount = Column(Float, nullable=False)
    fee_percentage = Column(Float, nullable=True, default=0.0)
    fee_currency = Column(String, nullable=False)
    deposit_currency = Column(String, nullable=True)
    updated_at = Column(DateTime(timezone=True), nullable=True)