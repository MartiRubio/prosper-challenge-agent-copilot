"""The server's patch engine on the shared cases in contracts/patch-cases.json.

The canvas preview (frontend/src/features/copilot/applyOps.test.ts) runs the same
file, so the preview and the server cannot drift apart unnoticed.
"""

import json
from pathlib import Path

import pytest

from domain.patch import apply_ops

CASES = json.loads((Path(__file__).resolve().parents[2] / "contracts" / "patch-cases.json").read_text())["cases"]


@pytest.mark.parametrize("case", CASES, ids=[case["name"] for case in CASES])
def test_shared_patch_case(case):
    if "error" in case:
        with pytest.raises(ValueError, match=case["error"].replace("(", r"\(").replace(")", r"\)")):
            apply_ops(case["document"], case["ops"], case["catalog"])
        return
    agent, functions = apply_ops(case["document"], case["ops"], case["catalog"])
    assert {"agent": agent, "functions": functions} == case["expected"]
