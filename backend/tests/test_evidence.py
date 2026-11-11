"""application.copilot.evidence: a quote must really be in its source."""

from application.copilot.evidence import evidence_sources, quote_in, verify_evidence


def test_quotes_survive_pdf_line_breaks_and_punctuation():
    source = "Patients must be seen\nwithin 7 days of\n discharge, without exception."
    assert quote_in("seen within 7 days of discharge", source)
    assert quote_in("Within 7 days of discharge!", source)
    assert not quote_in("within 10 days of discharge", source)
    assert not quote_in("", source)


def sources():
    calls = [{"id": "c1", "turns": [{"role": "caller", "text": "I need to cancel Thursday."}], "feedback": "Wanted to cancel"}]
    attachments = [{"name": "rules.pdf", "text": "Never quote prices."}]
    return evidence_sources("Add a cancel path", calls, attachments)


def test_each_citation_is_marked_found_or_not():
    evidence = verify_evidence([
        {"source": "call", "ref": "c1", "quote": "I need to cancel Thursday"},
        {"source": "attachment", "ref": "rules.pdf", "quote": "Always quote prices"},
        {"source": "request", "ref": "anything", "quote": "cancel path"},
    ], sources())
    assert [(e["source"], e["ref"], e["verified"]) for e in evidence] == [
        ("call", "c1", True), ("attachment", "rules.pdf", False), ("request", "message", True),
    ]


def test_malformed_citations_are_dropped():
    assert verify_evidence([{"source": "rumour", "quote": "x"}, {"source": "call", "quote": " "}, "junk"], sources()) == []
    assert verify_evidence(None, sources()) == []
