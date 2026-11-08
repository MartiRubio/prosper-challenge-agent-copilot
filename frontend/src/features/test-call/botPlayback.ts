type Participant = {
    local?: boolean;
};

// Chrome plays a remote WebRTC track through an audio element. Connecting that
// same track to an AudioContext stays silent, so the call never reaches the
// speakers. Start the element during the click, then add the bot track to the
// stream it is already playing.
export function openBotSpeaker(onBlocked: () => void): {
    attach: (track: MediaStreamTrack, participant?: Participant) => void;
    stop: () => void;
} {
    const stream = new MediaStream();
    const audio = document.createElement("audio");
    audio.autoplay = true;
    audio.srcObject = stream;
    document.body.appendChild(audio);
    void audio.play().catch(() => undefined);
    return {
        attach(track, participant) {
            if (participant?.local || track.kind !== "audio") {
                return;
            }
            for (const existing of stream.getAudioTracks()) {
                if (existing !== track) {
                    stream.removeTrack(existing);
                }
            }
            if (!stream.getAudioTracks().includes(track)) {
                stream.addTrack(track);
            }
            if (audio.paused) {
                void audio.play().catch(() => onBlocked());
            }
        },
        stop() {
            audio.pause();
            audio.srcObject = null;
            stream.getTracks().forEach((track) => stream.removeTrack(track));
            audio.remove();
        },
    };
}
