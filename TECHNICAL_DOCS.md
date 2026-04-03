# Technical Documentation: docbrief

*A comprehensive guide for understanding, using, and extending docbrief -- written for curious humans of all backgrounds.*

---

## 1. What This Project Does

### Plain English Explanation

Imagine you have a pile of documents on your desk -- contracts, code files, meeting notes, reports, spreadsheets. Reading them all would take hours. Now imagine you could hand each document to a very smart assistant who reads it instantly and answers your questions.

That is what **docbrief** does, except your desk is your computer terminal, the documents are files on your hard drive, and the smart assistant is Claude, an AI made by Anthropic.

You type a command like:

```bash
docbrief summary contract.pdf
```

And within seconds, you get a structured summary of a 50-page contract -- without opening the file yourself.

### What Problem It Solves

People drown in documents they do not have time to read. A developer gets a 2,000-line pull request. A project manager receives a 40-page requirements document. A lawyer needs to find one clause in a 100-page contract.

docbrief turns hours of reading into seconds of waiting. It does not replace careful human review for critical decisions, but it gives you a fast first pass so you know where to focus your attention.

### Real-World Use Cases

| Scenario | Command | What Happens |
|----------|---------|-------------|
| Understand a long contract | `docbrief summary contract.pdf` | Get a structured summary with key points |
| Pull financials from an invoice | `docbrief extract invoice.pdf` | Get dates, amounts, and parties as JSON |
| Ask about a specific clause | `docbrief ask contract.pdf "What is the termination clause?"` | Get a direct answer citing the relevant section |
| Review your own code before a PR | `git diff \| docbrief review -` | Get a code review of your uncommitted changes |
| Find sensitive data before sharing | `docbrief redact customer-data.csv` | Get a report of emails, SSNs, API keys, etc. |
| Translate docs for a global team | `docbrief translate README.md Japanese` | Get the full document translated, formatting preserved |
| Interactive research session | `docbrief chat research-paper.pdf` | Load a document once, ask unlimited follow-ups |

### How It Uses Claude AI Under the Hood

Every command in docbrief follows the same basic pattern:

1. **Read** the file from your computer
2. **Prepare** it in a format Claude can understand (text, base64-encoded PDF, or base64-encoded image)
3. **Send** it to the Claude API with a carefully written instruction (called a "prompt")
4. **Stream** Claude's response back to your terminal, character by character, so you see it appear in real time
5. **Optionally** save the output to a file or display token usage and cost

The "intelligence" comes entirely from the Claude API. docbrief is the plumbing that connects your files to that intelligence and presents the results in a useful way.

---

## 2. How the Claude API Works

### What Is an API in Simple Terms

An API (Application Programming Interface) is like a restaurant waiter. You (the customer) do not walk into the kitchen and cook your own food. Instead, you tell the waiter what you want (place an order), the waiter takes your order to the kitchen (the server), and the kitchen sends your food back through the waiter.

In this analogy:
- **You** = docbrief (the program running on your computer)
- **The waiter** = the internet and HTTP protocol
- **The kitchen** = Anthropic's servers running Claude
- **Your order** = a JSON message containing your document and instructions
- **Your food** = Claude's response

### The Anthropic Messages API

docbrief uses the Anthropic Messages API. Here is how a basic interaction works:

```
Your computer                          Anthropic's servers
     |                                        |
     |  POST /v1/messages                     |
     |  {                                     |
     |    model: "claude-sonnet-4-20250514",  |
     |    system: "You are an expert...",      |
     |    messages: [{                         |
     |      role: "user",                      |
     |      content: [file + instruction]      |
     |    }],                                  |
     |    max_tokens: 8192                     |
     |  }                                      |
     | -------------------------------------> |
     |                                        |  Claude reads
     |                                        |  your document
     |                                        |  and thinks...
     |  <----- streaming text chunks -------- |
     |  <----- streaming text chunks -------- |
     |  <----- final message + usage -------- |
```

The key fields:
- **model**: Which version of Claude to use (like choosing between different restaurant chefs)
- **system**: A hidden instruction that shapes Claude's behavior ("You are a document analysis expert...")
- **messages**: The conversation -- your document and question
- **max_tokens**: The maximum length of Claude's response

### Streaming: Why It Matters

There are two ways to get a response from an API:

1. **Non-streaming**: You wait in silence, then get the entire response at once. Like ordering food and staring at an empty table for 20 minutes.
2. **Streaming**: You get the response piece by piece as it is generated. Like watching a chef prepare your meal through a glass window.

docbrief uses streaming for most commands because:
- It **feels faster** -- you see text appearing immediately instead of waiting
- Long documents can take 10-30 seconds to analyze; staring at a blank screen for that long is unpleasant
- If something goes wrong, you see partial output immediately rather than waiting and getting nothing

In code, streaming looks like this (from `claude.ts`):

```typescript
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text);  // Print each chunk immediately
  }
}
```

Each `event` is a small piece of Claude's response -- maybe a word, maybe a sentence fragment. The `for await` loop processes them as they arrive, like reading a message as someone types it.

### Content Blocks: How Claude "Sees" Different File Types

When you send a message to Claude, it is not just plain text. The message contains **content blocks** -- think of them as different types of attachments:

| Block Type | Used For | How It Works |
|-----------|----------|-------------|
| `text` | Plain text, code, CSV, Markdown | The file content is sent as a string, optionally wrapped in code fences |
| `document` | PDFs | The PDF is converted to base64 (a text encoding of binary data) and sent as a document block. Claude can read the PDF natively. |
| `image` | PNG, JPEG, GIF, WebP | The image is converted to base64 and sent as an image block. Claude can see and describe images. |

Base64 encoding is like translating a book written in pictures into a very long string of letters and numbers. It lets you send binary files (like PDFs and images) over a text-based protocol.

### Token Counting and Costs

