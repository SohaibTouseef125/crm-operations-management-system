"""
Overdue invoice detection service.
Transitions SENT invoices past their due_date to OVERDUE status.
Designed to run as a daily background job via APScheduler.
"""

import logging
from datetime import date, timezone, datetime

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update

from app.models.billing import Invoice, InvoiceStatus
from app.database.session import AsyncSessionLocal

logger = logging.getLogger(__name__)


async def mark_overdue_invoices(db: AsyncSession) -> int:
    """
    Mark all SENT invoices where due_date < today as OVERDUE.
    Returns the count of invoices updated.
    """
    today = datetime.now(timezone.utc).date()

    result = await db.execute(
        update(Invoice)
        .where(
            Invoice.status == InvoiceStatus.SENT,
            Invoice.due_date < today,
        )
        .values(status=InvoiceStatus.OVERDUE)
        .returning(Invoice.id)
    )
    updated_ids = result.fetchall()
    count = len(updated_ids)

    if count > 0:
        await db.commit()
        logger.info("Overdue detector: marked %d invoices as OVERDUE", count)
    else:
        logger.info("Overdue detector: no invoices to mark as OVERDUE")

    return count


async def run_overdue_job() -> None:
    """
    Entry point for APScheduler. Creates its own DB session.
    """
    try:
        async with AsyncSessionLocal() as db:
            count = await mark_overdue_invoices(db)
            logger.info("Overdue job completed: %d invoices updated", count)
    except Exception as exc:
        logger.error("Overdue job failed: %s", exc, exc_info=True)
