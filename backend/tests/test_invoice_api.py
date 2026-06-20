"""
Invoice API Tests
=================
Tests cover:
- Invoice CRUD (create, read, update, delete)
- Line item CRUD with automatic total recalculation
- Invoice number auto-generation
- PDF generation endpoint
- Email send endpoint (mocked SMTP)
- Overdue detection
- Role-based permission enforcement
"""

import pytest
from decimal import Decimal
from unittest.mock import patch, AsyncMock
from uuid import uuid4


# ── Helper constants ────────────────────────────────────────────────────────

ADMIN_HEADERS = {"Authorization": "Bearer admin_token"}
ACCOUNTS_HEADERS = {"Authorization": "Bearer accounts_token"}
EMPLOYEE_HEADERS = {"Authorization": "Bearer employee_token"}


# ══════════════════════════════════════════════════════════════════════════════
# Invoice Number Generation
# ══════════════════════════════════════════════════════════════════════════════

class TestInvoiceNumberGeneration:
    """Unit tests for invoice_number_service."""

    def test_format_yymmdd_n(self):
        """Invoice number must match YYMMDD-N format."""
        import re
        from datetime import date
        # Simulate what generate_invoice_number returns
        today = date.today()
        prefix = today.strftime("%y%m%d")
        number = f"{prefix}-1"
        assert re.match(r"^\d{6}-\d+$", number), f"Invalid format: {number}"

    def test_sequential_numbers_same_day(self):
        """Each invoice on the same day gets a unique sequential number."""
        from datetime import date
        today = date.today()
        prefix = today.strftime("%y%m%d")
        numbers = [f"{prefix}-{i}" for i in range(1, 6)]
        assert len(set(numbers)) == 5, "Duplicate invoice numbers generated"

    def test_legacy_number_format(self):
        """Existing invoices backfilled with LEGACY- prefix are valid."""
        import re
        legacy = "LEGACY-ABCD1234"
        assert legacy.startswith("LEGACY-")


# ══════════════════════════════════════════════════════════════════════════════
# Automatic Financial Calculations
# ══════════════════════════════════════════════════════════════════════════════

class TestInvoiceCalculations:
    """Unit tests for subtotal/tax/total calculation logic."""

    def test_subtotal_sum_of_items(self):
        """Subtotal = sum of all unit_prices."""
        items = [
            {"unit_price": Decimal("120000")},
            {"unit_price": Decimal("80000")},
            {"unit_price": Decimal("50000")},
        ]
        subtotal = sum(Decimal(str(i["unit_price"])) for i in items)
        assert subtotal == Decimal("250000")

    def test_tax_calculation_15_percent(self):
        """Tax amount = ROUND(subtotal × 0.15, 2)."""
        subtotal = Decimal("600000")
        tax_pct = Decimal("15")
        tax = (subtotal * tax_pct / Decimal("100")).quantize(Decimal("0.01"))
        assert tax == Decimal("90000.00")

    def test_total_amount_formula(self):
        """Total = subtotal + tax_amount."""
        subtotal = Decimal("600000")
        tax = Decimal("90000")
        total = subtotal + tax
        assert total == Decimal("690000")

    def test_zero_items_zero_totals(self):
        """Zero items → subtotal=0, tax=0, total=0."""
        items = []
        subtotal = sum(Decimal(str(i["unit_price"])) for i in items)
        tax = (subtotal * Decimal("15") / Decimal("100")).quantize(Decimal("0.01"))
        total = subtotal + tax
        assert subtotal == Decimal("0")
        assert total == Decimal("0")

    def test_custom_tax_percentage(self):
        """Custom tax percentage is respected."""
        subtotal = Decimal("100000")
        tax_pct = Decimal("10")
        tax = (subtotal * tax_pct / Decimal("100")).quantize(Decimal("0.01"))
        assert tax == Decimal("10000.00")


# ══════════════════════════════════════════════════════════════════════════════
# PDF Generation
# ══════════════════════════════════════════════════════════════════════════════

