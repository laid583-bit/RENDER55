from core.database import Base
from sqlalchemy import Boolean, Column, DateTime, Integer, String


class Currency_pairs(Base):
    __tablename__ = "currency_pairs"
    __table_args__ = {"extend_existing": True}

    id = Column(Integer, primary_key=True, index=True, autoincrement=True, nullable=False)
    base_currency = Column(String, nullable=False)
    quote_currency = Column(String, nullable=False)
    pair_name = Column(String, nullable=False)
    is_active = Column(Boolean, nullable=True)
    created_at = Column(DateTime(timezone=True), nullable=True)