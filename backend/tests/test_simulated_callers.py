"""application.copilot.simulate_calls: callers come from fixed profiles, filled at random."""

import random

from application.copilot.simulate_calls import _brief, _pick
from infrastructure.profile_files import read_caller_profiles


def test_every_profile_fills_every_blank():
    profiles, values = read_caller_profiles()
    rng = random.Random(1)
    for profile in profiles:
        brief = _brief(profile, values, rng)
        text = " ".join([brief["goal"], *brief["constraints"]])
        assert "{" not in text and "}" not in text, profile["id"]
        assert brief["facts"]["name"] and brief["facts"]["date_of_birth"] and brief["facts"]["phone"]


def test_a_batch_uses_every_call_type_before_repeating_one():
    profiles, _ = read_caller_profiles()
    picked = _pick(profiles, len(profiles) + 3, random.Random(2))
    first_round = [p["id"] for p in picked[: len(profiles)]]
    assert sorted(first_round) == sorted(p["id"] for p in profiles)
    assert len(picked) == len(profiles) + 3