**What are tokens?** Tokens are the units Claude uses to process text. Think of them as word-pieces. The word "understanding" might be two tokens: "under" + "standing". A rough rule of thumb: 1 token is roughly 3/4 of a word, or about 4 characters in English.

**Why do tokens matter?**
1. **Cost**: Anthropic charges per token. More tokens = higher cost.
2. **Limits**: Each model has a maximum context window (how many tokens it can process at once).
3. **Speed**: More tokens take longer to process.

docbrief tracks token usage and can display it with the `-u` flag:

```
Tokens: 1,523 in / 847 out
Model:  claude-sonnet-4-20250514
Cost:   $0.0172
```

- **Input tokens**: How many tokens were in your document + prompt
- **Output tokens**: How many tokens Claude generated in its response
- Input tokens are cheaper than output tokens (because generating text is harder than reading it)

Current pricing (per million tokens):

| Model | Input Cost | Output Cost |
|-------|-----------|-------------|
| Haiku | $0.80 | $4.00 |
| Sonnet | $3.00 | $15.00 |
| Opus | $15.00 | $75.00 |

---

## 3. System Architecture

### Component Overview

```
                         USER TYPES A COMMAND
                                 |
                                 v
    +----------------------------------------------------+
    |              src/index.ts  (CLI LAYER)              |
    |                                                     |
    |  Commander.js parses the command, flags, and args.  |
    |  Calls the matching function in commands.ts.        |
    |  Wraps everything in run() for error handling.      |
    +-------------------------+--------------------------+
                              |
                              v
    +-------------------------+--------------------------+
    |           src/commands.ts  (COMMAND LAYER)          |
    |                                                     |
    |  1. Loads the file via reader.ts                    |
    |  2. Displays a header via formatter.ts              |
    |  3. Calls the Claude client with a tailored prompt  |
    |  4. Shows usage / writes output file if requested   |
    +------+------------------+----------------+---------+
           |                  |                |
           v                  v                v
    +------------+    +-------------+    +------------+
    | src/       |    | src/        |    | src/       |
    | reader.ts  |    | claude.ts   |    |formatter.ts|
    |            |    |             |    |            |
    | - Reads    |    | - Builds    |    | - ANSI     |
    |   files    |    |   API       |    |   colors   |
    | - Detects  |    |   messages  |    | - Headers  |
    |   types    |    | - Streams   |    | - Usage    |
    | - Reads    |    |   responses |    |   display  |
    |   stdin    |    | - Parses    |    | - Spinner  |
    | - Scans    |    |   JSON      |    |            |
    |   dirs     |    | - Handles   |    |            |
    |            |    |   errors    |    |            |
    +------------+    +------+------+    +------------+
                             |
                             v
                    +-----------------+
                    |  Anthropic API  |
                    |  (Claude)       |
                    +-----------------+

    +----------------------------------------------------+
    |              src/errors.ts  (ERROR LAYER)           |
    |                                                     |
    |  DocbriefError -> AuthError (exit 2)                |
    |               -> RateLimitError (exit 3)            |
    |               -> FileError (exit 4)                 |
    +----------------------------------------------------+

    +----------------------------------------------------+
    |              src/types.ts  (TYPE DEFINITIONS)       |
    |                                                     |
    |  FileContent, TokenUsage, StreamResult,             |
    |  ExtractedData, CodeReview, RedactReport, etc.      |
    +----------------------------------------------------+
```

### How a Command Flows: Step by Step

Let's trace what happens when a user types `docbrief summary report.pdf`:

1. **CLI Parsing** (`index.ts`): Commander.js parses the command as `summary` with argument `report.pdf`. It calls `summarize(file, opts)`.

2. **File Loading** (`reader.ts`): `loadInput("report.pdf")` is called. Since this is a `.pdf` file, the reader:
   - Checks the file exists
   - Checks it is under 50MB
   - Detects the type as `pdf` with MIME type `application/pdf`
   - Reads the raw bytes and encodes them as base64
   - Returns a `FileContent` object

3. **Header Display** (`formatter.ts`): A header line is printed to stderr: `── Summary  report.pdf | pdf | 2.3MB ──`

4. **API Call** (`claude.ts`): The `ClaudeClient.streamResponse()` method:
   - Converts the `FileContent` into an API content block (a `document` block with base64 data)
   - Adds the user instruction ("Summarize this document...")
   - Sends the request to the Anthropic API with streaming enabled
   - As chunks arrive, prints them to stdout in real time

5. **Post-Processing** (`commands.ts`): After streaming completes:
   - If `-u` was passed, token usage is displayed
   - If `-o output.md` was passed, the full response is written to a file

### The Three Layers

| Layer | Files | Responsibility |
|-------|-------|---------------|
| **CLI Layer** | `index.ts` | Parse commands and flags, wire them to functions, handle top-level errors |
| **Command Layer** | `commands.ts` | Implement each command's logic: load file, craft prompt, call API, format output |
| **Infrastructure Layer** | `reader.ts`, `claude.ts`, `formatter.ts`, `errors.ts`, `types.ts` | Reusable building blocks that know nothing about specific commands |

This separation matters because you can add a new command by only touching `commands.ts` and `index.ts`. The infrastructure layer does not need to change.

---

## 4. File Handling Deep Dive

### How We Detect File Types

When you give docbrief a file, the first thing it does is look at the file extension (the part after the last dot in the filename). This happens in the `detectFileType()` function in `reader.ts`.

The detection logic follows a priority chain:

```
Is the extension .pdf?
  -> Yes: type = "pdf", mimeType = "application/pdf"
  -> No: continue

Is the extension an image format? (.png, .jpg, .jpeg, .gif, .webp, .bmp)
  -> Yes: type = "image", mimeType = matching MIME type
  -> No: continue

Is the extension .csv?
  -> Yes: type = "csv"
  -> No: continue

Is the extension a known code extension? (50+ languages)
  -> Yes: type = "code", language = matched language name
  -> No: type = "text" (default fallback)
```

