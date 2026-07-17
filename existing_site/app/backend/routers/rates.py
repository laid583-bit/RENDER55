import logging
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from services.rates_service import RatesService
from services.currency_pairs import Currency_pairsService
from services.fee_settings import Fee_settingsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/rates", tags=["rates"])


class RateItem(BaseModel):
    pair_id: Optional[int] = None
    pair_name: str
    base_currency: str
    quote_currency: str
    mid_rate: float
    buy_price: float
    sell_price: float
    spread: float
    is_live: bool


class LiveRatesResponse(BaseModel):
    rates: list[RateItem]
    timestamp: str


class ConvertRequest(BaseModel):
    from_currency: str
    to_currency: str
    amount: float


class ConvertResponse(BaseModel):
    from_currency: str
    to_currency: str
    amount: float
    exchange_rate: float
    converted_amount: float
    fee_amount: float
    fee_percentage: float = 0.0
    fee_fixed_amount: float = 0.0
    net_amount: float
    is_live: bool


@router.get("/live", response_model=LiveRatesResponse)
async def get_live_rates(db: AsyncSession = Depends(get_db)):
    """Get live exchange rates for all active currency pairs"""
    try:
        pairs_service = Currency_pairsService(db)
        result = await pairs_service.get_list(limit=100, query_dict={"is_active": True})
        pairs = result.get("items", [])

        pair_dicts = []
        for p in pairs:
            pair_dicts.append({
                "id": p.id,
                "base_currency": p.base_currency,
                "quote_currency": p.quote_currency,
                "pair_name": p.pair_name,
            })

        rates_service = RatesService()
        rates = await rates_service.get_live_rates(pair_dicts)

        from datetime import datetime, timezone
        return LiveRatesResponse(
            rates=rates,
            timestamp=datetime.now(timezone.utc).isoformat()
        )
    except Exception as e:
        logger.error(f"Error fetching live rates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/convert", response_model=ConvertResponse)
async def convert_currency(
    data: ConvertRequest,
    db: AsyncSession = Depends(get_db),
):
    """Convert currency amount using live rates.

    Determines the conversion direction relative to the stored pair:
    - If from=base, to=quote → is_base_to_quote=True (sell base, use sell_price)
    - If from=quote, to=base → is_base_to_quote=False (buy base, use buy_price)

    Fee logic:
    - If fee_percentage > 0, uses percentage-based fee
    - Otherwise falls back to fixed fee_amount
    """
    try:
        pairs_service = Currency_pairsService(db)
        fee_service = Fee_settingsService(db)

        all_pairs = await pairs_service.get_list(limit=100)
        fee_amount = 0.0
        fee_percentage = 0.0
        fee_currency = "USD"
        is_base_to_quote = True  # default
        pair_found = False

        for p in all_pairs.get("items", []):
            if p.base_currency == data.from_currency and p.quote_currency == data.to_currency:
                # Forward: selling base currency (base→quote)
                is_base_to_quote = True
                pair_found = True
                fees = await fee_service.get_list(query_dict={"pair_id": p.id})
                fee_items = fees.get("items", [])
                if fee_items:
                    fee_percentage = getattr(fee_items[0], "fee_percentage", 0.0) or 0.0
                    fee_amount = getattr(fee_items[0], "fee_amount", 0.0) or 0.0
                    fee_currency = getattr(fee_items[0], "fee_currency", "USD") or "USD"
                break
            elif p.quote_currency == data.from_currency and p.base_currency == data.to_currency:
                # Reverse: buying base currency (quote→base)
                is_base_to_quote = False
                pair_found = True
                fees = await fee_service.get_list(query_dict={"pair_id": p.id})
                fee_items = fees.get("items", [])
                if fee_items:
                    fee_percentage = getattr(fee_items[0], "fee_percentage", 0.0) or 0.0
                    fee_amount = getattr(fee_items[0], "fee_amount", 0.0) or 0.0
                    fee_currency = getattr(fee_items[0], "fee_currency", "USD") or "USD"
                break

        # For non-DB pairs, apply default percentage fee (0.33%)
        if not pair_found:
            fee_percentage = 0.33

        rates_service = RatesService()
        result = await rates_service.convert(
            from_currency=data.from_currency,
            to_currency=data.to_currency,
            amount=data.amount,
            fee_amount=fee_amount,
            fee_percentage=fee_percentage,
            fee_currency=fee_currency,
            is_base_to_quote=is_base_to_quote,
        )

        return ConvertResponse(**result)
    except Exception as e:
        logger.error(f"Error converting currency: {e}")
        raise HTTPException(status_code=500, detail=str(e))