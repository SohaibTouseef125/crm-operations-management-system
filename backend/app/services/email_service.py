"""
Email sending service using aiosmtplib.
Sends invoice PDFs as email attachments.
"""

import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from typing import List

from app.core.config import settings
from app.models.billing import Invoice

logger = logging.getLogger(__name__)


async def send_invoice_email(
    invoice: Invoice,
    pdf_bytes: bytes,
    recipients: List[str],
    subject: str | None = None,
    message: str | None = None,
) -> None:
    """
    Send invoice PDF to a list of recipient email addresses via SMTP.

    Raises:
        RuntimeError: If SMTP credentials are not configured.
        Exception: If email delivery fails — caller should handle and return 502.
    """
    if not settings.SMTP_USER or not settings.SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP credentials are not configured. "
            "Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL in .env."
        )

    import aiosmtplib

    invoice_number = invoice.invoice_number or str(invoice.id)[:8].upper()
    email_subject = subject or f"Invoice #{invoice_number} from Crop2X"
    email_body = message or (
        f"Dear Client,\n\n"
        f"Please find attached Invoice #{invoice_number}.\n\n"
        f"Thank you for your business.\n\n"
        f"Best regards,\nCrop2X (Private) Limited"
    )

    msg = MIMEMultipart()
    msg["From"] = settings.SMTP_FROM_EMAIL
    msg["To"] = ", ".join(recipients)
    msg["Subject"] = email_subject

    msg.attach(MIMEText(email_body, "plain"))

    # Attach PDF
    pdf_attachment = MIMEApplication(pdf_bytes, _subtype="pdf")
    pdf_attachment.add_header(
        "Content-Disposition",
        "attachment",
        filename=f"invoice_{invoice_number}.pdf",
    )
    msg.attach(pdf_attachment)

    try:
        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info("Invoice %s sent to %s", invoice_number, recipients)
    except Exception as exc:
        logger.error("Failed to send invoice %s to %s: %s", invoice_number, recipients, exc)
        raise