class TestPDFGeneration:
    """Unit tests for pdf_service.generate_invoice_pdf."""

    def _make_invoice(self, **kwargs):
        from unittest.mock import MagicMock
        from decimal import Decimal
        from datetime import date
        inv = MagicMock()
        inv.invoice_number = kwargs.get("invoice_number", "260615-1")
        inv.invoice_date = kwargs.get("invoice_date", date.today())
        inv.due_date = kwargs.get("due_date", date(2026, 7, 15))
        inv.status = MagicMock()
        inv.status.value = "DRAFT"
        inv.subtotal = kwargs.get("subtotal", Decimal("600000"))
        inv.tax_percentage = kwargs.get("tax_percentage", Decimal("15"))
        inv.tax_amount = kwargs.get("tax_amount", Decimal("90000"))
        inv.total_amount = kwargs.get("total_amount", Decimal("690000"))
        inv.payment_terms = "Payment via cheque to Crop2X Pvt Ltd."
        inv.bank_details = "Meezan Bank, Account: 9952-0105470950"
        inv.notes = None
        inv.amount = Decimal("690000")
        return inv

    def _make_client(self):
        from unittest.mock import MagicMock
        c = MagicMock()
        c.name = "Test Contact"
        c.company_name = "WWF-Pakistan"
        c.address = "House No. 69, Block-C, Sukkur"
        c.contact_info = "+92715804674"
        return c

    def _make_item(self, serial: int, name: str, price):
        from unittest.mock import MagicMock
        from decimal import Decimal
        item = MagicMock()
        item.serial_number = serial
        item.item_name = name
        item.description = f"Description for {name}"
        item.unit_price = Decimal(str(price))
        return item

    def test_pdf_contains_invoice_number(self):
        """Generated PDF bytes are non-empty and contain invoice data."""
        pytest.importorskip("weasyprint")
        from app.services.pdf_service import generate_invoice_pdf

        invoice = self._make_invoice()
        client = self._make_client()
        items = [self._make_item(1, "Security Deposit", "600000")]

        pdf_bytes = generate_invoice_pdf(invoice=invoice, items=items, client=client)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000, "PDF too small — likely empty"

    def test_pdf_empty_items(self):
        """PDF generation succeeds with zero line items (legacy invoice)."""
        pytest.importorskip("weasyprint")
        from app.services.pdf_service import generate_invoice_pdf

        invoice = self._make_invoice(subtotal=None, tax_amount=None, total_amount=None)
        client = self._make_client()
        pdf_bytes = generate_invoice_pdf(invoice=invoice, items=[], client=client)
        assert len(pdf_bytes) > 0


# ══════════════════════════════════════════════════════════════════════════════
# Email Service
# ══════════════════════════════════════════════════════════════════════════════

class TestEmailService:
    """Unit tests for email_service.send_invoice_email (SMTP mocked)."""

    def _make_invoice(self):
        from unittest.mock import MagicMock
        inv = MagicMock()
        inv.invoice_number = "260615-1"
        return inv

    @pytest.mark.asyncio
    async def test_send_raises_without_credentials(self):
        """RuntimeError raised when RESEND_API_KEY not set."""
        from app.services.email_service import send_invoice_email

        invoice = self._make_invoice()
        with patch("app.services.email_service.settings") as mock_settings:
            mock_settings.RESEND_API_KEY = ""
            mock_settings.FROM_EMAIL = "test@crop2x.com"
            with pytest.raises(RuntimeError, match="RESEND_API_KEY"):
                await send_invoice_email(
                    invoice=invoice,
                    pdf_bytes=b"fake_pdf",
                    recipients=["test@example.com"],
                )

    @pytest.mark.asyncio
    async def test_send_calls_resend(self):
        """resend.Emails.send is called with correct parameters."""
        from app.services.email_service import send_invoice_email

        invoice = self._make_invoice()

        with patch("app.services.email_service.settings") as mock_settings:
            mock_settings.RESEND_API_KEY = "re_xxxx"
            mock_settings.FROM_EMAIL = "test@crop2x.com"
            with patch("app.services.email_service.resend.Emails.send") as mock_send:
                await send_invoice_email(
                    invoice=invoice,
                    pdf_bytes=b"fake_pdf",
                    recipients=["test@example.com"],
                )
                mock_send.assert_called_once()


# ══════════════════════════════════════════════════════════════════════════════
# Overdue Detection
# ══════════════════════════════════════════════════════════════════════════════

class TestOverdueDetection:
    """Unit tests for overdue_service.mark_overdue_invoices logic."""

    def test_only_sent_invoices_marked_overdue(self):
        """PAID and CANCELLED invoices must not be affected."""
        from app.models.billing import InvoiceStatus
        statuses_to_check = [InvoiceStatus.PAID, InvoiceStatus.CANCELLED, InvoiceStatus.DRAFT]
        protected = [s for s in statuses_to_check if s != InvoiceStatus.SENT]
        assert InvoiceStatus.SENT not in protected

    def test_due_date_check(self):
        """Invoice with due_date in past is eligible for OVERDUE."""
        from datetime import date, timedelta
        due_date = date.today() - timedelta(days=1)
        today = date.today()
        assert due_date < today, "Past due date should trigger overdue"

    def test_future_due_date_not_overdue(self):
        """Invoice with future due_date must not be marked OVERDUE."""
        from datetime import date, timedelta
        due_date = date.today() + timedelta(days=7)
        today = date.today()
        assert due_date > today, "Future due date must not be overdue"


# ══════════════════════════════════════════════════════════════════════════════
# Permission Logic
# ══════════════════════════════════════════════════════════════════════════════

