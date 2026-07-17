import logging
import os
import httpx
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

# Fallback mock rates (approximate market values)
FALLBACK_RATES = {
    "XAU": {"USD": 3050.00, "EUR": 2810.00, "DZD": 411750.00},
    "XAG": {"USD": 34.50, "EUR": 31.80, "DZD": 4657.50},
    "OIL": {"USD": 78.50, "EUR": 72.35, "DZD": 10597.50},
    "XCU": {"USD": 4.25, "EUR": 3.92, "DZD": 573.75},
    "USD": {
        "EUR": 0.92, "GBP": 0.79, "JPY": 149.50, "NZD": 1.62,
        "DZD": 135.00, "USDT": 1.00,
        "BTC": 0.000015, "ETH": 0.00029, "DOGE": 5.88,
        "SOL": 0.0067, "SHIB": 66666.67, "PEPE": 100000.00,
        "NEAR": 0.167, "XAG": 0.029, "OIL": 0.01274, "XCU": 0.2353,
        "TSLA": 0.00385, "NVDA": 0.00833, "IXIC": 0.0000588,
    },
    "EUR": {
        "USD": 1.085, "GBP": 0.858, "JPY": 162.20, "NZD": 1.76,
        "DZD": 146.75,
        "BTC": 0.000016, "ETH": 0.000315,
    },
    "GBP": {"USD": 1.265, "EUR": 1.165, "JPY": 189.10, "NZD": 2.05, "DZD": 170.78},
    "DZD": {"USD": 0.00741, "EUR": 0.00681, "GBP": 0.00586},
    "USDT": {"USD": 1.00, "EUR": 0.92, "GBP": 0.79, "DZD": 135.00, "BTC": 0.000015, "ETH": 0.00029},
    "BTC": {"USD": 67000.00, "EUR": 61750.00, "DZD": 9045000.00, "USDT": 67000.00},
    "ETH": {"USD": 3450.00, "EUR": 3180.00, "DZD": 465750.00, "USDT": 3450.00},
    "DOGE": {"USD": 0.17, "EUR": 0.157, "DZD": 22.95, "USDT": 0.17},
    "SOL": {"USD": 149.00, "EUR": 137.35, "DZD": 20115.00, "USDT": 149.00},
    "SHIB": {"USD": 0.000015, "EUR": 0.0000138, "DZD": 0.002025, "USDT": 0.000015},
    "PEPE": {"USD": 0.00001, "EUR": 0.0000092, "DZD": 0.00135, "USDT": 0.00001},
    "NEAR": {"USD": 5.98, "EUR": 5.51, "DZD": 807.30, "USDT": 5.98},
    # Stocks (price per share in USD)
    "TSLA": {"USD": 260.00, "EUR": 239.63, "DZD": 35100.00},
    "NVDA": {"USD": 120.00, "EUR": 110.60, "DZD": 16200.00},
    "IXIC": {"USD": 17000.00, "EUR": 15668.20, "DZD": 2295000.00},
}

SPREAD = 0.001  # 0.1% spread


