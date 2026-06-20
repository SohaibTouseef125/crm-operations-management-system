import logging
import base64
from typing import List

import resend

from app.core.config import settings
from app.models.billing import Invoice
from app.models.quotation import Quotation

logger = logging.getLogger(__name__)


async def send_invoice_email(
    invoice: Invoice,
    pdf_bytes: bytes,
    recipients: List[str],
    subject: str | None = None,
    message: str | None = None,
) -> None:
    if not settings.RESEND_API_KEY:
        raise RuntimeError(
            "Resend API key is not configured. "
            "Set RESEND_API_KEY in .env."
        )

    resend.api_key = settings.RESEND_API_KEY

    invoice_number = invoice.invoice_number or str(invoice.id)[:8].upper()
    email_subject = subject or f"Invoice #{invoice_number} from Crop2X"
    email_body = message or (
        f"Dear Client,\n\n"
        f"Please find attached Invoice #{invoice_number}.\n\n"
        f"Thank you for your business.\n\n"
        f"Best regards,\nCrop2X (Private) Limited"
    )

    pdf_b64 = base64.b64encode(pdf_bytes).decode()

    params = {
        "from": settings.FROM_EMAIL,
        "to": recipients,
        "subject": email_subject,
        "text": email_body,
        "attachments": [
            {
                "filename": f"invoice_{invoice_number}.pdf",
                "content": pdf_b64,
            }
        ],
    }

    try:
        resend.Emails.send(params)
        logger.info("Invoice %s sent to %s", invoice_number, recipients)
    except Exception as exc:
        logger.error("Failed to send invoice %s to %s: %s", invoice_number, recipients, exc)
        raise


async def send_quotation_email(
    quotation: Quotation,
    pdf_bytes: bytes,
    recipients: List[str],
    subject: str | None = None,
    message: str | None = None,
) -> None:
    if not settings.RESEND_API_KEY:
        raise RuntimeError(
            "Resend API key is not configured. "
            "Set RESEND_API_KEY in .env."
        )

    resend.api_key = settings.RESEND_API_KEY

    email_subject = subject or f"Quotation {quotation.quote_number} from Crop2X"
    email_body = message or (
        f"Dear Client,\n\n"
        f"Please find attached Quotation {quotation.quote_number}.\n\n"
        f"Thank you for your interest.\n\n"
        f"Best regards,\nCrop2X (Private) Limited"
    )

    pdf_b64 = base64.b64encode(pdf_bytes).decode()

    params = {
        "from": settings.FROM_EMAIL,
        "to": recipients,
        "subject": email_subject,
        "text": email_body,
        "attachments": [
            {
                "filename": f"quotation_{quotation.quote_number}.pdf",
                "content": pdf_b64,
            }
        ],
    }

    try:
        resend.Emails.send(params)
        logger.info("Quotation %s sent to %s", quotation.quote_number, recipients)
    except Exception as exc:
        logger.error("Failed to send quotation %s to %s: %s", quotation.quote_number, recipients, exc)
        raise