The tool recognizes 50+ code file extensions, covering languages from TypeScript to Zig. Here are some examples:

| Extension | Detected Language | Extensions | Detected Language |
|----------|-------------------|-----------|-------------------|
| `.ts`, `.tsx` | typescript | `.py`, `.pyw` | python |
| `.js`, `.jsx`, `.mjs`, `.cjs` | javascript | `.go` | go |
| `.rs` | rust | `.java` | java |
| `.rb` | ruby | `.swift` | swift |
| `.c`, `.h` | c | `.cpp`, `.hpp`, `.cc` | cpp |
| `.yaml`, `.yml` | yaml | `.sql` | sql |
| `.html`, `.htm` | html | `.css`, `.scss`, `.less` | css/scss/less |

### How Different Files Are Prepared for the API

Once the file type is detected, `buildFileContent()` in `claude.ts` converts it into the format the Claude API expects:

**Text files** (`.md`, `.txt`, `.csv`, and any unknown extension):
```
File: readme.md

Hello world, this is the file content as-is.
```
The file content is sent as plain text with a "File: name" prefix. No special encoding needed.

**Code files** (`.ts`, `.py`, `.go`, etc.):
```
File: app.ts

```typescript
const greeting: string = "hello";
console.log(greeting);
```
```
Code files are wrapped in Markdown code fences with the language name. This helps Claude understand the syntax and provide language-aware analysis (like citing line numbers in a code review).

**PDF files**:
```json
{
  "type": "document",
  "source": {
    "type": "base64",
    "media_type": "application/pdf",
    "data": "JVBERi0xLjQK..."
  }
}
```
The PDF's raw bytes are encoded as a base64 string and sent as a `document` content block. Claude processes the PDF natively -- it can read text, understand tables, and even interpret charts in the PDF.

**Image files** (`.png`, `.jpg`, `.gif`, `.webp`):
```json
{
  "type": "image",
  "source": {
    "type": "base64",
    "media_type": "image/png",
    "data": "iVBORw0KGgo..."
  }
}
```
Similar to PDFs, images are base64-encoded and sent as `image` content blocks. Claude can see the image and describe what is in it -- diagrams, screenshots, charts, handwritten text, etc.

### Stdin/Pipe Support: How `-` Works

Unix has a powerful concept: **piping**. You can chain commands together, sending the output of one command as the input to the next. docbrief supports this by accepting `-` as a special filename meaning "read from standard input."

```bash
git diff | docbrief review -
#  ^^^^^                   ^
#  This command's output   This tells docbrief
#  is piped in             to read from stdin
```

When docbrief sees `-` as the filename, it calls `readStdin()` instead of `readFile()`. This function:
1. Checks that stdin is not a TTY (a TTY means you are typing interactively -- there is no piped data)
2. Reads all incoming data chunks into a buffer
3. Concatenates the chunks into a single UTF-8 string
4. Returns it as a `FileContent` with type `"text"` and name `"stdin"`

This means you can pipe *anything* into docbrief -- log files, API responses, git diffs, command output -- as long as it is text.

### Size Limits and Why They Exist

docbrief enforces a **50MB file size limit** (for both files and stdin). This limit exists because:

1. **Claude has a context window limit**: Even though Claude can handle large inputs, there is a maximum number of tokens it can process. A 50MB text file would vastly exceed this.
2. **Base64 encoding increases size by ~33%**: A 50MB PDF becomes ~67MB of base64 text, which all has to be sent over the network.
3. **Cost**: Larger inputs mean more tokens, which means higher API costs. A 50MB text file could cost tens of dollars for a single request.
4. **Memory**: The entire file must fit in memory during processing.

The limit is checked in two places: `readFile()` checks `stat.size` before reading, and `readStdin()` tracks the running size as chunks arrive.

---

## 5. Claude API Client Design

### The ClaudeClient Class

The `ClaudeClient` class in `claude.ts` is the bridge between docbrief and the Anthropic API. It wraps the official `@anthropic-ai/sdk` package and adds streaming output, JSON parsing, multi-file comparison, and multi-turn chat.

### Dependency Injection Explained in Plain English

"Dependency injection" sounds complicated, but the concept is simple. Instead of a class creating its own dependencies internally, you **pass them in from outside**.

Analogy: Imagine a chef (the `ClaudeClient`). There are two ways to give them ingredients:
- **Without injection**: The chef walks to the market, picks their own ingredients. You have no control over what they buy.
- **With injection**: You hand the chef exactly the ingredients you want. You control the quality, the brand, everything.

In code, this looks like:

```typescript
// The constructor ACCEPTS an API key and model from outside
constructor(opts?: { apiKey?: string; model?: string }) {
  const apiKey = opts?.apiKey || process.env.ANTHROPIC_API_KEY;
  // ...
  this.client = new Anthropic({ apiKey });
  this.model = opts?.model || DEFAULT_MODEL;
}
```

You *can* pass in a specific API key and model, or it will use sensible defaults (the environment variable and `claude-sonnet-4-20250514`). This is useful for:
- **Testing**: You could pass in a mock API key
- **Flexibility**: Different commands can use different models
- **Configuration**: The CLI's `-m` flag flows through here

### Why a Class Instead of Plain Functions

You might wonder: why not just have standalone functions like `streamResponse(apiKey, model, ...)`? Using a class provides:

1. **Shared state**: The Anthropic client and model are configured once and reused across all method calls. No need to pass the API key to every function.
2. **Testability**: You can create a `ClaudeClient` with test configuration without affecting the real one.
3. **Encapsulation**: The `drainStream` helper is private -- it is an implementation detail that callers should not use directly.

The project also provides a `getDefaultClient()` singleton function so that multiple commands in the same session share a single client instance.

### The 4 API Methods

The `ClaudeClient` has four methods, each designed for a different interaction pattern:

