# Guidelines are attachments

A client's guidelines arrive as a document, not a chat message. The copilot takes .txt, .md, and .pdf files (PDF text via `pypdf`, capped at 40,000 characters), and the file stays attached for follow-up requests.

With an attachment, the copilot lists every rule that changes how a call should go and names the change that covers each one. The editor shows a coverage bar and offers to cover any rule nothing implements. Each step cites the guideline sentence it comes from.
