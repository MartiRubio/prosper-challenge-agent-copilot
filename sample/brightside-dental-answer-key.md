# Brightside Dental Group: answer key

`brightside-dental-requirements.pdf` is a structured spec: numbered MUST/SHOULD requirements, an emergency table, call flows and acceptance tests. Most rules are easy to find; the traps are a number that changed in the change log, a price exception inside a "never" rule, and office-specific limits hidden in tables. Do not attach this file to the copilot.

| # | Rule | Where it is | A test call |
| --- | --- | --- | --- |
| 1 | Ask new or existing patient before offering times | REQ-01 | "I'd like a cleaning." |
| 2 | Verify full name and date of birth before touching an existing appointment | REQ-02 | "Can you move my appointment?" |
| 3 | No patients under 3: refer to Little Teeth Pediatric Dentistry, 555-0142 | REQ-03 | "Can I book my 2-year-old?" |
| 4 | Minors are booked by a parent or guardian, who attends the first visit | REQ-04 | "I'm 15, can I book a cleaning?" |
| 5 | Never quote prices, except the $129 new patient special | REQ-05 | "How much is a new patient visit?" / "How much is a crown?" |
| 6 | In network: Delta Dental, Cigna, MetLife; others out of network with a courtesy claim; never say "covered" | REQ-06 | "Do you take Aetna? Is a crown covered?" |
| 7 | Under 24 hours' notice: mention the **$50** fee once (not $35, the old fee in the change log) | REQ-07, section 8 | "I need to cancel tomorrow morning." |
| 8 | Saturdays only at Downtown | REQ-08, section 2 | "Saturday at Maple Grove?" |
| 9 | Read back day, date, time, type, office and street address | REQ-09 | Any booking |
| 10 | Sedation needs a consult first: callback request, no booking | Section 3 | "I want to be sedated for a cleaning." |
| 11 | Oral surgery and extractions: Downtown only, route to the surgical coordinator | Section 3 | "I need a wisdom tooth out." |
| 12 | Swelling with fever, trouble swallowing or breathing: ER or 911, no booking | EMR-01 | "My face is swollen and I have a fever." |
| 13 | Knocked-out adult tooth: keep it in milk, same-day emergency slot or the dentist on call | EMR-02 | "I just knocked out a tooth." |
| 14 | Bleeding after an extraction that won't stop: transfer to the dentist on call, no hold | EMR-04 | "I had a tooth pulled and it won't stop bleeding." |
| 15 | No clinical advice, such as medication or dosing | Note under section 5 | "Can I take ibuprofen for this?" |
| 16 | Spanish: transfer to bilingual staff in hours, callback with the language noted otherwise | REQ-11 | "¿Hablan español?" |
| 17 | A caller who only wants to cancel is not pushed to rebook | Section 6.2 | "Just cancel it, please." |

To score a draft agent, check that each rule shows up, with its specifics, in the persona, a step's task or an arrow. Then place the test calls, or use Simulate calls and read the checks.
