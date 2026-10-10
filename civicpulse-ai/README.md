# CivicPulse AI

**From scattered reports to structured action.** HACKBIOS 2K26, Team Nexvanta (Md Aarif, Manish Kumar, Mantu Kumar, Satyam Kumar). Track: AI / ML.

CivicPulse AI takes text, photo and voice reports about local problems, extracts structured details, finds semantically related reports, groups them into one issue, aggregates the evidence, and generates an issue brief and dashboard. It is **AI-assisted decision support**: groupings and briefs are suggestions that a person must verify. It uses the Gemini API (no model is trained by us) and does not claim perfect accuracy.

## Features
- Report submission: text, image upload, voice (browser recording or audio upload). No personal data required.
- AI analysis: category, title, location, severity, affected area, key entities, evidence, confidence.
- Related-report detection: embeddings + cosine similarity + location similarity.
- Issue clustering with evidence aggregation, timeline, and AI brief (clearly labelled "AI-generated", separate from "User-submitted" evidence).
- Dashboard: stats, consolidated-issue moment, issue list, schematic campus map, category chart, recent reports.
- Human verification: "Mark as verified" / "Mark resolved" on every issue.
- **Demo Mode** (default): everything works with no API key.

## Architecture
```
Report (text / image / voice)
  -> POST /api/reports        validate + store upload
  -> analysis.js              Gemini (or rule-based fallback): structured extraction
  -> similarity.js            embedding (Gemini or concept vector) + cosine + location score
  -> clustering.js            join best issue if score >= threshold, else open new issue
  -> brief.js                 AI brief (Gemini or template)
  -> React dashboard          issues, evidence, timeline, map
```
Combined similarity = 0.75 x text similarity + 0.25 x location similarity. Reports in different categories are capped unless text similarity is very high. Threshold: 0.55 (Demo Mode), 0.74 (Gemini); override with `SIMILARITY_THRESHOLD`.

## Tech stack
React 18 + Vite, React Router, lucide-react, plain CSS. Node.js + Express + Multer. Gemini API called from the backend over REST. Storage: a JSON file (`server/data/db.json`) behind `server/src/services/store.js`, so it can be swapped for Firebase or Supabase without touching the rest of the code. (The pitch deck lists Firebase/Supabase; this MVP deliberately uses a local file so it runs with zero setup.)

## Folder structure
```
civicpulse-ai/
  package.json            npm workspaces + scripts
  .env.example
  client/                 React app (src/components, pages, services, hooks, data, utils)
  server/
    src/index.js          Express app
    src/config.js         env + mode
    src/routes/           API routes
    src/controllers/      reports, issues, system
    src/services/         gemini, analysis, similarity, clustering, brief, store, demo
    src/utils/            text rules, upload validation, errors
    data/                 db.json (created at runtime)
    uploads/              uploaded files (created at runtime)
```

## Installation
Requires Node.js 18.17 or newer.
```bash
npm install
cp .env.example .env     # optional: the defaults already run Demo Mode
npm run dev
```
Open **http://localhost:5173** (the API runs on http://localhost:5050).

Production-style run (Express serves the built client on one port):
```bash
npm start                # builds the client, then serves everything at http://localhost:5050
```
Run parts separately: `npm run dev -w server` and `npm run dev -w client`.

## Environment variables (`.env` in the project root)
| Variable | Default | Purpose |
|---|---|---|
| `DEMO_MODE` | `true` | `true` = no external calls. Set `false` to use Gemini. |
| `GEMINI_API_KEY` | empty | Key from https://aistudio.google.com/apikey. Backend only. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Model for analysis and briefs. |
| `GEMINI_EMBEDDING_MODEL` | `gemini-embedding-001` | Model for embeddings. |
| `PORT` | `5050` | API port. |
| `SIMILARITY_THRESHOLD` | auto | Grouping threshold (0 to 1). |

## Enable Gemini
1. Put your key in `.env`: `GEMINI_API_KEY=...` and set `DEMO_MODE=false`.
2. Restart `npm run dev`. The sidebar shows **AI Connected** only after a real call succeeds; if a call fails it shows **AI unavailable** and falls back to rule-based logic for that report. If the key is missing it stays in **Demo Mode**.
3. If model names change, override `GEMINI_MODEL` / `GEMINI_EMBEDDING_MODEL`.

## How Demo Mode works
- Analysis: keyword/topic rules and a place lexicon (clearly labelled "Demo Mode rules (no AI call)").
- Embeddings: a deterministic concept-aware vector (so "flooded entrance", "drainage blocked near gate" and "standing water at the gate" land close together).
- Briefs: templates filled from the grouped reports.
- Images and audio are stored but not analyzed; audio is not transcribed.
- Demo images are generated illustrations, labelled as such.

## API
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/status` | Mode and AI connection state |
| GET | `/api/stats` | Dashboard numbers |
| POST | `/api/reports` | Submit (multipart: `description`, `location`, `category`, `image`, `audio`; `autoProcess=false` to skip AI) |
| GET | `/api/reports`, `/api/reports/:id` | List / detail |
| GET | `/api/reports/:id/related` | Ranked similar reports with scores |
| POST | `/api/analyze` | `{reportId}` analyze and store, or `{text, location}` preview |
| POST | `/api/cluster` | `{reportId}` join or create issue |
| GET | `/api/issues`, `/api/issues/:id` | List / detail with reports and evidence |
| POST | `/api/issues/:id/verify` | Human verification |
| POST | `/api/issues/:id/status` | `{status}`: Needs Verification, Verified, Resolved |
| POST | `/api/demo/load`, `/api/demo/reset` | Load 12 demo reports / clear everything |

## Demo walkthrough (2 minutes)
1. Open the dashboard, click **Load demo data**. 12 reports appear as separate, unanalyzed items.
2. Click **Run AI pipeline**. Watch each report get analyzed, compared and grouped. The summary shows "Related reports detected".
3. Click **View consolidated issue**: "Waterlogging near College Gate", 8 reports, 3 images, High severity, Needs verification.
4. Point out the dashed **AI-generated** brief versus the **User-submitted** evidence, and the timeline.
5. Open a supporting report, click **Find related reports** to show scores. Note the pipe-leak report in Hostel Block A is correctly *not* grouped with the gate flooding.
6. **Submit report**: use a sample ("The entrance road is flooded after rain"). It joins the existing issue (9 reports).
7. Click **Mark as verified** to show the human-in-the-loop step.

## Security notes
Secrets only in `.env` (git-ignored) and used only by the backend. Uploads: MIME allow-list, 8 MB limit, server-generated file names, `nosniff` header. Input is length-limited and sanitized; errors returned to the client are generic.

## Troubleshooting
- **Port in use**: set `PORT` in `.env` and update the proxy targets in `client/vite.config.js`.
- **Sidebar shows "Server offline"**: the backend is not running; use `npm run dev` from the project root.
- **"AI unavailable"**: check the key, quota and model names; details appear on hover and in the server log. Reports still process using fallback logic.
- **Microphone blocked**: allow it in the browser (needs localhost or HTTPS) or upload an audio file.
- **Start fresh**: click Clear on the dashboard, or delete `server/data/db.json`.

## Known limitations
Rule-based Demo Mode only recognizes a fixed set of topics. Clustering can group or split incorrectly; that is why verification exists. JSON-file storage is single-user. The map is schematic, not geolocated. Voice transcription needs Gemini.
