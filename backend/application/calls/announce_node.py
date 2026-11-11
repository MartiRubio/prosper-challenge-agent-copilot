"""Tell the open test call which node it just entered.

The voice runner pushes the node name on the call's WebRTC data channel, and
the editor highlights that step. Nothing polls and nothing is written to disk.
Each call gets its own announcer, so two calls never share state.
"""

from collections.abc import Callable

from loguru import logger


class NodeAnnouncer:
    def __init__(self) -> None:
        self._send: Callable[[str], None] | None = None

    def bind(self, send: Callable[[str], None] | None) -> None:
        """Set once the browser is connected; cleared when it leaves."""
        self._send = send

    def __call__(self, node_name: str) -> None:
        if self._send is None:
            return
        try:
            self._send(node_name)
        except Exception:
            logger.exception("Could not tell the editor which node is active")
