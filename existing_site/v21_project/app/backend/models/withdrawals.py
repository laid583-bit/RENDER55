from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class Withdrawals(Base):
    __tablename__ = "withdrawals"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    payment_method = Column(String, nullable=False)
    wallet_address = Column(String, nullable=True)
    status = Column(String, nullable=False)
    notes = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)