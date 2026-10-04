// A stand-in for the Anthropic Messages API, streaming, for local tests only.
// It answers like the v9 engine: a JSON block, then Market and Value.
//
// Point the server at it: ANTHROPIC_API_KEY=mock ANTHROPIC_BASE_URL=http://127.0.0.1:4599
//
// The URL in the user message picks the answer:
//   "holding" -> wild-card, so the page goes by hand
//   "slow"    -> waits 6 seconds first, so the working screen can be seen
//   anything else -> a priced industry
// A Hebrew run gets the Man Ltd example from site/39 section M, word for word.
import http from "node:http";

const PORT = Number(process.env.MOCK_PORT || 4599);

const HE_MARKET =
  "Man Ltd מייבאת ומתחזקת מכונות ניקוי תעשייתיות מאז 1995, עבור מפעלים, מחסנים ורשתות קמעונאות. קונים טבעיים: מפיצי ציוד גדולים, היצרנים שהחברה מייצגת וקרנות השקעה. רשת השירות ומלאי החלפים עוברים לקונה במכירה.";
const HE_VALUE = [
  "positive: **ותק ופריסה ארצית.** צוות שירות מקצועי ומחסן חלפים בכל הארץ.",
  "positive: **הכנסות חוזרות משירות וחלפים.** הלקוחות תלויים בחברה לתיקונים, לתחזוקה ולחלקי חילוף.",
  "watch: **תלות ביצרנים זרים.** יצרן שיעבור למכירה ישירה או למפיץ אחר יפגע ברווחיות.",
];

function briefFor(url, hebrew) {
  const vertical = url.includes("holding") ? "wild-card" : "industrial-equipment-distribution";
  const meta = {
    company_name: "Man Ltd",
    company_oneliner: hebrew ? HE_MARKET.split(". ")[0] + "." : "Imports and services industrial cleaning machines.",
    vertical_matched: vertical,
    buyer_types: hebrew ? "" : "a larger distributor, a maker it represents, or a fund",
    readable: true,
  };
  const cards = hebrew
    ? ["## Market", HE_MARKET, "", "## Value", ...HE_VALUE]
    : [
        "## Market",
        "Man Ltd: industrial cleaning machines since 1995, serving plants and warehouses. Larger distributors and funds buy businesses like this for the service network.",
        "",
        "## Value",
        "positive: **National reach.** Service teams and a parts store across Israel.",
        "positive: **Repeat revenue.** Customers come back for service and parts.",
        "watch: **Foreign makers.** A maker that sells direct would hurt margins.",
      ];
  return ["```json", JSON.stringify(meta), "```", "", ...cards].join("\n");
}

http
  .createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", async () => {
      const json = JSON.parse(body || "{}");
      const msg = JSON.stringify(json.messages ?? "");
      const url = (msg.match(/URL: (\S+?)\\n|URL: (\S+?)"/) || [])[1] || msg;
      const hebrew = msg.includes("Write every card and every JSON text field in Hebrew");
      if (url.includes("slow")) await new Promise((r) => setTimeout(r, 6000));
      const text = briefFor(url, hebrew);
      res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" });
      const send = (event, data) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      send("message_start", {
        type: "message_start",
        message: { id: "msg_mock", type: "message", role: "assistant", content: [], model: json.model, stop_reason: null, stop_sequence: null, usage: { input_tokens: 4000, output_tokens: 1, cache_read_input_tokens: 0 } },
      });
      send("content_block_start", { type: "content_block_start", index: 0, content_block: { type: "server_tool_use", id: "srvtoolu_1", name: "web_search", input: {} } });
      send("content_block_stop", { type: "content_block_stop", index: 0 });
      send("content_block_start", { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } });
      for (let i = 0; i < text.length; i += 40) {
        send("content_block_delta", { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: text.slice(i, i + 40) } });
        await new Promise((r) => setTimeout(r, 15));
      }
      send("content_block_stop", { type: "content_block_stop", index: 1 });
      send("message_delta", { type: "message_delta", delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 300, server_tool_use: { web_search_requests: 1 } } });
      send("message_stop", { type: "message_stop" });
      res.end();
    });
  })
  .listen(PORT, () => console.log(`mock anthropic on ${PORT}`));
