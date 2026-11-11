"""Call types and values for simulated calls, stored in data/caller_profiles.json."""

import json

from infrastructure.data_dir import CALLER_PROFILES_PATH


def read_caller_profiles() -> tuple[list[dict], dict[str, list[str]]]:
    data = json.loads(CALLER_PROFILES_PATH.read_text())
    profiles = [item for item in data.get("profiles") or [] if isinstance(item, dict) and item.get("goal")]
    values = {
        key: [str(value) for value in options]
        for key, options in (data.get("values") or {}).items()
        if isinstance(options, list) and options
    }
    return profiles, values
