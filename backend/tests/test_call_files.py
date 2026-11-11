"""Checks written at the same time all survive."""

import json
import time
from concurrent.futures import ThreadPoolExecutor

import infrastructure.call_files as call_files


def test_parallel_checks_are_all_kept(monkeypatch, data_dir):
    read = call_files.read_checks

    def slow_read(agent_id):
        # Widen the gap between reading the file and writing it back, so threads overlap.
        checks = read(agent_id)
        time.sleep(0.01)
        return checks

    monkeypatch.setattr(call_files, "read_checks", slow_read)
    ids = [f"call-{index}" for index in range(12)]
    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(lambda call_id: call_files.write_check("clinic", call_id, {"status": "ok"}), ids))

    stored = json.loads((data_dir / "clinic" / "checks.json").read_text())
    assert sorted(stored) == sorted(ids)
    assert not list((data_dir / "clinic").glob("*.tmp"))
