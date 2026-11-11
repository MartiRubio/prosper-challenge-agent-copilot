# Demo script

About 10 minutes. The order follows what Prosper said matters most: the copilot first, the builder last.

## Before the call

1. Put `OPENAI_API_KEY` and `ELEVENLABS_API_KEY` in `backend/.env`.
2. Reset the demo state: `make demo-reset`. This restores the scheduler and the catalog, and clears call checks, recorded calls, and history.
3. Start `make api`, `make run`, `make web`, and open `http://localhost:5173` in Chrome. Allow the microphone once.
4. Warm up: send one throwaway request in the copilot ("What does the greeting do?") and discard the result. Then run `make demo-reset` again, so the call checks happen live.
5. Keep `docs/samples/riverside-guidelines.pdf` ready in Finder.

## 1. Production loop (4 min)

1. Prosper Scheduler is open. Click **Call log**. The three production calls show "Checking", then turn into results: two issues and one "Looks fine". The badge on the button counts the issues.
2. Open **Chest pain, booked for Tuesday**. The issue card names the step (`collect_details`) and outlines the caller's line in the transcript. Open **Caller wanted to cancel**: the agent offered times to someone who wanted to cancel.
3. Both are already flagged with feedback from the check. Edit one line of feedback to show it is yours to change.
4. Click **Improve from 2 flagged calls**. The drawer closes, and the copilot reads the calls against the graph.
5. Cards arrive. The canvas shows new steps in green and a review banner. Point at a quote: it is the caller's own line, marked "In source". Hover a card and its steps light up.
6. **Keep all**. Then **Replay 2 flagged calls**. After about 20 seconds: **Before ✗ → After ✓** for both. Open After on the chest-pain call: the agent sends the caller to emergency care, and the path ends in the new step.
7. **Save** (⌘S). Then **History**: two versions, the original and this one.
8. **Test call** → **Start**. Say: "Hi, I need to cancel my appointment on Thursday." The highlighted step jumps to the cancel step and the agent confirms and hangs up. Open the Call log: the new test call is already checked.

## 2. From guidelines to an agent (3 min)

1. **New** in the sidebar. The canvas is Start and End.
2. Click the paperclip in the copilot and attach `riverside-guidelines.pdf`. Type "Build this clinic's scheduling agent from the guidelines" and send.
3. One card per path, each quoting the guideline it implements. Open **Guidelines covered**: every rule, and the change that covers it.
4. **Keep all**, **Auto-arrange**, **Save**.
5. Open the **Call log**, **Simulate calls** → **5**. Five different callers run against the new agent in about 20 seconds and get checked as they land. Flag what the check found and **Improve**.

## 3. Precision edits (1 min)

1. Back on Prosper Scheduler, shift-drag across two steps. Click **Send to chat**: they become focus chips.
2. Ask "Ask for date of birth before offering times." Keep the card.
3. Double-click a step: the task editor opens. Click the sparkle and ask for a rewrite.

## 4. History (30 s)

**History** → choose the first version. The banner says it is restored as unsaved edits. Don't save.

## 5. The builder (1 min)

Double-click a step and show raw, markdown, and token views. The function on an arrow is a dropdown from the shared catalog. **Functions** in the sidebar edits the catalog. **Start from node** with test data opens a call on any step.

## If something goes wrong

- **The copilot is slow:** talk over the loading line. The checks and Improve each take 5–15 seconds.
- **A card cannot be kept:** Discard it and ask again with one more sentence of feedback.
- **Replay still fails after:** click "Fix the replay that still fails". That is the loop working, so say so.
- **Voice will not connect:** check `make run` is up. Show the replay transcripts instead; they are the same graph.
