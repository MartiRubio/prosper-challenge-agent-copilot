#
# Voice pipeline — Prosper Product Engineer Challenge
#
# The runnable voice agent: WebRTC transport + ElevenLabs STT/TTS + OpenAI LLM,
# driven by a Pipecat Flows node graph. This file is generic — it loads an agent
# definition (JSON) via AgentBuilder and runs it. Swapping the agent is a data
# change (edit/replace the JSON), not a code change.
#
#   agent JSON  ->  AgentBuilder  ->  Pipecat Flows graph  ->  FlowManager
#
# The editor sends the graph on screen. A session with only agent_id loads
# backend/agents/<id>.json. With no id, the bot loads example_flow.json.
#

import os
from pathlib import Path

from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.worker import PipelineParams, PipelineWorker
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.elevenlabs.stt import ElevenLabsRealtimeSTTService
from pipecat.services.elevenlabs.tts import ElevenLabsTTSService
from pipecat.services.openai.llm import OpenAILLMService
from pipecat.transports.base_transport import BaseTransport, TransportParams
from pipecat.workers.runner import WorkerRunner
from pipecat_flows import FlowManager

from agent_builder import AgentBuilder
from application.calls.announce_node import NodeAnnouncer
from application.calls.caller_data import caller_fields
from application.calls.load_call_agent import load_call_agent
from application.calls.opening_node import opening_node
from application.calls.record_call import record_call

# Load .env next to this file, so the bot runs the same from the repo root or backend/.
load_dotenv(Path(__file__).parent / ".env", override=True)

transport_params = {
    "webrtc": lambda: TransportParams(audio_in_enabled=True, audio_out_enabled=True),
}


async def run_bot(
    transport: BaseTransport,
    runner_args: RunnerArguments,
    builder: AgentBuilder,
    agent_id: str | None,
    announce_node: NodeAnnouncer,
) -> None:
    config = builder.config
    logger.info(f"Starting '{config.name}' with {len(config.nodes)} nodes")

    stt = ElevenLabsRealtimeSTTService(api_key=os.environ["ELEVENLABS_API_KEY"])
    tts = ElevenLabsTTSService(
        api_key=os.environ["ELEVENLABS_API_KEY"],
        settings=ElevenLabsTTSService.Settings(voice=config.voice_id),
    )
    llm = OpenAILLMService(api_key=os.environ["OPENAI_API_KEY"], model=config.model)

    context = LLMContext()
    context_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(vad_analyzer=SileroVADAnalyzer()),
    )

    pipeline = Pipeline(
        [
            transport.input(),
            stt,
            context_aggregator.user(),
            llm,
            tts,
            transport.output(),
            context_aggregator.assistant(),
        ]
    )

    worker = PipelineWorker(
        pipeline,
        params=PipelineParams(enable_metrics=True, enable_usage_metrics=True),
        idle_timeout_secs=runner_args.pipeline_idle_timeout_secs,
    )

    flow_manager = FlowManager(
        llm=llm,
        context_aggregator=context_aggregator,
        worker=worker,
        transport=transport,
    )

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        node_name, node = opening_node(builder, getattr(runner_args, "body", None), flow_manager, context)
        logger.info(f"Client connected — starting flow at {node_name}")
        announce_node.bind(lambda name: _send_node(client, name))
        announce_node(node_name)
        await flow_manager.initialize(node)

    saved = False

    def save_call() -> None:
        nonlocal saved
        if saved:
            return
        saved = True
        try:
            body = getattr(runner_args, "body", None)
            body = body if isinstance(body, dict) else {}
            agent = body.get("agent") if isinstance(body.get("agent"), dict) else None
            start_node = body.get("start_node") if isinstance(body.get("start_node"), str) else None
            record_call(agent_id, context.get_messages(), agent, start_node, caller_fields(body.get("data")))
        except Exception:
            logger.exception("Could not save the call log")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info("Client disconnected")
        save_call()
        announce_node.bind(None)
        await worker.cancel()

    runner = WorkerRunner(handle_sigint=runner_args.handle_sigint)
    await runner.add_workers(worker)
    try:
        await runner.run()
    finally:
        save_call()


def _send_node(client, node_name: str) -> None:
    client.send_app_message({
        "label": "rtvi-ai",
        "type": "server-message",
        "data": {"node": node_name},
    })


async def bot(runner_args: RunnerArguments):
    """Entry point invoked by the Pipecat dev runner (and Pipecat Cloud)."""
    transport = await create_transport(runner_args, transport_params)
    announce_node = NodeAnnouncer()
    agent_id, builder = load_call_agent(
        getattr(runner_args, "body", None),
        on_transition=announce_node,
    )
    logger.info(f"Loading agent {agent_id or builder.config.name}")
    await run_bot(transport, runner_args, builder, agent_id, announce_node)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
