"""
PDF generation service using ReportLab (pure Python — no system dependencies).
Generates a professional Crop2X-branded invoice PDF.
"""

import io
from decimal import Decimal
from typing import List

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph,
    Spacer, HRFlowable,
)
from reportlab.lib.enums import TA_RIGHT, TA_CENTER, TA_LEFT

from app.models.billing import Invoice
from app.models.invoice_item import InvoiceItem
from app.models.client import Client

# ── Brand colours ──────────────────────────────────────────────────────────
BRAND_BLUE  = colors.HexColor("#1d4ed8")
BRAND_LIGHT = colors.HexColor("#eff6ff")
BRAND_GREEN = colors.HexColor("#16a34a")
GREY_TEXT   = colors.HexColor("#374151")
GREY_LIGHT  = colors.HexColor("#f9fafb")
GREY_BORDER = colors.HexColor("#e5e7eb")


def _styles():
    base = getSampleStyleSheet()
    return {
        "company": ParagraphStyle("company", fontSize=20, textColor=BRAND_BLUE,
                                  fontName="Helvetica-Bold", spaceAfter=2,
                                  spaceBefore=0),
        "company_sub": ParagraphStyle("company_sub", fontSize=9, textColor=GREY_TEXT,
                                      fontName="Helvetica", spaceBefore=0),
        "invoice_title": ParagraphStyle("invoice_title", fontSize=18, textColor=BRAND_BLUE,
                                        fontName="Helvetica-Bold", alignment=TA_RIGHT,
                                        spaceBefore=0),
        "invoice_meta": ParagraphStyle("invoice_meta", fontSize=9, textColor=GREY_TEXT,
                                       fontName="Helvetica", alignment=TA_RIGHT, leading=14),
        "section_head": ParagraphStyle("section_head", fontSize=8, textColor=GREY_TEXT,
                                       fontName="Helvetica-Bold",
                                       textTransform="uppercase", spaceBefore=4),
        "body":   ParagraphStyle("body",   fontSize=9, textColor=GREY_TEXT,
                                 fontName="Helvetica", leading=14),
        "bold":   ParagraphStyle("bold",   fontSize=9, textColor=GREY_TEXT,
                                 fontName="Helvetica-Bold", leading=14),
        "small":  ParagraphStyle("small",  fontSize=8, textColor=GREY_TEXT,
                                 fontName="Helvetica", leading=12),
        "total":  ParagraphStyle("total",  fontSize=11, textColor=colors.white,
                                 fontName="Helvetica-Bold", alignment=TA_RIGHT),
        "footer": ParagraphStyle("footer", fontSize=8, textColor=colors.HexColor("#9ca3af"),
                                 fontName="Helvetica", alignment=TA_CENTER),
    }


