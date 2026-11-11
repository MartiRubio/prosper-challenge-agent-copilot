# Prompts are files behind a prompt adapter

Prompts used to be constants in `application/prompts.py`. They are content more than code: they change more often than the logic around them, and a team would want to edit and version them without a deploy. That is what a prompt manager such as Langfuse does.

Each prompt is now `backend/data/prompts/<name>.md`. Use cases ask `infrastructure.prompt_files.get_prompt(name)` and get back the text and a version (a hash of the text). Every model call logs the prompt’s name and version, so any answer traces back to the exact prompt that produced it.

A Langfuse adapter would implement the same `get_prompt(name)` against the hosted store. I did not build a mock of Langfuse’s API: the file adapter already proves the seam, without simulating a service.
