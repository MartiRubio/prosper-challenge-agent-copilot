"""Tell the open test call which node it just entered.

The editor used to poll the API for this. The call already has a data
channel, so the voice runner pushes the node name on that channel.
"""

from collections.abc import Callable

from loguru import logger

_announce: Callable[[str], None] | None = None


def bind_node_announcer(announce: Callable[[str], None] | None) -> None:
    global _announce
    _announce = announce


def announce_node(node_name: str) -> None:
    if _announce is None:
        return
    try:
        _announce(node_name)
    except Exception:
        logger.exception("Could not tell the editor which node is active")