#### 1. `streamResponse(systemPrompt, file, userInstruction, opts)`

**Used by**: `summary`, `ask`, `actions`, `review` (text format), `translate`, `redact` (text format), `rewrite`

This is the workhorse method. It takes a single file and an instruction, sends them to Claude, and streams the response to stdout in real time.

```
[System Prompt] "You are a document analysis expert..."
[User Message]  [File Content Blocks] + "Summarize this document..."
                 |
                 v
          Streaming response -> printed to terminal live
```

#### 2. `requestJSON(systemPrompt, file, userInstruction, opts)`

**Used by**: `extract`, `review --format json`, `redact --format json`

Like `streamResponse`, but:
- Does **not** stream (waits for the full response)
- Extracts JSON from the response (even if Claude wraps it in markdown code fences)
- Parses the JSON and returns it as a typed object
- Shows a spinner while waiting (since there is no streaming output to watch)

The JSON extraction is clever -- it uses a regex to find JSON inside markdown code blocks:
```typescript
const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
```
This handles the common case where Claude responds with ````json ... ` `` ` around the data.

#### 3. `streamComparison(systemPrompt, file1, file2, userInstruction, opts)`

**Used by**: `compare`

Takes **two** files and sends them in a single message with labels ("First document:" and "Second document:"). Claude sees both files side-by-side and can analyze their differences.

```
[User Message]  "First document:" + [File 1 Blocks]
                "---"
                "Second document:" + [File 2 Blocks]
                "Compare these two documents..."
```

#### 4. `streamChat(systemPrompt, file, messages, opts)`

**Used by**: `chat`

Supports **multi-turn conversation**. The first user message includes the file content, and subsequent messages are plain text. The full conversation history is sent with every request so Claude maintains context.

```
Turn 1: [File Blocks] + "What methodology did they use?"
Turn 2: "How large was the sample?"  (Claude remembers the file)
Turn 3: "Compare that to typical sample sizes."  (Claude remembers everything)
```

### The `drainStream` Helper

All three streaming methods (`streamResponse`, `streamComparison`, `streamChat`) need to do the same thing: iterate over the stream, print text deltas, and collect usage data. Instead of duplicating this code three times, the private `drainStream` method handles it once.

