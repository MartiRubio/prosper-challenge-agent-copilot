import { PipecatClient, type TransportState } from "@pipecat-ai/client-js";
import { SmallWebRTCTransport } from "@pipecat-ai/small-webrtc-transport";

const VOICE_URL = import.meta.env.VITE_VOICE_URL ?? "http://127.0.0.1:7860";

export async function startWebRtcCall(
    agentId: string,
    onState: (state: TransportState) => void,
): Promise<() => Promise<void>> {
    const client = new PipecatClient({
        transport: new SmallWebRTCTransport(),
        enableMic: true,
        enableCam: false,
        callbacks: {
            onTransportStateChanged: onState,
        },
    });
    try {
        await client.startBotAndConnect({
            endpoint: `${VOICE_URL}/start`,
            requestData: {
                transport: "webrtc",
                body: { agent_id: agentId },
            },
        });
    } catch (error) {
        await client.disconnect().catch(() => undefined);
        throw error;
    }
    return () => client.disconnect();
}