def generate_invoice_pdf(
    invoice: Invoice,
    items: List[InvoiceItem],
    client: Client,
) -> bytes:
    """Generate a Crop2X-branded invoice PDF and return raw bytes."""

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=18 * mm,
        rightMargin=18 * mm,
        topMargin=0 * mm,
        bottomMargin=14 * mm,
    )

    S = _styles()
    W = A4[0] - 36 * mm   # usable width
    story = []
    story.append(Spacer(1, 6))  # 6pt top breathing room

    # ── Header: Company left | Invoice right ────────────────────────────────
    invoice_number = invoice.invoice_number or f"INV-{str(invoice.id)[:8].upper()}"
    inv_date = invoice.invoice_date.strftime("%d/%m/%Y") if invoice.invoice_date else "—"
    due_date = invoice.due_date.strftime("%d/%m/%Y") if invoice.due_date else "—"

    # Left cell — company block
    company_block = Table(
        [
            [Paragraph("Crop2X (Private) Limited", S["company"])],
            [Paragraph("NTN: A278468  |  SNTN: A278468-8", S["company_sub"])],
        ],
        colWidths=[W * 0.55],
    )
    company_block.setStyle(TableStyle([
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (0, 0), 0),
        ("TOPPADDING",   (0, 1), (0, 1), 1),
        ("BOTTOMPADDING",(0, 0), (-10, -10), 1),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
    ]))

    # Right cell — invoice title + meta block
    invoice_block = Table(
        [
            [Paragraph("INVOICE", S["invoice_title"])],
            [Paragraph(
                f"<b>#{invoice_number}</b><br/>"
                f"Invoice Date: {inv_date}<br/>"
                f"Due Date: {due_date}<br/>"
                f"Status: {invoice.status.value}",
                S["invoice_meta"],
            )],
        ],
        colWidths=[W * 0.45],
    )
    invoice_block.setStyle(TableStyle([
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 1),
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
    ]))

    header_tbl = Table(
        [[company_block, invoice_block]],
        colWidths=[W * 0.55, W * 0.45],
    )
    header_tbl.setStyle(TableStyle([
        ("VALIGN",       (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ]))
    story.append(header_tbl)
    story.append(HRFlowable(width="100%", thickness=2, color=BRAND_BLUE, spaceAfter=8))

    # ── Bill To ──────────────────────────────────────────────────────────────
    story.append(Paragraph("Prepared For", S["section_head"]))
    story.append(Spacer(1, 2))
    bill_lines = [f"<b>{client.company_name}</b>"]
    if client.address:
        bill_lines.append(client.address)
    if client.contact_info:
        bill_lines.append(f"Tel: {client.contact_info}")
    bill_text = "<br/>".join(bill_lines)

    bill_tbl = Table([[Paragraph(bill_text, S["body"])]], colWidths=[W])
    bill_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, -1), BRAND_LIGHT),
        ("LEFTPADDING",   (0, 0), (-1, -1), 10),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 10),
        ("TOPPADDING",    (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEAFTER",     (0, 0), (0, -1),  2, BRAND_BLUE),
    ]))
    story.append(bill_tbl)
    story.append(Spacer(1, 10))

    # ── Items Table ──────────────────────────────────────────────────────────
    story.append(Paragraph("Services / Items", S["section_head"]))
    story.append(Spacer(1, 3))

    col_widths = [12 * mm, W * 0.35, W * 0.35, W - 12 * mm - W * 0.35 - W * 0.35]
    thead = [
        Paragraph("S.No", S["small"]),
        Paragraph("Item", S["small"]),
        Paragraph("Description", S["small"]),
        Paragraph("Price (PKR)", ParagraphStyle("th_r", fontSize=8, fontName="Helvetica-Bold",
                                                 textColor=GREY_TEXT, alignment=TA_RIGHT)),
    ]
    rows = [thead]

    if items:
        for item in sorted(items, key=lambda x: x.serial_number):
            rows.append([
                Paragraph(str(item.serial_number), S["small"]),
                Paragraph(item.item_name, S["bold"]),
                Paragraph(item.description or "", S["small"]),
                Paragraph(f"{int(item.unit_price):,}", ParagraphStyle(
                    "price", fontSize=9, fontName="Helvetica-Bold",
                    textColor=GREY_TEXT, alignment=TA_RIGHT)),
            ])
    else:
        rows.append([Paragraph("—", S["small"]), Paragraph("No items", S["small"]),
                     Paragraph("", S["small"]), Paragraph("—", S["small"])])

    items_tbl = Table(rows, colWidths=col_widths, repeatRows=1)
    items_style = [
        ("BACKGROUND",    (0, 0), (-1, 0),  BRAND_BLUE),
        ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
        ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
        ("FONTSIZE",      (0, 0), (-1, 0),  8),
        ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.white, GREY_LIGHT]),
        ("GRID",          (0, 0), (-1, -1), 0.3, GREY_BORDER),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 6),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 6),
        ("VALIGN",        (0, 0), (-1, -1), "TOP"),
    ]
    items_tbl.setStyle(TableStyle(items_style))
    story.append(items_tbl)
    story.append(Spacer(1, 6))

    # ── Totals ───────────────────────────────────────────────────────────────
    subtotal    = float(invoice.subtotal    or invoice.amount or 0)
    tax_pct     = float(invoice.tax_percentage or 0)
    tax_amount  = float(invoice.tax_amount  or 0)
    total       = float(invoice.total_amount or invoice.amount or 0)

    def _money(n): return f"{int(n):,}"

    totals_data = [
        [Paragraph("Total", S["body"]),
         Paragraph(_money(subtotal), ParagraphStyle("tr", fontSize=9, fontName="Helvetica",
                                                     textColor=GREY_TEXT, alignment=TA_RIGHT))],
        [Paragraph(f"Sales Tax ({tax_pct:.0f}%)", S["body"]),
         Paragraph(_money(tax_amount), ParagraphStyle("tr", fontSize=9, fontName="Helvetica",
                                                       textColor=GREY_TEXT, alignment=TA_RIGHT))],
        [Paragraph("<b>Total Budget (incl. Sales Tax)</b>",
                   ParagraphStyle("tbold", fontSize=10, fontName="Helvetica-Bold",
                                  textColor=colors.white)),
         Paragraph(f"<b>{_money(total)} /-</b>",
                   ParagraphStyle("tright", fontSize=10, fontName="Helvetica-Bold",
                                  textColor=colors.white, alignment=TA_RIGHT))],
    ]
    totals_tbl = Table(totals_data, colWidths=[W * 0.7, W * 0.3])
    totals_tbl.setStyle(TableStyle([
        ("BACKGROUND",    (0, 0), (-1, 1),  GREY_LIGHT),
        ("BACKGROUND",    (0, 2), (-1, 2),  BRAND_BLUE),
        ("TOPPADDING",    (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING",   (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
        ("LINEABOVE",     (0, 2), (-1, 2),  1, BRAND_BLUE),
    ]))

    # Right-align totals block
    outer = Table([[None, totals_tbl]], colWidths=[W * 0.4, W * 0.6])
    outer.setStyle(TableStyle([
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
    ]))
    story.append(outer)
    story.append(Spacer(1, 14))

    # ── Notes ────────────────────────────────────────────────────────────────
    if invoice.notes:
        story.append(Paragraph("Notes", S["section_head"]))
        story.append(Paragraph(invoice.notes, S["body"]))
        story.append(Spacer(1, 8))

    # ── Terms & Bank side by side ─────────────────────────────────────────
    payment_terms = invoice.payment_terms or (
        "Payment can be made in the form of Cheque to the favour of Crop2X Pvt Ltd. "
        "The Quotation is valid for 30 days."
    )
    bank_details = invoice.bank_details or (
        "Meezan Bank, Title: Crop2X (Private) Limited, "
        "Account no: 9952-0105470950, IBAN: PK14MEZN0099520105470950"
    )

    def _box(title, body, bg):
        inner = Table([
            [Paragraph(title, ParagraphStyle("bh", fontSize=8, fontName="Helvetica-Bold",
                                              textColor=BRAND_BLUE if bg == BRAND_LIGHT else BRAND_GREEN))],
            [Paragraph(body, S["small"])],
        ], colWidths=[(W - 8 * mm) / 2])
        inner.setStyle(TableStyle([
            ("BACKGROUND",    (0, 0), (-1, -1), bg),
            ("TOPPADDING",    (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING",   (0, 0), (-1, -1), 8),
            ("RIGHTPADDING",  (0, 0), (-1, -1), 8),
            ("ROUNDEDCORNERS",(0, 0), (-1, -1), 3),
        ]))
        return inner

    bottom = Table(
        [[_box("Terms & Conditions", payment_terms, BRAND_LIGHT),
          _box("Crop2X Account Details", bank_details,
               colors.HexColor("#f0fdf4"))]],
        colWidths=[(W - 8 * mm) / 2, (W - 8 * mm) / 2],
        spaceBefore=0,
    )
    bottom.setStyle(TableStyle([
        ("LEFTPADDING",  (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING",   (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 0),
        ("COLPADDING",   (0, 0), (-1, -1), 4),
    ]))
    story.append(bottom)
    story.append(Spacer(1, 16))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.5, color=GREY_BORDER, spaceAfter=4))
    story.append(Paragraph(
        "Generated by Crop2X CRM  |  Crop2X (Private) Limited  |  NTN: A278468",
        S["footer"],
    ))

    doc.build(story)
    return buf.getvalue()
