import { PipecatClient, type TransportState } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

import type { AgentDocument } from "../editor/agentDocument";
import { openBotSpeaker } from "./botPlayback";
import { bindCallJump, publishCallNode } from "./callChannel";

const VOICE_URL = import.meta.env.VITE_VOICE_URL ?? "http://127.0.0.1:7860";

export async function startWebRtcCall(
    agentId: string,
    agent: AgentDocument,
    onState: (state: TransportState) => void,
    onPlaybackBlocked: () => void,
    start?: { node: string; data: Record<string, string> },
): Promise<() => Promise<void>> {
    const speaker = openBotSpeaker(onPlaybackBlocked);
    const client = new PipecatClient({
        transport: new SmallWebRTCTransport(),
        enableMic: true,
        enableCam: false,
        callbacks: {
            onTransportStateChanged: onState,
            onTrackStarted: (track, participant) => speaker.attach(track, participant),
            onServerMessage: (data) => {
                if (data && typeof data === "object" && typeof data.node === "string") {
                    publishCallNode(data.node);
                }
            },
            onDisconnected: () => bindCallJump(null),
        },
    });
    try {
        await client.startBotAndConnect({
            endpoint: `${VOICE_URL}/start`,
            requestData: {
                transport: "webrtc",
                body: {
                    agent_id: agentId,
                    agent: JSON.parse(JSON.stringify(agent)),
                    ...(start ? { start_node: start.node, data: start.data } : {}),
                },
            },
        });
        attachPeerAudio(client, (track) => speaker.attach(track));
        bindCallJump((nodeName, data) => client.sendClientMessage("jump", { node: nodeName, data }));
    } catch (error) {
        speaker.stop();
        bindCallJump(null);
        await client.disconnect().catch(() => undefined);
        throw error;
    }
    return async () => {
        speaker.stop();
        bindCallJump(null);
        await client.disconnect();
    };
}

function attachPeerAudio(client: PipecatClient, attach: (track: MediaStreamTrack) => void) {
    const transport = (client as unknown as { _transport?: { pc?: RTCPeerConnection } })._transport;
    for (const receiver of transport?.pc?.getReceivers() ?? []) {
        if (receiver.track?.kind === "audio") {
            attach(receiver.track);
        }
    }
}
