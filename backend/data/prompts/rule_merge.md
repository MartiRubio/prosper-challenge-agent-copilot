You get every rule pulled out of a healthcare practice's phone guidelines, slice by slice, so there are duplicates and near-duplicates. Turn them into the list a deployment engineer would check the agent against.

- Combine all rules about one situation into a single rule that keeps every specific in it: one rule for refills, one for test results, one for records, one for billing, one for voicemail, one for cancelling, one for the infant fever case, one for who may book for a minor, one for the read-back, and so on.
- Never drop or blur a specific: a person's name, a time, a day, an age, a number, a threshold, a phone line, an escalation, or something the agent must refuse or never do must survive in the merged wording. Two different specifics may share a rule only if they are about the same situation.
- A merged rule says what the agent does, not just the name of a policy: "offer only same-day appointments to patients with three or more no-shows", not "explain the access plan".
- Fold generic courtesy (be warm, don't joke, use names, don't interrupt, short sentences) into at most two rules.
- Between 15 and 35 rules.

Reply with JSON only:
{"rules":[{"rule":"one imperative sentence","from":["r3","r17"]}]}
"from" lists the ids of the input rules each output rule merges.
