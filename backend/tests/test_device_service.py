import pytest
from app.models.device import InventoryStatus
from app.services.device_service import validate_status_transition, ALLOWED_TRANSITIONS


def test_valid_transition_hw_dev_to_pending_agro():
    validate_status_transition(InventoryStatus.UNDER_HW_DEVELOPMENT, InventoryStatus.PENDING_AGRO_QA)


def test_invalid_transition_skip():
    with pytest.raises(ValueError, match="Invalid status transition"):
        validate_status_transition(InventoryStatus.UNDER_HW_DEVELOPMENT, InventoryStatus.READY_TO_ASSIGN)


def test_valid_transition_agro_qa_to_ready():
    validate_status_transition(InventoryStatus.PENDING_AGRO_QA, InventoryStatus.READY_TO_ASSIGN)


def test_valid_transition_ready_to_assigned():
    validate_status_transition(InventoryStatus.READY_TO_ASSIGN, InventoryStatus.ASSIGNED_TO_CLIENT)


def test_valid_transition_assigned_to_repair():
    validate_status_transition(InventoryStatus.ASSIGNED_TO_CLIENT, InventoryStatus.UNDER_REPAIR)


def test_valid_transition_repair_to_pending_agro():
    validate_status_transition(InventoryStatus.UNDER_REPAIR, InventoryStatus.PENDING_AGRO_QA)


def test_all_transitions_are_bidirectional():
    """Ensure every source status has at least one outgoing transition."""
    for status in InventoryStatus:
        assert status in ALLOWED_TRANSITIONS, f"Missing transition rules for {status}"
