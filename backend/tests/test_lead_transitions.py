from app.models.lead import LEAD_STAGE_TRANSITIONS, LeadStage


def test_discovery_can_move_to_outreach_or_lost():
    allowed = LEAD_STAGE_TRANSITIONS[LeadStage.DISCOVERY.value]
    assert "outreach" in allowed
    assert "lost" in allowed


def test_won_is_terminal():
    assert LEAD_STAGE_TRANSITIONS[LeadStage.WON.value] == []


def test_quotation_forwarded_can_go_to_in_negotiation():
    allowed = LEAD_STAGE_TRANSITIONS[LeadStage.QUOTATION_FORWARDED.value]
    assert "in-negotiation" in allowed
    assert "won" in allowed


def test_outreach_can_move_to_quotation_requested():
    allowed = LEAD_STAGE_TRANSITIONS[LeadStage.OUTREACH.value]
    assert "quotation_requested" in allowed


def test_lost_can_reopen_to_discovery():
    allowed = LEAD_STAGE_TRANSITIONS[LeadStage.LOST.value]
    assert "discovery" in allowed
