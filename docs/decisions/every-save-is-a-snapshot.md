# Every save is a snapshot

Production iteration needs a way back. Every save writes the full agent document to `data/agents/<agent id>/history/<timestamp>.json`; the first save also keeps the version it replaces. History lists them, and choosing one loads it as unsaved edits, so restoring is itself reviewed and saved.

Snapshots are whole documents, not diffs. A snapshot whose function was later removed from the catalog fails validation on save, which is the right moment to notice.
