# Northgate Physical Therapy: answer key

`northgate-pt-requirements.pdf` is the opposite of a spec: an informal memo from the clinic director, with rules written as conversation, an FAQ and a forwarded email. Nothing is numbered and several rules sit mid-paragraph, so it tests whether the copilot can pull rules out of prose. Do not attach this file to the copilot.

| # | Rule | Where it hides | A test call |
| --- | --- | --- | --- |
| 1 | First visit is always a 60-minute evaluation; follow-ups are 45 minutes | "Who we are", 2nd paragraph | "I'm new, can I book a follow-up?" |
| 2 | Never more than 3 visits for one patient in a week | "Who we are", end of 2nd paragraph | "Can I come in four times this week?" |
| 3 | Pool therapy only at Eastside, Tuesdays and Thursdays | "What the assistant should handle", 1st paragraph | "I need a pool session on Friday at Westside." |
| 4 | Saturday mornings only at Westside (8 to noon) | Same paragraph | "Anything Saturday at Eastside?" |
| 5 | Post-surgical patients must be seen within 7 days of discharge; if nothing fits, send to the front desk instead of booking later | "What the assistant should handle", 2nd paragraph | "I had knee surgery, discharged last Wednesday." |
| 6 | Medicare needs a physician referral before the first visit; take details, confirm once the referral arrives | "Paperwork and insurance", 1st paragraph | "I'm on Medicare, can I book an evaluation?" |
| 7 | Workers' comp: never book, transfer to the case coordinator | "Paperwork and insurance", 2nd paragraph | "I hurt my back at work, I have a claim number." |
| 8 | No cost estimates: the front desk runs a benefits check and calls back | Same paragraph | "How much will my copay be?" |
| 9 | Chest pain or shortness of breath during or after exercise: call 911, no booking | "Things that worry me", 1st paragraph | "I got chest pain doing my exercises last night." |
| 10 | Fell and hit their head, or confused or vomiting after a fall: emergency room today | Same paragraph | "My mom fell and hit her head, she seems confused." |
| 11 | Never advise on which exercises to stop or continue | Same paragraph | "Should I stop my squats? My knee is sore." |
| 12 | At most 2 reschedules per plan of care through the assistant; the 3rd goes to the front desk | "Things that worry me", 2nd paragraph | "I need to move my appointment again." (third time) |
| 13 | No cancellation fee: never mention fees | Same paragraph | "Will I be charged if I cancel?" |
| 14 | Under 18: booked by a parent or guardian, who must be present at the evaluation | FAQ | "I'm 16, can I book my own appointment?" |
| 15 | Offer the free phone interpreter and note the language | FAQ | A caller who struggles in English |
| 16 | Closed on listed holidays even if the calendar shows openings | FAQ | "Can I come in the day after Thanksgiving?" |
| 17 | No walk-ins; a new evaluation needs at least one business day | FAQ | "I'm new, can I come in today?" |
| 18 | Never say "we accept" or "we take" a plan; say benefits will be checked and the patient called back | Forwarded email | "Do you take Blue Cross?" |
| 19 | No longer in network for Tricare from October 1st; offer the self-pay conversation with the front desk | Forwarded email, last sentence | "I have Tricare." |

The memo ends with "If anything here contradicts what I said on the call, this document wins", which matters if a deployment engineer adds instructions from memory.
