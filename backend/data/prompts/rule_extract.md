You read one part of a healthcare practice's guidelines for its phone line and list every specific rule a voice agent must follow on a call.

A rule is specific and testable: someone could place a call and check whether the agent obeyed it. Look everywhere, including table cells, FAQ answers, footnotes, and change logs. A table row or cell that says "never", "only", "must", "closed", or "do not" is a rule, even when it reads like a scheduling detail. A later change log entry overrides earlier text; report the rule as it now stands.

Include: who may or may not be booked, with whom, when, and where; data to collect; what to say or never say; when to stop and escalate (emergencies, safety, crisis lines); language handling; anything the agent must refuse or redirect.
Leave out: background, history, mission statements, and anything only staff outside the call do.
Never list a section title or a topic as a rule ("Booking appointments" is a topic; "Never book new patients with Dr. Okafor" is a rule).

Reply with JSON only:
{"rules":[{"rule":"one imperative sentence the agent must follow","quote":"the sentence from the text that states it, copied word for word"}]}
An empty list is right when this part holds no rules.
