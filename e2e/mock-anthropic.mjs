// Stand-in for the Anthropic Messages API in the end-to-end tests: the app
// talks to it through ANTHROPIC_BASE_URL (playwright.config.ts), so the
// tests are free, fast and deterministic. Answers every request with the
// same short text and a fixed token usage.
import { createServer } from "node:http";

const MOCK_OUTPUT = "E2E mock copy: fresh roasted coffee, delivered weekly.";

createServer((req, res) => {
  if (req.method !== "POST" || !req.url?.startsWith("/v1/messages")) {
    res.writeHead(200).end("ok");
    return;
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const { model } = JSON.parse(body);
    res.writeHead(200, { "content-type": "application/json" });
    res.end(
      JSON.stringify({
        id: "msg_e2e",
        type: "message",
        role: "assistant",
        model,
        content: [{ type: "text", text: MOCK_OUTPUT }],
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: { input_tokens: 812, output_tokens: 64 },
      }),
    );
  });
}).listen(4010, "127.0.0.1");
