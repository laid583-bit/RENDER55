from core.database import Base
from sqlalchemy import Column, DateTime, Float, Integer, String


class User_balances(Base):
    __tablename__ = "user_balances"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    user_id = Column(String, nullable=False)
    currency = Column(String, nullable=False)
    balance = Column(Float, nullable=False)
    updated_at = Column(DateTime(timezone=True), nullable=True)