"""Evidence on a proposed change: each quote must really appear in its source."""

_EVIDENCE_SOURCES = {"call", "attachment", "request"}


def normalize(text: str) -> str:
    # Letters and digits only: PDF text breaks lines, and sometimes words, in odd places.
    return "".join(ch.lower() for ch in text if ch.isalnum())


def quote_in(quote: str, source: str) -> bool:
    needle = normalize(quote)
    return bool(needle) and needle in normalize(source)


def evidence_sources(message: str, calls: list, attachments: list[dict]) -> dict[tuple[str, str], str]:
    sources: dict[tuple[str, str], str] = {("request", "message"): message}
    for call in calls:
        lines = [turn.get("text", "") for turn in call.get("turns") or [] if isinstance(turn, dict)]
        lines.append(call.get("feedback") or "")
        sources[("call", str(call.get("id")))] = "\n".join(lines)
    for attachment in attachments:
        sources[("attachment", attachment["name"])] = attachment["text"]
    return sources


def verify_evidence(raw: object, sources: dict[tuple[str, str], str]) -> list[dict]:
    """Keep well-formed citations and mark whether the quote really is in its source."""
    if not isinstance(raw, list):
        return []
    evidence = []
    for item in raw:
        if not isinstance(item, dict):
            continue
        source = item.get("source")
        ref = item.get("ref") if isinstance(item.get("ref"), str) else ""
        quote = item.get("quote") if isinstance(item.get("quote"), str) else ""
        if source not in _EVIDENCE_SOURCES or not quote.strip():
            continue
        if source == "request":
            ref = "message"
        text = sources.get((source, ref), "")
        evidence.append({
            "source": source,
            "ref": ref,
            "quote": quote.strip(),
            "verified": quote_in(quote, text) if text else False,
        })
    return evidence
