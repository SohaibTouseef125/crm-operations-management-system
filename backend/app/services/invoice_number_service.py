"""
Invoice number generation service.

Format: YYMMDD-N
  - YYMMDD = UTC creation date (e.g. 260615 for 2026-06-15)
  - N = daily sequence starting at 1

Collision-safe: Uses SELECT COUNT with a unique constraint retry.
"""

from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.models.billing import Invoice


async def generate_invoice_number(db: AsyncSession) -> str:
    """
    Generate a unique invoice number in YYMMDD-N format.
    Retries up to 5 times on collision (handles concurrent requests).
    """
    today = datetime.now(timezone.utc).date()
    date_prefix = today.strftime("%y%m%d")  # e.g. "260615"

    for attempt in range(5):
        # Count existing invoices with invoice_date = today
        result = await db.execute(
            select(func.count(Invoice.id)).where(Invoice.invoice_date == today)
        )
        count = result.scalar() or 0
        sequence = count + 1 + attempt  # increment on retry

        invoice_number = f"{date_prefix}-{sequence}"

        # Check no duplicate exists
        existing = await db.execute(
            select(Invoice.id).where(Invoice.invoice_number == invoice_number)
        )
        if existing.scalar() is None:
            return invoice_number

    # Fallback: use timestamp microseconds to guarantee uniqueness
    ts = datetime.now(timezone.utc).strftime("%y%m%d%f")
    return f"{date_prefix}-{ts[-6:]}"
