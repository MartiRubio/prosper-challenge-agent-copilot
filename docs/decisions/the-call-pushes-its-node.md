# The call pushes its node

The editor highlighted the step a live call was in by polling `GET /active-node/{id}` twice a second. That request ran with no call on the line.

The voice runner and the page already share a WebRTC data channel. When the flow enters a node, the runner sends a `server-message` with that node name. The page highlights from that message. A click on a step during a call does nothing to the conversation.

Start from node is how a test begins somewhere other than the greeting. The fields for that start open beside the button. Once they are filled, the steps pulse and a click opens the call on that step. The runner receives the step and the field values in the session body, puts the values in front of the model, and speaks that step first.

The HTTP route and the runtime file remain, so a call can still be inspected without the browser. The editor does not read them.
