import logging
import os
from typing import Optional

import stripe
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from core.config import settings
from core.database import get_db
from dependencies.auth import get_current_user
from models.deposits import Deposits
from schemas.auth import UserResponse
from services.deposits import DepositsService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/payment", tags=["payment"])


class CreatePaymentSessionRequest(BaseModel):
    success_url: str = "/payment-success"
    cancel_url: str = "/deposit"
    amount: float
    currency: str = "USD"


class CreatePaymentSessionResponse(BaseModel):
    url: str
    session_id: str


class VerifyPaymentRequest(BaseModel):
    session_id: str


class VerifyPaymentResponse(BaseModel):
    status: str
    payment_status: str
    amount: Optional[float] = None
    currency: Optional[str] = None


def get_stripe_key():
    key = settings.stripe_secret_key
    if not key:
        raise HTTPException(status_code=500, detail="Stripe is not configured")
    return key


@router.post("/create_payment_session", response_model=CreatePaymentSessionResponse)
async def create_payment_session(
    data: CreatePaymentSessionRequest,
    current_user: UserResponse = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Create a Stripe checkout session for deposit"""
    try:
        stripe.api_key = get_stripe_key()

        frontend_url = os.environ.get("FRONTEND_URL", "")
        if not frontend_url:
            frontend_url = os.environ.get("APP_URL", "https://example.com")

        success_url = f"{frontend_url}{data.success_url}?session_id={{CHECKOUT_SESSION_ID}}"
        cancel_url = f"{frontend_url}{data.cancel_url}"

        amount_cents = int(data.amount * 100)

        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": data.currency.lower(),
                        "product_data": {
                            "name": f"TTB Exchange Deposit - {data.amount} {data.currency}",
                            "description": "إيداع أموال في حساب TTB Exchange",
                        },
                        "unit_amount": amount_cents,
                    },
                    "quantity": 1,
                }
            ],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={
                "user_id": str(current_user.id),
                "amount": str(data.amount),
                "currency": data.currency,
            },
        )

        deposit_service = DepositsService(db)
        await deposit_service.create(
            {
                "amount": data.amount,
                "currency": data.currency,
                "payment_method": "stripe",
                "stripe_session_id": session.id,
                "status": "pending",
            },
            user_id=str(current_user.id),
        )

        return CreatePaymentSessionResponse(
            url=session.url,
            session_id=session.id,
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating payment session: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify_payment", response_model=VerifyPaymentResponse)
async def verify_payment(
    data: VerifyPaymentRequest,
    db: AsyncSession = Depends(get_db),
):
    """Verify a Stripe payment session"""
    try:
        stripe.api_key = get_stripe_key()

        session = stripe.checkout.Session.retrieve(data.session_id)

        payment_status = session.payment_status or "unpaid"
        amount = (session.amount_total or 0) / 100.0
        currency = (session.currency or "usd").upper()

        if payment_status == "paid":
            # Find deposit by stripe_session_id using direct query
            query = select(Deposits).where(
                Deposits.stripe_session_id == data.session_id
            )
            result = await db.execute(query)
            deposit = result.scalar_one_or_none()

            if deposit and deposit.status != "completed":
                deposit.status = "completed"
                await db.commit()

        return VerifyPaymentResponse(
            status="paid" if payment_status == "paid" else "unpaid",
            payment_status=payment_status,
            amount=amount,
            currency=currency,
        )

    except stripe.error.StripeError as e:
        logger.error(f"Stripe error verifying payment: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error verifying payment: {e}")
        raise HTTPException(status_code=500, detail=str(e))