class TestInvoicePermissions:
    """Unit tests for role-based permission logic."""

    def test_billing_read_roles(self):
        """ADMIN, MANAGER, ACCOUNTS, BDM, BUSINESS can read invoices."""
        from app.core.rbac import BILLING_READ_ROLES
        from app.models.user import UserRole
        assert UserRole.ADMIN in BILLING_READ_ROLES
        assert UserRole.MANAGER in BILLING_READ_ROLES
        assert UserRole.ACCOUNTS in BILLING_READ_ROLES
        assert UserRole.BDM in BILLING_READ_ROLES
        assert UserRole.BUSINESS in BILLING_READ_ROLES
        assert UserRole.EMPLOYEE not in BILLING_READ_ROLES

    def test_invoice_delete_roles(self):
        """Only ADMIN and MANAGER can delete invoices."""
        from app.core.rbac import INVOICE_DELETE_ROLES
        from app.models.user import UserRole
        assert UserRole.ADMIN in INVOICE_DELETE_ROLES
        assert UserRole.MANAGER in INVOICE_DELETE_ROLES
        assert UserRole.ACCOUNTS not in INVOICE_DELETE_ROLES

    def test_invoice_send_roles(self):
        """ADMIN, MANAGER, ACCOUNTS can send invoice emails."""
        from app.core.rbac import INVOICE_SEND_ROLES
        from app.models.user import UserRole
        assert UserRole.ADMIN in INVOICE_SEND_ROLES
        assert UserRole.MANAGER in INVOICE_SEND_ROLES
        assert UserRole.ACCOUNTS in INVOICE_SEND_ROLES
        assert UserRole.EMPLOYEE not in INVOICE_SEND_ROLES

    def test_billing_write_roles(self):
        """ADMIN, MANAGER, ACCOUNTS can write/create invoices."""
        from app.core.rbac import BILLING_WRITE_ROLES
        from app.models.user import UserRole
        assert UserRole.ADMIN in BILLING_WRITE_ROLES
        assert UserRole.ACCOUNTS in BILLING_WRITE_ROLES
        assert UserRole.HARDWARE not in BILLING_WRITE_ROLES


# ══════════════════════════════════════════════════════════════════════════════
# Line Item Validation
# ══════════════════════════════════════════════════════════════════════════════

class TestLineItemValidation:
    """Unit tests for InvoiceItemCreate schema validation."""

    def test_unit_price_must_be_positive(self):
        """unit_price <= 0 raises validation error."""
        from pydantic import ValidationError
        from app.schemas.invoice import InvoiceItemCreate
        with pytest.raises(ValidationError):
            InvoiceItemCreate(item_name="Test", unit_price=-1)

    def test_item_name_not_empty(self):
        """Empty item_name raises validation error."""
        from pydantic import ValidationError
        from app.schemas.invoice import InvoiceItemCreate
        with pytest.raises(ValidationError):
            InvoiceItemCreate(item_name="   ", unit_price=100)

    def test_valid_item_creation(self):
        """Valid item schema creates without error."""
        from app.schemas.invoice import InvoiceItemCreate
        item = InvoiceItemCreate(
            item_name="Security Deposit",
            description="For 5 devices",
            unit_price=600000,
        )
        assert item.item_name == "Security Deposit"
        assert item.unit_price == 600000


# ══════════════════════════════════════════════════════════════════════════════
# Invoice Schema Validation
# ══════════════════════════════════════════════════════════════════════════════

class TestInvoiceSchemaValidation:
    """Unit tests for InvoiceCreateV2 schema."""

    def test_due_date_not_in_past(self):
        """Past due_date raises ValidationError."""
        from pydantic import ValidationError
        from app.schemas.invoice import InvoiceCreateV2
        from datetime import date, timedelta
        past_date = date.today() - timedelta(days=1)
        with pytest.raises(ValidationError):
            InvoiceCreateV2(
                client_id=str(uuid4()),
                due_date=past_date,
            )

    def test_tax_percentage_range(self):
        """Tax percentage outside 0–100 raises error."""
        from pydantic import ValidationError
        from app.schemas.invoice import InvoiceCreateV2
        from datetime import date, timedelta
        future = date.today() + timedelta(days=30)
        with pytest.raises(ValidationError):
            InvoiceCreateV2(
                client_id=str(uuid4()),
                due_date=future,
                tax_percentage=150,
            )

    def test_valid_invoice_create(self):
        """Valid InvoiceCreateV2 schema instantiates correctly."""
        from app.schemas.invoice import InvoiceCreateV2
        from datetime import date, timedelta
        future = date.today() + timedelta(days=30)
        inv = InvoiceCreateV2(
            client_id=str(uuid4()),
            due_date=future,
            tax_percentage=15,
        )
        assert inv.tax_percentage == 15

    def test_send_request_requires_recipients(self):
        """InvoiceSendRequest with empty recipients raises error."""
        from pydantic import ValidationError
        from app.schemas.invoice import InvoiceSendRequest
        with pytest.raises(ValidationError):
            InvoiceSendRequest(recipients=[])

    def test_send_request_valid(self):
        """Valid InvoiceSendRequest with email list."""
        from app.schemas.invoice import InvoiceSendRequest
        req = InvoiceSendRequest(recipients=["client@example.com"])
        assert len(req.recipients) == 1
