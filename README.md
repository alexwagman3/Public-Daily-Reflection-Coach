# Reflection Coach

A small, pluggable multi-turn reflection coach. The backend is a Cloudflare
Worker that wraps DeepSeek's reasoning model (`deepseek-reasoner`) behind a
structured reflection framework. The value system — *which* traits the coach
guides you through and *how* — is loaded from a single JSON file, so you can
swap in any set of virtues, leadership competencies, habit categories, OKRs,
team values, etc. without touching the request/response code.

The default config ships with the four cardinal Stoic virtues
(**wisdom**, **courage**, **justice**, **temperance**), each with a 3-step
framework and a closing quote.

## What it does

For each turn:

1. The client POSTs the trait key and the running transcript.
2. The Worker:
   - Returns a deterministic opener if no user turn exists yet (no API call spent).
   - Otherwise builds a system prompt from `config/traits.json` and forwards
     the transcript to DeepSeek Reasoner.
3. The coach is instructed to:
   - Work one framework step at a time
   - Push back on surface-level answers
   - Announce step transitions by name
   - End with a brief synthesis tied to the trait's closing quote

State lives on the client — the Worker is stateless.

## Architecture

```
src/index.js        Router. GET /api/traits, POST /api/reflect, OPTIONS.
src/reflect.js      Reflect handler: validates, builds prompt, calls model.
src/prompt.js       System-prompt + opener builders (pure functions).
config/traits.json  The value system (system metadata + traits).
web/                Vanilla HTML/CSS/JS frontend. Drop on GitHub Pages.
```

The Worker has two endpoints:

| Method | Path           | Purpose                                     |
| ------ | -------------- | ------------------------------------------- |
| GET    | `/api/traits`  | List traits + value-system metadata         |
| POST   | `/api/reflect` | One conversation turn (see `examples/curl.md`) |

## Customizing the value system

Open `config/traits.json`. The shape is:

```jsonc
{
  "system": {
    "name": "Stoic Virtues",
    "description": "...",
    "coachPersona": "philosophical reflection coach trained in the Stoic tradition",
    "goalStatement": "Help the user practice the chosen virtue ...",
    "anchorLabel": "quote"           // "quote", "principle", "verse", "mantra"...
  },
  "traits": {
    "<key>": {
      "name": "Wisdom",
      "descriptors": "Discerning · Prudent · Clear-Seeing",
      "framework": "Decision Dissection",
      "recall": "Recall a decision you made today ...",
      "steps": [
        { "label": "Observe", "prompt": "..." },
        { "label": "Consult", "prompt": "..." },
        { "label": "Extract", "prompt": "..." }
      ],
      "remember": "Wisdom is loving the right things in the right order.",
      "anchor": "\"...\" — Seneca"
    }
  }
}
```

To swap in your own value system, replace the contents. Examples:

- **Leadership competencies**: `clarity`, `decisiveness`, `empathy`, `ownership`
- **Habit categories**: `sleep`, `movement`, `focus`, `nutrition`
- **OKRs**: one trait per quarterly objective, steps = key-result reflection
- **Team values**: whatever your team posted on the wall last off-site

Three steps per framework is the recommended default; the prompt template
handles any number.

## Local setup

Requires Node 20+.

```bash
npm install
cp .dev.vars.example .dev.vars   # then edit DEEPSEEK_API_KEY
npm run dev                       # wrangler dev on http://localhost:8787
```

Get a DeepSeek API key at <https://platform.deepseek.com/>. The endpoint
called is the OpenAI-compatible `https://api.deepseek.com/chat/completions`,
so swapping in another OpenAI-compatible provider (OpenAI, Together, Groq,
self-hosted) is a one-line change in `src/reflect.js`.

## Deploying the Worker

```bash
# Set production secret (do NOT put the key in wrangler.toml)
npx wrangler secret put DEEPSEEK_API_KEY

# Optional: lock down browser origins
# Edit ALLOWED_ORIGIN in wrangler.toml to your frontend's URL

npm run deploy
```

This deploys to `https://<name>.<your-subdomain>.workers.dev` on the free
Workers plan (100k requests/day).

## Deploying the frontend (free, no Cloudflare account needed)

The `web/` directory is plain HTML/CSS/JS — no build step. The easiest free
host is **GitHub Pages**:

1. Push this repo to GitHub.
2. In repo **Settings → Pages**, set **Source** to your branch and
   **Folder** to `/web`. (Or move `web/*` to a `/docs` folder, or push to a
   `gh-pages` branch — whichever you prefer.)
3. Visit `https://<your-username>.github.io/<repo-name>/`.
4. Paste your Worker's URL into the **API base URL** field. It's saved in
   `localStorage`.

Alternatives (also free, similarly drop-in): Netlify Drop, Vercel,
Cloudflare Pages. The frontend has no environment variables and no
framework, so any static host will work.

> **CORS note.** If you set `ALLOWED_ORIGIN` in `wrangler.toml` to a specific
> origin, your Pages URL must match exactly (including `https://` and no
> trailing slash).

## Sample request / response

Request:

```http
POST /api/reflect
Content-Type: application/json

{
  "trait": "courage",
  "messages": [
    { "role": "assistant", "content": "We're going to work the **Discipline of Bravery** ..." },
    { "role": "user",      "content": "I avoided telling a teammate their PR design won't work." }
  ]
}
```

Response:

```json
{
  "result": "**Surface** — name the specific fear. When you imagined sending that message, what were you actually afraid would happen — that they'd push back, that the team would side with them, something else?"
}
```

See `examples/curl.md` for a full multi-turn walkthrough.

## License

MIT — see `LICENSE`.