class RatesService:
    """Service for fetching live exchange rates"""

    def __init__(self):
        self.api_key = os.environ.get("FIXER_API_KEY", "")
        self.base_url = "http://data.fixer.io/api"

    async def get_fixer_rates(self, base: str = "EUR") -> Optional[Dict[str, float]]:
        """Fetch rates from Fixer.io API"""
        try:
            if not self.api_key:
                logger.warning("FIXER_API_KEY not set, using fallback rates")
                return None

            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.get(
                    f"{self.base_url}/latest",
                    params={
                        "access_key": self.api_key,
                        "format": 1,
                    }
                )
                data = response.json()
                if data.get("success"):
                    return data.get("rates", {})
                else:
                    logger.error(f"Fixer API error: {data.get('error', {})}")
                    return None
        except Exception as e:
            logger.error(f"Error fetching rates from Fixer: {e}")
            return None

    def _calculate_cross_rate(self, fixer_rates: Dict[str, float], base: str, quote: str) -> Optional[float]:
        """Calculate cross rate from EUR-based Fixer rates"""
        try:
            if base == "EUR":
                return fixer_rates.get(quote)
            if quote == "EUR":
                base_rate = fixer_rates.get(base)
                if base_rate:
                    return 1.0 / base_rate
                return None

            base_rate = fixer_rates.get(base)
            quote_rate = fixer_rates.get(quote)
            if base_rate and quote_rate:
                return quote_rate / base_rate
            return None
        except Exception:
            return None

    def _get_fallback_rate(self, base: str, quote: str) -> float:
        """Get fallback rate from mock data"""
        if base in FALLBACK_RATES and quote in FALLBACK_RATES[base]:
            return FALLBACK_RATES[base][quote]
        # Try inverse
        if quote in FALLBACK_RATES and base in FALLBACK_RATES[quote]:
            return 1.0 / FALLBACK_RATES[quote][base]
        # Try cross through USD
        if base in FALLBACK_RATES and "USD" in FALLBACK_RATES[base]:
            base_usd = FALLBACK_RATES[base]["USD"]
            if quote in FALLBACK_RATES and "USD" in FALLBACK_RATES[quote]:
                quote_usd = FALLBACK_RATES[quote]["USD"]
                return base_usd / quote_usd
            if "USD" in FALLBACK_RATES and quote in FALLBACK_RATES["USD"]:
                usd_quote = FALLBACK_RATES["USD"][quote]
                return base_usd * usd_quote
        return 1.0

    async def get_live_rates(self, pairs: list) -> list:
        """Get live rates for specified currency pairs"""
        fixer_rates = await self.get_fixer_rates()
        results = []

        for pair in pairs:
            base = pair.get("base_currency", "")
            quote = pair.get("quote_currency", "")

            mid_rate = None
            if fixer_rates:
                # Handle XAU (gold) - Fixer uses XAU
                mid_rate = self._calculate_cross_rate(fixer_rates, base, quote)

            if mid_rate is None:
                mid_rate = self._get_fallback_rate(base, quote)

            buy_price = mid_rate * (1 + SPREAD)
            sell_price = mid_rate * (1 - SPREAD)

            results.append({
                "pair_id": pair.get("id"),
                "pair_name": pair.get("pair_name", f"{base}/{quote}"),
                "base_currency": base,
                "quote_currency": quote,
                "mid_rate": round(mid_rate, 6),
                "buy_price": round(buy_price, 6),
                "sell_price": round(sell_price, 6),
                "spread": SPREAD,
                "is_live": fixer_rates is not None,
            })

        return results

    async def convert(
        self,
        from_currency: str,
        to_currency: str,
        amount: float,
        fee_amount: float = 0.0,
        fee_percentage: float = 0.0,
        fee_currency: str = "USD",
        is_base_to_quote: bool = True,
    ) -> Dict[str, Any]:
        """Convert currency with proper buy/sell price and fee deduction.

        Price logic (based on the pair's base→quote mid_rate):
        - If selling the base currency (base→quote, is_base_to_quote=True):
          Use sell_price = mid_rate * (1 - SPREAD)
          The user gets LESS of the quote currency.
        - If buying the base currency (quote→base, is_base_to_quote=False):
          Use buy_price = mid_rate * (1 + SPREAD)
          The user pays MORE of the quote currency per unit of base.
          effective_rate = 1 / buy_price

        Fee deduction:
        - If fee_percentage > 0, fee is calculated as percentage of converted_amount.
        - Otherwise, fee_amount is a fixed fee in fee_currency.
        - Fee is subtracted from converted_amount to get net_amount.
        """
        fixer_rates = await self.get_fixer_rates()

        mid_rate = None
        if fixer_rates:
            mid_rate = self._calculate_cross_rate(fixer_rates, from_currency, to_currency)

        if mid_rate is None:
            mid_rate = self._get_fallback_rate(from_currency, to_currency)

        # Apply spread based on direction
        if is_base_to_quote:
            effective_rate = mid_rate * (1 - SPREAD)
        else:
            effective_rate = mid_rate / (1 + SPREAD)

        converted_amount = amount * effective_rate

        # Calculate fee
        fee_in_target = 0.0
        if fee_percentage > 0:
            # Percentage-based fee: deduct percentage from converted amount
            fee_in_target = converted_amount * (fee_percentage / 100.0)
        elif fee_amount > 0:
            # Fixed fee: convert fee to target currency
            if fee_currency == to_currency:
                fee_in_target = fee_amount
            else:
                fee_rate = None
                if fixer_rates:
                    fee_rate = self._calculate_cross_rate(fixer_rates, fee_currency, to_currency)
                if fee_rate is None:
                    fee_rate = self._get_fallback_rate(fee_currency, to_currency)
                fee_in_target = fee_amount * fee_rate

        net_amount = converted_amount - fee_in_target
        if net_amount < 0:
            net_amount = 0.0

        return {
            "from_currency": from_currency,
            "to_currency": to_currency,
            "amount": amount,
            "exchange_rate": round(effective_rate, 6),
            "converted_amount": round(converted_amount, 6),
            "fee_amount": round(fee_in_target, 6),
            "fee_percentage": round(fee_percentage, 2),
            "fee_fixed_amount": round(fee_amount, 6),
            "net_amount": round(net_amount, 6),
            "is_live": fixer_rates is not None,
        }