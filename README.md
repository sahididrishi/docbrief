# docbrief

AI-powered document analysis CLI. Summarize, extract data, ask questions, review code, and compare files — all from your terminal using Claude.

Drop in any file (PDF, code, text, images, CSV) and get instant intelligence.

```bash
# Summarize a 50-page contract in seconds
docbrief summary contract.pdf

# Extract structured data from any document → JSON
docbrief extract meeting-notes.md

# Ask anything about a document
docbrief ask report.pdf "What were the Q3 revenue numbers?"

# Pull action items from meeting notes
docbrief actions meeting-transcript.txt

# AI code review with bug detection
docbrief review src/auth.ts

# Compare two documents
docbrief compare proposal-v1.pdf proposal-v2.pdf
```

## Why

Every day you deal with documents you don't have time to read thoroughly — contracts, reports, meeting transcripts, PRs, vendor proposals. Reading takes hours. Understanding takes longer.

`docbrief` gives you answers in seconds. Point it at any file and ask what you need.

## Installation

```bash
git clone https://github.com/sahididrishi/docbrief.git
cd docbrief
npm install
npm run build
```

Set your API key:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Get a key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys)

## Commands

### `summary` — Summarize any document

```bash
docbrief summary report.pdf
docbrief summary README.md --length short
docbrief summary contract.pdf --length long
```

Returns a structured summary with overview, key points, and takeaways. Supports `--length short|medium|long`.

### `extract` — Structured data extraction → JSON

```bash
docbrief extract invoice.pdf
docbrief extract meeting-notes.md
```

Extracts:
- **Dates** — deadlines, meeting dates, milestones
- **People** — names and roles mentioned
- **Organizations** — companies, teams, departments
- **Amounts** — monetary figures, quantities, metrics
- **Key facts** — decisions, statements, findings
- **Action items** — tasks, to-dos, follow-ups
- **Metadata** — anything else relevant

Output is clean JSON, pipe-able to `jq` or other tools:
```bash
docbrief extract notes.md | jq '.action_items'
```

### `ask` — Q&A about any document

```bash
docbrief ask contract.pdf "What is the termination clause?"
docbrief ask data.csv "What's the average order value?"
docbrief ask architecture.png "What databases are used?"
```

Works with text, PDFs, images, code — anything Claude can see. Cites the relevant sections in its answer.

### `actions` — Extract action items

```bash
docbrief actions meeting-transcript.txt
docbrief actions project-update.md
```

Pulls out every task, to-do, and follow-up with:
- What needs to be done
- Who's responsible
- Deadline (if mentioned)
- Priority (inferred from context)

### `review` — AI code review

```bash
docbrief review src/auth.ts
docbrief review utils.py --format json
```

Reviews code for:
- **Critical issues** — bugs, security vulnerabilities, correctness problems
- **Warnings** — performance issues, edge cases, maintainability concerns
- **Suggestions** — style improvements, better patterns
- **Strengths** — what the code does well

Includes a quality score (1-10) and specific line references. Use `--format json` for machine-readable output.

### `compare` — Compare two documents

```bash
docbrief compare proposal-v1.pdf proposal-v2.pdf
docbrief compare old-config.yaml new-config.yaml
docbrief compare requirements-v1.md requirements-v2.md
```

Analyzes similarities, differences, and what changed between two versions. Works across file types.

## Supported File Types

| Type | Extensions | How it's processed |
|------|-----------|-------------------|
| **PDF** | `.pdf` | Native Claude document understanding |
| **Images** | `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp` | Claude vision API |
| **Code** | `.ts`, `.js`, `.py`, `.go`, `.rs`, `.java`, `.rb`, `.swift`, `.c`, `.cpp`, `.php`, `.sql`, + 20 more | Language-aware with syntax context |
| **Text** | `.txt`, `.md`, `.csv`, `.json`, `.xml`, `.yaml`, `.html` | Direct text processing |

## Architecture

```
┌─────────────────────────────────────────────┐
│                 CLI (commander)              │
│  summary │ extract │ ask │ actions │ review  │
└────────────────────┬────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │     File Reader     │
          │  Detects type, reads│
          │  text or base64     │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │    Claude Client    │
          │  Streaming output   │
          │  JSON extraction    │
          │  Multi-file compare │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │   Anthropic API     │
          │   Claude Sonnet     │
          └─────────────────────┘
```

## Project Structure

```
docbrief/
├── src/
│   ├── index.ts      # CLI entry point — 6 commands with aliases
│   ├── commands.ts    # Command implementations with tailored prompts
│   ├── claude.ts      # Anthropic SDK wrapper — streaming, JSON, multi-file
│   ├── reader.ts      # Smart file reader — 30+ formats, type detection
│   └── types.ts       # TypeScript interfaces
├── dist/              # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Options

| Flag | Description | Available on |
|------|-------------|-------------|
| `-l, --length` | Summary length: `short`, `medium`, `long` | `summary` |
| `-f, --format` | Output format: `text`, `json` | `review` |
| `-m, --model` | Override Claude model | All commands |

## Real-world Use Cases

**Freelancers & Agencies**
- Summarize client briefs before kickoff calls
- Extract deliverables and deadlines from SOWs
- Compare contract versions before signing

**Developers**
- AI code review before submitting PRs
- Understand unfamiliar codebases fast
- Compare config files across environments

**Product & Project Managers**
- Extract action items from meeting recordings
- Summarize long Slack threads or email chains
- Compare requirement docs across versions

**Legal & Finance**
- Extract key terms from contracts
- Pull financial figures from reports
- Compare policy versions

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript (strict mode) |
| AI | Anthropic Claude API via `@anthropic-ai/sdk` |
| CLI | Commander.js |
| Features | Streaming output, PDF/image support, structured JSON extraction |

## License

MIT
