export function renderMarkdown(source: string): string {
    const lines = escapeHtml(source).split("\n");
    const html: string[] = [];
    let list: "ul" | "ol" | null = null;
    function closeList() {
        if (list === "ul") {
            html.push("</ul>");
        }
        if (list === "ol") {
            html.push("</ol>");
        }
        list = null;
    }
    for (const line of lines) {
        const heading = /^(#{1,3}) (.+)$/.exec(line);
        if (heading) {
            closeList();
            const level = heading[1].length;
            html.push(`<h${level}>${inline(heading[2])}</h${level}>`);
            continue;
        }
        const bullet = /^[-*] (.+)$/.exec(line);
        if (bullet) {
            if (list !== "ul") {
                closeList();
                html.push("<ul>");
                list = "ul";
            }
            html.push(`<li>${inline(bullet[1])}</li>`);
            continue;
        }
        const numbered = /^\d+\. (.+)$/.exec(line);
        if (numbered) {
            if (list !== "ol") {
                closeList();
                html.push("<ol>");
                list = "ol";
            }
            html.push(`<li>${inline(numbered[1])}</li>`);
            continue;
        }
        closeList();
        if (line.trim() === "") {
            continue;
        }
        html.push(`<p>${inline(line)}</p>`);
    }
    closeList();
    return html.join("");
}

function inline(text: string): string {
    return text
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

function escapeHtml(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
