/**
 * Chat export utilities
 */

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface ExportOptions {
  includeTimestamps?: boolean;
  format: "markdown" | "json" | "text";
}

/**
 * Export chat messages as markdown
 */
export function exportAsMarkdown(
  messages: Message[],
  options: { includeTimestamps?: boolean } = {}
): string {
  const { includeTimestamps = true } = options;

  const lines: string[] = [
    "# Stock Surge Chat Export",
    "",
    `Exported: ${new Date().toLocaleString()}`,
    `Messages: ${messages.length}`,
    "",
    "---",
    "",
  ];

  messages.forEach((message, index) => {
    const timestamp = includeTimestamps
      ? ` (${new Date(message.created_at).toLocaleString()})`
      : "";

    if (message.role === "user") {
      lines.push(`## User${timestamp}`);
      lines.push("");
      lines.push(message.content);
      lines.push("");
    } else {
      lines.push(`## Assistant${timestamp}`);
      lines.push("");
      lines.push(message.content);
      lines.push("");
    }

    if (index < messages.length - 1) {
      lines.push("---");
      lines.push("");
    }
  });

  return lines.join("\n");
}

/**
 * Export chat messages as plain text
 */
export function exportAsText(
  messages: Message[],
  options: { includeTimestamps?: boolean } = {}
): string {
  const { includeTimestamps = true } = options;

  const lines: string[] = [
    "=== Stock Surge Chat Export ===",
    "",
    `Exported: ${new Date().toLocaleString()}`,
    `Messages: ${messages.length}`,
    "",
    "=" .repeat(50),
    "",
  ];

  messages.forEach((message, index) => {
    const timestamp = includeTimestamps
      ? ` [${new Date(message.created_at).toLocaleString()}]`
      : "";

    const role = message.role === "user" ? "You" : "Assistant";

    lines.push(`${role}${timestamp}:`);
    lines.push(message.content);
    lines.push("");

    if (index < messages.length - 1) {
      lines.push("-".repeat(50));
      lines.push("");
    }
  });

  return lines.join("\n");
}

/**
 * Export chat messages as JSON
 */
export function exportAsJSON(
  messages: Message[],
  options: { includeTimestamps?: boolean } = {}
): string {
  const { includeTimestamps = true } = options;

  const exportData = {
    exported_at: new Date().toISOString(),
    message_count: messages.length,
    messages: messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
      ...(includeTimestamps && { timestamp: msg.created_at }),
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Download a file with the given content
 */
export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Main export function
 */
export function exportChat(messages: Message[], options: ExportOptions) {
  const { format, includeTimestamps = true } = options;
  const timestamp = new Date().toISOString().split("T")[0];

  let content: string;
  let filename: string;
  let mimeType: string;

  switch (format) {
    case "markdown":
      content = exportAsMarkdown(messages, { includeTimestamps });
      filename = `stock-surge-chat-${timestamp}.md`;
      mimeType = "text/markdown";
      break;

    case "json":
      content = exportAsJSON(messages, { includeTimestamps });
      filename = `stock-surge-chat-${timestamp}.json`;
      mimeType = "application/json";
      break;

    case "text":
    default:
      content = exportAsText(messages, { includeTimestamps });
      filename = `stock-surge-chat-${timestamp}.txt`;
      mimeType = "text/plain";
      break;
  }

  downloadFile(content, filename, mimeType);
}
