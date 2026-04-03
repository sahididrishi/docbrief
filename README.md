# docbrief

AI-powered document analysis from your terminal. Summarize, extract data, ask questions, review code, find PII, translate, compare, and rewrite — using Claude.

Drop in any file. Get instant intelligence.

```bash
docbrief summary contract.pdf                          # Summarize a 50-page contract
docbrief extract meeting-notes.md                      # Pull out dates, people, action items → JSON
docbrief ask report.pdf "What was Q3 revenue?"         # Ask anything about any document
docbrief chat paper.pdf                                # Interactive Q&A session
docbrief review src/auth.ts                            # AI code review with bug detection
docbrief redact customer-data.csv                      # Find PII and sensitive data
docbrief translate proposal.md Japanese                # Translate to any language
docbrief rewrite email.txt --tone formal               # Rewrite for a different audience
cat error.log | docbrief ask - "What caused the crash" # Pipe anything from stdin
docbrief batch src/                                    # Review all code in a directory
```

## The Problem

You deal with documents you don't have time to read — contracts, reports, meeting transcripts, PRs, vendor proposals, error logs. Reading takes hours. Understanding takes longer.

**docbrief** gives you answers in seconds.

## Commands

### `summary` — Summarize any document

```bash
docbrief summary report.pdf
docbrief summary README.md --length short
docbrief summary contract.pdf --length long -o summary.md
```

Structured output: overview, key points, and takeaway. Supports `short`, `medium`, `long`.

### `extract` — Structured data extraction → JSON

```bash
docbrief extract invoice.pdf
docbrief extract meeting-notes.md -o data.json
```

Pulls out: dates, people, organizations, monetary amounts, key facts, action items, and metadata. Output is clean JSON — pipe it to `jq`:

```bash
docbrief extract notes.md | jq '.action_items'
```

### `ask` — Question any document

```bash
docbrief ask contract.pdf "What is the termination clause?"
docbrief ask data.csv "What's the average order value?"
docbrief ask architecture.png "What databases are shown?"
```

Works with text, PDFs, images, code, CSV — anything. Cites relevant sections.

### `chat` — Interactive Q&A session

```bash
docbrief chat research-paper.pdf
```

```
You: What methodology did they use?
Claude: They used a randomized controlled trial with...

You: How large was the sample?
Claude: The study included 2,847 participants across...

You: exit
```

Load a document once, ask unlimited follow-up questions. Full conversation context maintained.

### `actions` — Extract action items

```bash
docbrief actions meeting-transcript.txt
docbrief actions project-update.md -o todos.md
```

Every task, to-do, and follow-up with owner, deadline, and priority.

### `review` — AI code review

```bash
docbrief review src/auth.ts
docbrief review utils.py --format json
git diff | docbrief review -                  # Review uncommitted changes
```

Finds: bugs, security vulnerabilities, performance issues, and suggests improvements. Includes quality score (1-10) and line references.

### `batch` — Review an entire directory

```bash
docbrief batch src/
docbrief batch ./lib --usage
```

Scans all code files in a directory (skips node_modules, .git, dist). Gives a brief review of each file, focused on critical issues.

### `compare` — Diff two documents

```bash
docbrief compare proposal-v1.pdf proposal-v2.pdf
docbrief compare old-config.yaml new-config.yaml
```

Analyzes similarities, differences, and what changed. Works across any file types.

### `translate` — Translate to any language

```bash
docbrief translate README.md Spanish
docbrief translate contract.pdf Japanese -o contract-ja.md
docbrief translate api-docs.md "Brazilian Portuguese"
```

Preserves formatting. For code files, translates only comments and strings.

### `redact` — Find PII and sensitive data

```bash
docbrief redact customer-data.csv
docbrief redact config.env --format json
cat server.log | docbrief redact -
```

Scans for: emails, phone numbers, SSNs, credit card numbers, API keys, passwords, IP addresses, physical addresses, dates of birth, financial data, and medical information. Categorized by risk level with recommendations.

### `rewrite` — Change tone or audience

```bash
docbrief rewrite email.txt --tone formal
docbrief rewrite technical-doc.md --tone simple --audience "non-technical stakeholders"
docbrief rewrite blog-post.md --tone persuasive -o polished.md
```

Available tones: `formal`, `casual`, `technical`, `simple`, `persuasive`.
Audience examples: `executive`, `developer`, `student`, `client`, or any custom description.

## Pipe Support (stdin)

Every command accepts `-` to read from stdin:

```bash
# Review a git diff
git diff | docbrief review -

# Summarize command output
kubectl logs pod-name | docbrief summary -

# Extract data from curl response
curl -s api.example.com/report | docbrief extract -

# Ask about an error log
cat /var/log/app.log | docbrief ask - "What's causing the 500 errors?"
```

## Global Options

