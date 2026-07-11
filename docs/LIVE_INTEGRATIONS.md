# Live integrations

The app runs offline by default. Set the following values in a local `.env`
(which is ignored by Git) to make the Director's Local Scout and durable taste
memory live:

Set `LINKUP_API_KEY` and `MEM0_API_KEY` in that local file. The committed
[`.env.example`](../.env.example) lists the variable names with blank values.

Set `HERMES_LIVE_CULTURE=true` alongside an `OPENAI_API_KEY` to use the
OpenAI-backed Culture Concierge. It uses the existing shared OpenAI client and
is deliberately opt-in, so deterministic tests never call a model API.

`LinkupScout` calls Linkup Search with bearer authentication and turns returned
results into date-spread itinerary activities. Each candidate retains its
`sourceUrl`, so the Board can display the source that grounded it.

`HostedMem0Client` stores the structured Hermes traveller profile as a scoped
Mem0 memory and keeps an in-process cache so an onboarded traveller can plan
immediately while Mem0 processes the write.

The local Codex configuration registers Linkup's hosted MCP endpoint with
`LINKUP_API_KEY` as its bearer-token environment variable. Restart Codex after
changing that configuration. Mem0 is consumed as its documented HTTP API—not
as an MCP server—because `https://api.mem0.ai/v1` is a REST endpoint rather
than an MCP tool endpoint.

Never put either key in a URL, source file, or committed configuration.
