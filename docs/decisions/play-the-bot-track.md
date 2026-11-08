# Play the bot track

The voice runner synthesizes speech and sends it over the WebRTC audio track. `SmallWebRTCTransport` delivers that track to the page and does not play it.

The test call creates an `<audio autoplay>` element when the person clicks Test call, then points the element at the remote audio track. The local microphone track is left alone, so the caller does not hear themselves.