Every command supports:

| Flag | Description |
|------|-------------|
| `-m, --model <model>` | Override Claude model (e.g. `claude-opus-4-5-20250514`) |
| `-o, --output <file>` | Write output to a file |
| `-u, --usage` | Show token count and estimated API cost |

## Supported File Types

| Type | Extensions | Processing |
|------|-----------|------------|
| **PDF** | `.pdf` | Native Claude document understanding |
| **Images** | `.png` `.jpg` `.gif` `.webp` | Claude vision API |
| **Code** | `.ts` `.js` `.py` `.go` `.rs` `.java` `.rb` `.swift` `.c` `.cpp` `.php` `.sql` + 30 more | Language-aware analysis |
| **Data** | `.csv` `.json` `.xml` `.yaml` `.toml` | Structured data processing |
| **Text** | `.txt` `.md` `.html` | Direct text analysis |
| **Stdin** | `-` | Pipe anything in |

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

Get a key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).

### Verify

```bash
npm test           # Run tests
docbrief --help    # See all commands
```

### Global install (optional)

```bash
npm link    # Makes 'docbrief' available globally
```

## Architecture

```
┌───────────────────────────────────────────────────┐
│                  CLI (commander.js)               │
│                                                   │
│  summary · extract · ask · chat · actions ·       │
│  review · batch · compare · translate ·           │
│  redact · rewrite                                 │
└────────────────────┬──────────────────────────────┘
                     │
     ┌───────────────┼────────────────┐
     ▼               ▼                ▼
┌─────────┐   ┌────────────┐   ┌───────────┐
│ Reader  │   │  Commands  │   │ Formatter │
│         │   │            │   │           │
│ File I/O│   │ Prompts &  │   │ ANSI color│
│ Stdin   │   │ logic for  │   │ Usage     │
│ Type    │   │ each cmd   │   │ Headers   │
│ detect  │   │            │   │ Spinner   │
└─────────┘   └─────┬──────┘   └───────────┘
                    │
              ┌─────▼──────┐
              │   Claude   │
              │   Client   │
              │            │
              │ Streaming  │
              │ JSON parse │
              │ Multi-turn │
              │ Multi-file │
              │ Usage track│
              └─────┬──────┘
                    │
              ┌─────▼──────┐
              │ Anthropic  │
              │    API     │
              └────────────┘
```

## Project Structure

```
docbrief/
├── src/
│   ├── index.ts       # CLI entry — 11 commands with aliases and global options
│   ├── commands.ts    # All command implementations with tailored prompts
│   ├── claude.ts      # Anthropic SDK — streaming, JSON, multi-turn, usage tracking
│   ├── reader.ts      # File reader — 50+ formats, stdin, directory scanning
│   ├── formatter.ts   # Terminal output — ANSI colors, usage display, spinners
│   ├── types.ts       # TypeScript interfaces
│   └── errors.ts      # Custom error hierarchy (AuthError, FileError, RateLimitError)
├── tests/
│   ├── reader.test.ts    # 16 tests — file detection, reading, formatting, scanning
│   ├── claude.test.ts    # 6 tests — buildFileContent for all file types
│   ├── errors.test.ts    # 5 tests — error hierarchy, exit codes, inheritance
│   └── formatter.test.ts # 10 tests — color helpers, pricing lookup
├── dist/              # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

## Real-world Use Cases

**Freelancers & Agencies**
- `docbrief summary sow.pdf` — Understand a 30-page SOW in 30 seconds
- `docbrief extract contract.pdf | jq '.amounts'` — Pull all financial terms
- `docbrief redact proposal.md` — Check for PII before sending

**Developers**
- `git diff | docbrief review -` — Review your own changes before PR
- `docbrief batch src/` — Quick audit of an entire codebase
- `docbrief ask package.json "what are the peer dependencies?"` — Quick answers

**Product & Project Managers**
- `docbrief actions meeting-recording.txt` — Auto-extract action items
- `docbrief chat requirements.pdf` — Dig into requirements interactively
- `docbrief compare spec-v1.md spec-v2.md` — What changed between versions?

**Legal & Compliance**
- `docbrief redact customer-export.csv --format json` — Audit PII exposure
- `docbrief ask contract.pdf "What are the liability limitations?"` — Instant answers
- `docbrief translate agreement.pdf Spanish` — Bilingual contract support

## Tech Stack

| Component | Technology |
|-----------|------------|
| Language | TypeScript (strict mode) |
| AI | Claude API via `@anthropic-ai/sdk` |
| CLI | Commander.js |
| Output | ANSI terminal colors (no dependencies, respects `NO_COLOR`) |
| Tests | Node.js built-in test runner (37 tests) |
| Features | Streaming, multi-turn chat, PDF/image support, stdin pipes, token tracking, file output |

## License

MIT
