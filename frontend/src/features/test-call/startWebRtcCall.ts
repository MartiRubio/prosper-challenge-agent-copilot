import { PipecatClient, type APIRequest, type TransportState } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

import type { AgentDocument } from "../editor/agentDocument";
import { openBotSpeaker } from "./botPlayback";
import { bindCallJump, publishCallNode } from "./callChannel";

const VOICE_URL = import.meta.env.VITE_VOICE_URL ?? "http://127.0.0.1:7860";

// The agent is plain JSON; its optional unknown[] fields just don't satisfy the client's type.
type RequestJson = NonNullable<APIRequest["requestData"]>;

export async function startWebRtcCall(
    agentId: string,
    agent: AgentDocument,
    onState: (state: TransportState) => void,
    onPlaybackBlocked: () => void,
    onEnded: () => void,
    start?: { node: string; data: Record<string, string> },
): Promise<() => Promise<void>> {
    const speaker = openBotSpeaker(onPlaybackBlocked);
    let connected = false;
    let ended = false;
    function teardown(): boolean {
        if (ended) {
            return false;
        }
        ended = true;
        speaker.stop();
        bindCallJump(null);
        return true;
    }
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
            onDisconnected: () => {
                if (teardown() && connected) {
                    onEnded();
                }
            },
        },
    });
    try {
        await client.startBotAndConnect({
            endpoint: `${VOICE_URL}/start`,
            requestData: {
                transport: "webrtc",
                body: {
                    agent_id: agentId,
                    agent: agent as unknown as RequestJson,
                    ...(start ? { start_node: start.node, data: start.data } : {}),
                },
            },
        });
        if (ended) {
            throw new Error("The call ended before it connected.");
        }
        connected = true;
        attachPeerAudio(client, (track) => speaker.attach(track));
        bindCallJump((nodeName, data) => client.sendClientMessage("jump", { node: nodeName, data }));
    } catch (error) {
        teardown();
        await client.disconnect().catch(() => undefined);
        throw error;
    }
    return async () => {
        teardown();
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
