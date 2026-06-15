"""
PDF generation service using WeasyPrint + Jinja2.
"""

import io
from pathlib import Path
from typing import List
from decimal import Decimal

from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.models.billing import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.client import Client

# Resolve template directory relative to this file
_TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "templates"


def _get_jinja_env() -> Environment:
    return Environment(
        loader=FileSystemLoader(str(_TEMPLATE_DIR)),
        autoescape=select_autoescape(["html"]),
    )


def generate_invoice_pdf(
    invoice: Invoice,
    items: List[InvoiceItem],
    client: Client,
) -> bytes:
    """
    Render the invoice as a PDF and return raw bytes.
    Raises RuntimeError on failure.
    """
    try:
        from weasyprint import HTML
    except ImportError as exc:
        raise RuntimeError("weasyprint is not installed. Add it to requirements.txt.") from exc

    env = _get_jinja_env()
    template = env.get_template("invoice_pdf.html")

    # Calculate display values — fall back to legacy amount if no items
    subtotal = invoice.subtotal or Decimal("0")
    tax_percentage = invoice.tax_percentage or Decimal("15")
    tax_amount = invoice.tax_amount or Decimal("0")
    total_amount = invoice.total_amount or Decimal("0")

    if not items and invoice.amount:
        # Legacy invoice: show amount as total
        total_amount = invoice.amount
        subtotal = invoice.amount
        tax_amount = Decimal("0")

    html_content = template.render(
        invoice=invoice,
        items=items,
        client=client,
        subtotal=subtotal,
        tax_percentage=tax_percentage,
        tax_amount=tax_amount,
        total_amount=total_amount,
    )

    pdf_bytes = HTML(string=html_content, base_url=str(_TEMPLATE_DIR)).write_pdf()
    if not pdf_bytes:
        raise RuntimeError("PDF generation produced empty output")

    return pdf_bytes
