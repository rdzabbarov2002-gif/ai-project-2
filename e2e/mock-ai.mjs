// Stand-in for the AI providers in the end-to-end tests. The app reaches it
// through OPENAI_BASE_URL (the OpenAI Responses API, the default provider)
// and ANTHROPIC_BASE_URL (Claude's Messages API), both set in
// playwright.config.ts, so the tests are free, fast and deterministic.
// Every request gets the same short text and a fixed token usage, in that
// API's shape. MOCK_AI_DELAY_MS makes each answer take that long, like a
// real call (the load smoke test).
import { createServer } from "node:http";

const MOCK_OUTPUT = "E2E mock copy: fresh roasted coffee, delivered weekly.";
const DELAY_MS = Number(process.env.MOCK_AI_DELAY_MS ?? 0);

const openaiResponse = (model) => ({
  id: "resp_e2e",
  object: "response",
  created_at: Math.floor(Date.now() / 1000),
  status: "completed",
  model,
  output: [
    {
      type: "message",
      id: "msg_e2e",
      status: "completed",
      role: "assistant",
      content: [{ type: "output_text", text: MOCK_OUTPUT, annotations: [] }],
    },
  ],
  usage: {
    input_tokens: 812,
    input_tokens_details: { cached_tokens: 0 },
    output_tokens: 64,
    output_tokens_details: { reasoning_tokens: 0 },
    total_tokens: 876,
  },
});

const anthropicMessage = (model) => ({
  id: "msg_e2e",
  type: "message",
  role: "assistant",
  model,
  content: [{ type: "text", text: MOCK_OUTPUT }],
  stop_reason: "end_turn",
  stop_sequence: null,
  usage: { input_tokens: 812, output_tokens: 64 },
});

function answerFor(req) {
  if (req.method !== "POST") return null;
  if (req.url?.startsWith("/v1/responses")) return openaiResponse;
  if (req.url?.startsWith("/v1/messages")) return anthropicMessage;
  return null;
}

createServer((req, res) => {
  const answer = answerFor(req);
  if (!answer) {
    res.writeHead(200).end("ok");
    return;
  }
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", async () => {
    const { model } = JSON.parse(body);
    if (DELAY_MS) await new Promise((resolve) => setTimeout(resolve, DELAY_MS));
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(answer(model)));
  });
}).listen(4010, "127.0.0.1");