This follows the **DRY principle** (Don't Repeat Yourself). If you need to change how streaming works (say, to add a progress indicator), you change one method instead of three.

```typescript
private async drainStream(stream: any): Promise<StreamResult> {
  let fullResponse = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);   // Print in real time
      fullResponse += event.delta.text;          // Also collect the full text
    }
  }
  process.stdout.write("\n");
  const finalMessage = await stream.finalMessage();
  return {
    text: fullResponse,
    usage: { /* token counts from finalMessage */ },
  };
}
```

### Retry Configuration

The Anthropic client is configured with:

```typescript
this.client = new Anthropic({
  apiKey,
  maxRetries: 3,        // Retry up to 3 times on transient failures
  timeout: 120_000,     // Wait up to 2 minutes for a response
});
```

- **maxRetries: 3**: If a request fails due to a network hiccup or a temporary server error (like a 500 status code), the SDK will automatically retry up to 3 times with exponential backoff. You do not have to handle this yourself.
- **timeout: 120,000ms (2 minutes)**: If a response takes longer than 2 minutes, the request is canceled. This prevents the tool from hanging indefinitely on large documents.

### Rate Limit Handling

If the API returns a **429 status code** (Too Many Requests), docbrief catches it and throws a `RateLimitError`:

```typescript
} catch (err: any) {
  if (err?.status === 429) throw new RateLimitError();
  throw err;
}
```

A 429 means you are sending requests faster than your API plan allows. The error message tells the user to wait and try again. The exit code is 3, which scripts can use to implement their own retry logic.

---

## 6. Command Architecture

### The `runCommand` Pattern

Most commands in docbrief follow the same skeleton:
1. Load the file
2. Display a header
3. Get a Claude client
4. Execute the command-specific logic (send a prompt, get a response)
5. Show usage stats if requested
6. Write to file if requested

Rather than repeating steps 1, 2, 3, 5, and 6 in every command, docbrief defines a `runCommand` helper:

```typescript
async function runCommand(
  filePath: string,
  label: string,
  opts: CommandOpts,
  execute: (file: FileContent, client: ClaudeClient) => Promise<{ text: string; usage: TokenUsage }>
): Promise<void> {
  const file = await loadInput(filePath);       // Step 1
  header(label, formatFileInfo(file));           // Step 2
  const client = getDefaultClient(opts.model);   // Step 3
  const result = await execute(file, client);    // Step 4 (custom per command)
  showUsage(opts, result.usage);                 // Step 5
  await writeOutput(opts, result.text);          // Step 6
}
```

Each command only provides the `execute` function -- the unique part. This is the **template method pattern**, and it eliminates a tremendous amount of duplicated code.

### Command Descriptions

| Command | Alias | What Makes It Unique |
|---------|-------|---------------------|
| **summary** | `s` | Has a `--length` option (short/medium/long) that changes the prompt |
| **extract** | `e` | Uses `requestJSON` instead of streaming; returns structured JSON |
| **ask** | `a` | Takes a `<question>` argument; prepends "Q:" to output |
| **actions** | `todo` | Specialized prompt for tasks, owners, deadlines, and priorities |
| **review** | `r` | Supports `--format json`; auto-detects directories and delegates to batch |
| **compare** | `diff` | Takes two file arguments; uses `streamComparison` |
| **chat** | `c` | Interactive mode with readline; multi-turn conversation |
| **translate** | `t` | Takes a `<language>` argument; instructs Claude to preserve code |
| **redact** | -- | Supports `--format json`; looks for PII and security issues |
| **rewrite** | `rw` | Has `--tone` and `--audience` options |
| **batch** | `b` | Takes a directory; scans for code files; reviews each one sequentially |

### The Chat Command: Multi-Turn Conversation

The `chat` command is the most complex because it manages an ongoing conversation:

1. **Load the file once** when the command starts
2. **Create a readline interface** to read user input line by line
3. **Maintain a `messages` array** that grows with each exchange
4. For each user message:
   - Add it to the array
   - Send the entire array to `streamChat()` (which includes the file in the first message)
   - Add Claude's response to the array
   - Track cumulative token usage
5. **Exit** when the user types "exit", "quit", ".exit", or "/exit"

The key insight: the file is attached to the first message only, but the full conversation history is sent every time. This means Claude remembers both the document and all previous questions and answers.

### The Batch Command: Directory Review

The `batch` command is designed for reviewing an entire codebase:

1. **Scan the directory** using `listCodeFiles()`, which:
   - Walks the directory tree up to 5 levels deep
   - Skips `node_modules`, `.git`, `dist`, `build`, `__pycache__`, `.next`, `vendor`
   - Collects files with known code extensions
   - Stops at 20 files (configurable)
2. **Review each file sequentially** with a brief prompt ("3-5 bullet points, critical issues only")
3. **Aggregate usage** across all files

---

## 7. CLI Design Principles

### Commander.js: How CLI Frameworks Work

Building a command-line tool means parsing text that users type. If someone types `docbrief summary --length short report.pdf`, you need to figure out:
- The command is `summary`
- There is an option `--length` with value `short`
- There is a positional argument `report.pdf`

**Commander.js** is a popular Node.js library that handles all of this parsing for you. You just declare your commands, their arguments, and their options, and Commander.js does the rest:

```typescript
program
  .command("summary")                    // The command name
  .alias("s")                            // Short alias
  .argument("<file>", "File path")       // Required positional argument
  .option("-l, --length <length>")       // Optional flag with a value
  .action((file, opts) => { ... });      // What to do when this command runs
```

Commander.js also auto-generates `--help` output and handles `--version`.

### Command Aliases and Why They Matter

Every command has a short alias:

| Full Command | Alias | Why |
|-------------|-------|-----|
| `summary` | `s` | Save typing for the most common command |
| `extract` | `e` | Quick data extraction |
| `ask` | `a` | Rapid Q&A |
| `review` | `r` | Fast code review |
| `chat` | `c` | Quick interactive mode |
| `compare` | `diff` | Familiar to developers |
| `translate` | `t` | Common enough to merit a shortcut |
| `batch` | `b` | Directory review |
| `actions` | `todo` | Intuitive alternative name |
| `rewrite` | `rw` | Short but readable |

You can type `docbrief s report.pdf` instead of `docbrief summary report.pdf`. Power users appreciate this.

### Global Options vs Command-Specific Options

**Global options** are available on every command:
- `-m, --model <model>` -- Override the Claude model (e.g., use `claude-opus-4-5-20250514` for higher quality)
- `-o, --output <file>` -- Write the output to a file instead of just printing it
- `-u, --usage` -- Show token count and estimated cost after the response

These are added by the `addCommonOpts()` helper function, which attaches them to every command definition.

**Command-specific options** are only available on certain commands:
- `--length` (summary only): `short`, `medium`, or `long`
- `--format` (review, redact): `text` or `json`
- `--tone` (rewrite): `formal`, `casual`, `technical`, `simple`, `persuasive`
- `--audience` (rewrite): `executive`, `developer`, `student`, `client`, or custom

### stdout vs stderr: Why We Separate Them

docbrief makes a deliberate choice about where different types of output go:

- **stdout** (standard output): Claude's actual response -- the summary, the JSON, the review
- **stderr** (standard error): Everything else -- headers, spinners, file info, usage stats, errors

Why does this matter? **Composability.** In Unix, you can redirect stdout to a file or pipe it to another command:

```bash
docbrief extract invoice.pdf | jq '.action_items'
```

If headers and spinners went to stdout, `jq` would choke on them. By sending metadata to stderr, only the clean JSON goes through the pipe. The user still sees the headers in their terminal (stderr is displayed by default), but piped programs only receive the useful content.

### NO_COLOR Support

Some users prefer no color in their terminal output (for accessibility, logging, or personal preference). The `NO_COLOR` environment variable is a community standard (see https://no-color.org/) that says: "If `NO_COLOR` is set, do not output ANSI color codes."

docbrief respects this:

```typescript
const useColor = !process.env.NO_COLOR && process.stdout.isTTY;
```

Colors are also disabled when stdout is not a TTY (e.g., when piping to a file), because ANSI codes would appear as garbage characters in the file.

### Input Validation with `.choices()`

Commander.js supports restricting option values. docbrief uses this to prevent typos:

```typescript
.addOption(new Option("-l, --length <length>", "short | medium | long")
  .default("medium")
  .choices(["short", "medium", "long"]))
```

If you type `--length tiny`, Commander.js will reject it with an error message listing the valid choices, before docbrief even runs.

---

## 8. Error Handling Strategy

### The Error Hierarchy

docbrief defines a custom error hierarchy in `errors.ts`:

```
Error (built-in JavaScript)
  |
  +-- DocbriefError (exitCode: 1)
        |
        +-- AuthError (exitCode: 2)
        |     "Invalid or missing API key."
        |
        +-- RateLimitError (exitCode: 3)
        |     "Rate limited by the API."
        |
        +-- FileError (exitCode: 4)
              "File not found", "Not a file", "File too large", etc.
```

Each error type has a distinct **exit code** -- a number that the program returns to the operating system when it exits. This is important for scripting:

```bash
docbrief summary report.pdf
if [ $? -eq 2 ]; then
  echo "API key is missing!"
elif [ $? -eq 4 ]; then
  echo "File problem!"
fi
```

| Exit Code | Meaning | Error Class |
|-----------|---------|-------------|
| 0 | Success | (no error) |
| 1 | Unknown/general error | `DocbriefError` |
| 2 | Authentication failure | `AuthError` |
| 3 | Rate limited | `RateLimitError` |
| 4 | File problem | `FileError` |

### How Errors Flow

Here is the journey of an error from source to user:

```
1. Something goes wrong
   |
   v
2. A specific error is thrown
   e.g., throw new FileError("File not found: /tmp/report.pdf")
   |
   v
3. The error propagates up through the call stack
   readFile() -> loadInput() -> runCommand() -> summarize()
   |
   v
4. The run() wrapper in index.ts catches it
   fn().catch((err) => {
     console.error(`Error: ${err.message}`);
     process.exit(err.exitCode || 1);
   })
   |
   v
5. The user sees a clean error message
   Error: File not found: /tmp/report.pdf
   (process exits with code 4)
```

The `run()` wrapper is the safety net. No matter where an error originates, it is caught at the top level and presented consistently. The user always sees `Error: <message>`, and the process always exits with the correct code.

### The AuthError Is Special

The `AuthError` has no constructor arguments -- it always shows the same helpful message:

```
Invalid or missing API key.
Set your key: export ANTHROPIC_API_KEY=sk-ant-...
Get one at: https://console.anthropic.com/settings/keys
```

This is because authentication failures are always the same problem (missing or wrong API key) and always have the same fix.

---

## 9. Output Formatting

### ANSI Escape Codes: How Terminal Colors Work

When you see colored text in a terminal, the color comes from special invisible characters called **ANSI escape codes**. They are instructions that tell the terminal "the next text should be red" or "make this bold."

An escape code starts with `\x1b[` (the "escape" character followed by `[`), then a number code, then `m`:

| Code | Effect |
|------|--------|
| `\x1b[1m` | Bold |
| `\x1b[2m` | Dim (faded) |
| `\x1b[31m` | Red text |
| `\x1b[32m` | Green text |
| `\x1b[33m` | Yellow text |
| `\x1b[35m` | Magenta text |
| `\x1b[36m` | Cyan text |
| `\x1b[0m` | Reset (back to normal) |

Every colored string must end with the reset code, or all subsequent text would stay colored. The `c()` helper function in `formatter.ts` handles this automatically:

```typescript
function c(code: string, text: string): string {
  return useColor ? `${code}${text}${RESET}` : text;
}
```

If colors are disabled (`NO_COLOR` is set or output is not a TTY), the function returns plain text with no escape codes.

### The Formatter Module

`formatter.ts` exports these helpers:

| Function | Purpose | Example Output |
|----------|---------|---------------|
| `bold(text)` | Make text bold | **important** |
| `dim(text)` | Make text faded | _secondary info_ |
| `success(text)` | Green text | (costs) |
| `warn(text)` | Yellow text | (warnings) |
| `error(text)` | Red text | (errors) |
| `info(text)` | Cyan text | (informational) |
| `accent(text)` | Magenta text | (token counts) |
| `header(label, detail)` | Section header with line | `── Summary  report.pdf \| pdf ──` |
| `subheader(label)` | Smaller section marker | `> errors.ts \| code \| 1.2KB` |
| `formatUsage(usage)` | Token count + cost display | Tokens: 1,523 in / 847 out |
| `spinner(label)` | Animated dots during waits | `Analyzing document...` |

### Cost Calculation

The `formatUsage` function estimates the API cost based on the model name:

```typescript
const PRICING: Record<string, { input: number; output: number }> = {
  "sonnet": { input: 3, output: 15 },       // $ per million tokens
  "opus":   { input: 15, output: 75 },
  "haiku":  { input: 0.8, output: 4 },
};
```

It finds the pricing tier by checking if the model name contains "sonnet", "opus", or "haiku":

```typescript
const pricing = Object.entries(PRICING).find(([key]) =>
  usage.model.toLowerCase().includes(key)
);
```

Then it calculates:
```
cost = (input_tokens / 1,000,000) * input_price + (output_tokens / 1,000,000) * output_price
```

For an unknown model, the cost is simply not displayed (it does not crash).

### TTY Detection

TTY stands for "teletype" -- historically a physical terminal. In modern computing, a TTY means the output is connected to an interactive terminal (where a human is watching), as opposed to a pipe or a file.

docbrief checks `process.stdout.isTTY` to decide whether to use colors. If you run:

```bash
docbrief summary report.pdf          # isTTY = true  -> colors ON
docbrief summary report.pdf > out.md # isTTY = false -> colors OFF
docbrief summary report.pdf | less   # isTTY = false -> colors OFF
```

This prevents ANSI escape codes from ending up in files where they would appear as garbled characters.

---

## 10. Testing Strategy

### What Is Tested and Why

docbrief has **37 tests** across 4 test files. The testing strategy focuses on the parts of the system that can be tested without making real API calls:

| Component | Tested? | Rationale |
|-----------|---------|-----------|
| File type detection | Yes | Pure logic, no side effects |
| File reading | Yes | Filesystem operations with temp files |
| File info formatting | Yes | Pure string formatting |
| Directory scanning | Yes | Filesystem operations with temp dirs |
| Content block building | Yes | Pure data transformation |
| Error hierarchy | Yes | Class inheritance and exit codes |
| Formatter functions | Yes | String manipulation |
| Pricing lookup | Yes | Pure calculation |
| API calls | No | Would require mocking the Anthropic SDK or hitting a real API |
| Command logic | No | Depends on API calls and terminal I/O |
| CLI parsing | No | Commander.js is well-tested; our wiring is simple |

### Test File Overview

#### `tests/reader.test.ts` (16 tests)

Sets up temporary files in a temp directory (`before`), then cleans them up (`after`).

- **File type detection** (6 tests): Verifies that `.ts` -> typescript, `.md` -> text, `.csv` -> csv, `.yaml` -> yaml, `.py` -> python, `.css` -> css
- **File reading** (4 tests): Reads files successfully, throws on missing files, throws on directories, verifies file size calculation
- **File info formatting** (2 tests): Checks that the display string includes the filename, type, and language
- **Directory scanning** (4 tests): Finds code files recursively, respects `maxFiles` limit, throws on non-directories

#### `tests/claude.test.ts` (6 tests)

Tests `buildFileContent()` -- the function that converts `FileContent` objects into API content blocks.

- Text files produce a text block with "File: name" prefix
- Code files are wrapped in language-specific markdown fences
- PDFs produce a document block with base64 data
- Images produce an image block with base64 data and correct MIME type
- Empty string text produces a text block (not an empty array)
- Null/undefined text produces an empty array (no blocks)

#### `tests/errors.test.ts` (5 tests)

Verifies the error class hierarchy:
- `DocbriefError` has exit code 1 and extends `Error`
- `AuthError` extends `DocbriefError` and has exit code 2
- `RateLimitError` extends `DocbriefError` and has exit code 3
- `FileError` extends `DocbriefError`, has exit code 4, and preserves custom messages

#### `tests/formatter.test.ts` (10 tests)

- **Color functions** (7 tests): Each of `bold`, `dim`, `success`, `warn`, `error`, `info`, `accent` returns a string containing the input text
- **formatUsage** (3 tests): Does not throw for sonnet, opus, or unknown model names

### How to Run Tests

```bash
npm test
```

This runs:
```bash
tsx --test tests/reader.test.ts tests/claude.test.ts tests/errors.test.ts tests/formatter.test.ts
```

The tests use Node.js's built-in test runner (available since Node 18) with `node:test` and `node:assert/strict`. No external test framework is needed. `tsx` is used to run TypeScript directly without a separate compilation step.

### How to Add New Tests

1. Create a new test file in the `tests/` directory (e.g., `tests/my-feature.test.ts`)
2. Import the test utilities:
   ```typescript
   import { describe, it } from "node:test";
   import assert from "node:assert/strict";
   ```
3. Write your tests:
   ```typescript
   describe("myFunction", () => {
     it("does the expected thing", () => {
       const result = myFunction("input");
       assert.equal(result, "expected output");
     });
   });
   ```
4. Add the test file to the `test` script in `package.json`:
   ```json
   "test": "tsx --test tests/reader.test.ts tests/claude.test.ts tests/errors.test.ts tests/formatter.test.ts tests/my-feature.test.ts"
   ```

### Why Some Things Are Not Tested

The command functions and API client methods make real HTTP requests to Anthropic's servers. Testing them would require either:

- **Mocking the SDK**: Creating fake versions of the Anthropic client that return canned responses. This is doable but adds complexity and can give false confidence (your mock might not behave like the real API).
- **Integration tests**: Hitting the real API. This is expensive (each test costs money), slow (seconds per test), and flaky (network issues, rate limits).

The project's approach is pragmatic: test the pure logic thoroughly, and rely on manual testing for the API integration layer.

---

## 11. How to Build a Similar CLI Tool

This section walks you through building a CLI tool similar to docbrief from scratch. By the end, you will have a working TypeScript CLI that talks to the Claude API.

### Step 1: Set Up a TypeScript Project

```bash
mkdir my-cli-tool
cd my-cli-tool
npm init -y
```

Install dependencies:

```bash
npm install @anthropic-ai/sdk commander
npm install -D typescript @types/node tsx
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

Add scripts to `package.json`:

```json
{
  "main": "dist/index.js",
  "bin": {
    "my-cli": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "dev": "tsx src/index.ts",
    "start": "node dist/index.js"
  }
}
```

### Step 2: Add Commander.js for Command Parsing

Create `src/index.ts`:

```typescript
#!/usr/bin/env node

import { Command } from "commander";

const program = new Command();

program
  .name("my-cli")
  .description("My AI-powered CLI tool")
  .version("1.0.0");

program
  .command("analyze")
  .description("Analyze a file using Claude")
  .argument("<file>", "File to analyze")
  .option("-m, --model <model>", "Claude model to use")
  .action((file, opts) => {
    console.log(`Analyzing ${file} with model ${opts.model || "default"}...`);
  });

program.parse();
```

The shebang line (`#!/usr/bin/env node`) at the top tells the operating system to run this file with Node.js. This is what makes it work as a standalone CLI command after `npm link`.

### Step 3: Integrate the Anthropic SDK

Create `src/claude.ts`:

```typescript
import Anthropic from "@anthropic-ai/sdk";

export async function askClaude(
  prompt: string,
  fileContent: string
): Promise<string> {
  const client = new Anthropic();  // Reads ANTHROPIC_API_KEY from env

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{
      role: "user",
      content: `Here is a file:\n\n${fileContent}\n\n${prompt}`,
    }],
  });

  let result = "";
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      process.stdout.write(event.delta.text);
      result += event.delta.text;
    }
  }
  process.stdout.write("\n");
  return result;
}
```

### Step 4: Handle Streaming Responses

The code above already handles streaming. The key pattern is:

```typescript
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
    process.stdout.write(event.delta.text);  // Print immediately
  }
}
```

The `for await` loop is an asynchronous iterator -- it waits for each event to arrive from the network, processes it, then waits for the next one. This is what makes the text appear progressively.

### Step 5: Add Stdin/Pipe Support

```typescript
import fs from "fs";

export async function readInput(filePath: string): Promise<string> {
  if (filePath === "-") {
    // Read from stdin
    const chunks: Buffer[] = [];
    for await (const chunk of process.stdin) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString("utf-8");
  }
  return fs.readFileSync(filePath, "utf-8");
}
```

Now your tool supports `cat file.txt | my-cli analyze -`.

### Step 6: Wire It Together

Update `src/index.ts`:

```typescript
#!/usr/bin/env node

import { Command } from "commander";
import { askClaude } from "./claude.js";
import { readInput } from "./reader.js";

const program = new Command();

program
  .name("my-cli")
  .description("My AI-powered CLI tool")
  .version("1.0.0");

program
  .command("analyze")
  .description("Analyze a file using Claude")
  .argument("<file>", "File to analyze")
  .action(async (file) => {
    const content = await readInput(file);
    await askClaude("Analyze this file and provide a summary.", content);
  });

program.parse();
```

### Step 7: Build and Test

```bash
npm run build                                 # Compile TypeScript
echo "Hello, World!" | node dist/index.js analyze -   # Test with pipe
```

### Step 8: Publish to npm (Optional)

```bash
npm login
npm publish
```

After publishing, anyone can install your tool with `npm install -g my-cli`.

---

## 12. Glossary

| Term | Definition |
|------|-----------|
| **ANSI escape codes** | Special character sequences that control text formatting (colors, bold, etc.) in a terminal. Named after the American National Standards Institute, which standardized them. |
| **API (Application Programming Interface)** | A set of rules for how two programs communicate. In docbrief's case, it is the HTTP-based interface for sending messages to Claude and receiving responses. |
| **API key** | A secret string (like a password) that identifies you to the API provider. Anthropic issues API keys so they know who is making requests and can bill accordingly. |
| **Async/Await** | JavaScript syntax for working with asynchronous operations (things that take time, like network requests). `await` pauses execution until the operation completes, without blocking other code. |
| **Base64** | An encoding that represents binary data (like images or PDFs) as a string of text characters. It is used because JSON and HTTP are text-based protocols that cannot directly carry binary data. |
| **CLI (Command-Line Interface)** | A text-based interface where you type commands. The opposite of a GUI (Graphical User Interface) where you click buttons. |
| **Commander.js** | A popular Node.js library for building command-line tools. It handles parsing arguments, options, and help text. |
| **CommonJS** | A module system for JavaScript (`require()` and `module.exports`). The default for Node.js. docbrief uses CommonJS as specified in `tsconfig.json` and `package.json`. |
| **Content block** | A unit of content in a Claude API message. Can be text, an image, or a document (PDF). A single message can contain multiple content blocks. |
| **Context window** | The maximum amount of text (in tokens) that Claude can process in a single request. Think of it as Claude's working memory. |
| **Dependency injection** | A design pattern where a component receives its dependencies from the outside rather than creating them internally. Makes code more testable and flexible. |
| **DRY (Don't Repeat Yourself)** | A software principle that says every piece of knowledge should have a single, unambiguous representation. If you find yourself copying code, extract it into a shared function. |
| **Exit code** | A number (0-255) that a program returns when it finishes. 0 means success; any other number means an error. Scripts use exit codes to detect failures. |
| **Iterator (async)** | An object that produces values one at a time. An async iterator produces values that arrive over time (like streaming data from a network). The `for await...of` loop consumes async iterators. |
| **JSON (JavaScript Object Notation)** | A text format for structured data, using key-value pairs and arrays. Looks like `{"name": "Alice", "age": 30}`. The lingua franca of web APIs. |
| **MIME type** | A label that identifies the format of a file, like `application/pdf` or `image/png`. Used in HTTP and APIs so the receiver knows how to handle the data. |
| **Mock** | A fake version of a real component used in testing. For example, a mock API client returns pre-written responses instead of making real network requests. |
| **Node.js** | A runtime that lets you run JavaScript outside a web browser. It is what makes it possible to write a CLI tool in TypeScript/JavaScript. |
| **npm** | Node Package Manager. Used to install libraries (like `@anthropic-ai/sdk`) and publish your own tools for others to use. |
| **PII (Personally Identifiable Information)** | Any data that can identify a specific person -- names, emails, phone numbers, Social Security numbers, etc. |
| **Pipe** | A Unix feature that connects the output of one command to the input of another. Written as `|`. Example: `cat file.txt | grep "error"`. |
| **Prompt** | The instruction you give to an AI model. In docbrief, each command has a carefully written system prompt (defining Claude's role) and a user prompt (the specific instruction). |
| **Rate limiting** | When an API restricts how many requests you can make in a given time period. If you exceed the limit, you get a 429 (Too Many Requests) error. |
| **Readline** | A Node.js module for reading user input line by line. Used in the `chat` command for the interactive Q&A loop. |
| **Shebang** | The `#!/usr/bin/env node` line at the top of a script. It tells Unix-like operating systems which program should run the file. |
| **Singleton** | A design pattern where only one instance of a class exists. `getDefaultClient()` in docbrief returns the same `ClaudeClient` every time it is called. |
| **stderr (standard error)** | A separate output channel for error messages and metadata. Displayed in the terminal but not captured by pipes. |
| **stdin (standard input)** | The input channel for a program. Usually the keyboard, but can be redirected from a file or another program's output via a pipe. |
| **stdout (standard output)** | The main output channel for a program. What gets captured by pipes and file redirects. |
| **Streaming** | Receiving data piece by piece as it is generated, rather than waiting for the complete result. Like watching someone type versus waiting for the entire email. |
| **System prompt** | A special instruction sent to Claude that defines its role and behavior. It is separate from the user message and takes priority. Think of it as job instructions given to an employee before they start working. |
| **Token** | The smallest unit of text that an AI model processes. Roughly 3/4 of an English word or ~4 characters. Both the input (your document) and output (Claude's response) are measured in tokens. |
| **TSX** | A tool that runs TypeScript files directly without a separate compilation step. Used for development and testing. |
| **TTY (Teletype)** | An interactive terminal session where a human is watching. Important for deciding whether to output colors and spinners. |
| **TypeScript** | A programming language that adds type safety to JavaScript. You write `.ts` files, and they compile to `.js` files that Node.js can run. |

---

*This documentation covers docbrief version 1.0.0. For the latest code, see the source files in `src/` and tests in `tests/`.*
