# Local show preparation and Restream

Use local Codex or Claude to read this repo, its `skills/` contracts and the sibling vault. The CLI saves an episode draft containing metadata and a complete source board. Restream MCP handles scheduling after account authorization. There is no Show app MCP in this workflow.

## Prepare and save

Before drafting, follow the [episode opening and planned Shorts format](show-prep/editorial-format.md).
Choose one central founder question, prepare 3–5 standalone Shorts angles inside
the source segments, and include at least one evidence-backed controversial
question per episode. Carry their entry, challenge and payoff cues into `$cues`;
use `$clips` after recording to verify the actual cuts and timestamps.

From the repository root:

```sh
bun run show:prep context --store local --date 2026-09-29
bun run show:prep preview --store local --file docs/show-prep/next-model-workflow/draft.json
bun run show:prep save --store local --file docs/show-prep/next-model-workflow/draft.json --if-revision new
bun run show:prep get --store local --id next-model-workflow
```

`context` reads only the requested preparation date; it never chooses a nearby episode. The last stream was recorded September 29 and published September 30, so its topic date is September 29. Read its own transcript and the recap's separate edit clock in the vault.

For an existing draft, pass the exact `revision` returned by preview rather than `new`. Stale changes fail. A repeated identical save is a no-op. Local saves use an exclusive lock and atomic rename; Blob updates use ETag preconditions. Preview includes the whole proposed draft and the names of changed fields.

Local working records live in `apps/app/data/show-prep/` (ignored by Git). `SHOW_PREP_DIR` can select another local directory; use an absolute path. Publish selected reusable examples under `docs/show-prep/`. `DATA_DIR` overrides the existing topic directory.

`--store local` disables Blob credentials for that command. `--store blob` requires an existing `BLOB_READ_WRITE_TOKEN` for the intended store and never falls back to local data. Do not put the token in a command, draft, Git commit or chat. This workflow does not fetch or change Vercel environment files. Blob drafts use `livestream/show-prep/<id>.json`. Topic `context` combines tracked baseline topics with the Upstash Redis overlay (topics and overrides added in the app) when `PRODUCER_STORAGE=redis` and `KV_REST_API_URL`/`KV_REST_API_TOKEN` are set for the command, and fails on Redis read errors; without them it returns only the tracked baseline topics.

These episode drafts are separate from the app's current topic cards. Saving a draft does not populate the cohost screen, edit historical topics, create a platform event or publish anything. Connecting episode drafts to that screen remains #57.

## Draft shape

```json
{
  "id": "next-model-workflow",
  "title": "Cheaper AI. More Agents. What Actually Ships?",
  "description": "The viewer promise and episode links.",
  "sourceEpisodeDate": "2026-09-29",
  "rundownFile": "rundown.md",
  "scheduledFor": null,
  "timezone": "Europe/Malta",
  "destinations": [],
  "restream": null
}
```

Input accepts `rundownFile`, relative to the input JSON, or `rundown` text. The saved record always contains the text. The title is limited to 100 characters and description to 5,000; validate destination-specific limits when scheduling. `scheduledFor` must include seconds and a UTC offset if set. A null time and empty destinations mean unscheduled preparation, not inferred choices.

After scheduling, set `restream` to `{"eventId":"returned-id","links":["https://..."]}` and save with the current revision. Preserve that identity when editing the preparation; the saver rejects accidental removal/replacement. Read the saved draft before making later edits.

## Connect your account

Checked 2026-10-02: Restream provides an official hosted OAuth MCP and [connection documentation](https://mcp.restream.io/docs-connect). Its official [Cursor plugin](https://github.com/restreamio/cursor-mcp-plugin) bundles configuration; Codex and Claude can use the endpoint directly without a separate skill install.

The endpoint is already registered as `restream` in Vincent's local Codex configuration. Authentication has not been verified from this chat. In a terminal:

```sh
codex mcp login restream
```

Complete Restream's sign-in/authorization in the browser. Open a fresh Codex chat if the tool list has not refreshed, then ask it to list your connected Restream channels. Successful channel listing is the connection check; a configuration entry alone is not evidence of authorization. For another machine, register it first with `codex mcp add restream --url https://mcp.restream.io/mcp`.

For Claude, configure the ship account explicitly:

```sh
CLAUDE_CONFIG_DIR="$HOME/.claude-shipshitdev" "$HOME/.local/bin/claude" mcp add --transport http --scope user restream https://mcp.restream.io/mcp
claude-ship
```

Inside that account's Claude session, run `/mcp`, choose Restream and authenticate. Then list connected channels. Configuration and OAuth remain separate per client/account. These setup commands do not call a Claude model. See [Claude's MCP documentation](https://code.claude.com/docs/en/mcp) and [Codex MCP documentation](https://developers.openai.com/codex/mcp).

## Schedule the selected show

Load the saved title, description and rundown locally. Specify the final time/timezone, stream source and exact connected destinations. Through Restream MCP, inspect the account/channels, reuse an existing event ID or create the event, attach the selected destinations and schedule it. Check platform-specific details before enabling external scheduled broadcasts. Read the resulting event and destinations back, then save its ID and links into the episode record.

Restream provides tools for those actions; availability depends on connected channels and plan. This command never invokes them itself. Avoid scheduling the same episode separately through direct YouTube automation. Scheduling a live Studio event reserves its time; the hosts still start their live broadcast. See the [official tool reference](https://developers.restream.io/mcp-server).
