import readline from "readline";
import fs from "fs";
import path from "path";
import { streamResponse, requestJSON, streamComparison, streamChat } from "./claude.js";
import { loadInput, formatFileInfo, listCodeFiles, readFile } from "./reader.js";
import { header, subheader, formatUsage, dim, bold, warn, info, spinner } from "./formatter.js";
import type { ExtractedData, CodeReview, RedactReport, CommandOpts, TokenUsage } from "./types.js";

// ── Helpers ─────────────────────────────────────────────────

function showUsage(opts: CommandOpts, usage: TokenUsage) {
  if (opts.usage) formatUsage(usage);
}

async function writeOutput(opts: CommandOpts, content: string) {
  if (opts.output) {
    const dir = path.dirname(opts.output);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(opts.output, content, "utf-8");
    console.log(`\n${info(">")} Written to ${bold(opts.output)}`);
  }
}

// ── Summary ─────────────────────────────────────────────────

export async function summarize(
  filePath: string,
  opts: CommandOpts & { length?: string }
) {
  const file = await loadInput(filePath);
  header("Summary", formatFileInfo(file));

  const lengthGuide =
    opts.length === "short"
      ? "Provide a 2-3 sentence summary."
      : opts.length === "long"
        ? "Provide a thorough summary covering all major points (500-800 words)."
        : "Provide a concise summary covering the key points (150-300 words).";

  const result = await streamResponse(
    "You are a document analysis expert. Provide clear, accurate summaries. Use plain language. Be precise.",
    file,
    `Summarize this document. ${lengthGuide}\n\nStructure your response with:\n1. **Overview** — what this document is and its purpose\n2. **Key Points** — the most important information\n3. **Conclusion** — bottom line or main takeaway`,
    opts
  );

  showUsage(opts, result.usage);
  await writeOutput(opts, result.text);
}

// ── Extract ─────────────────────────────────────────────────

export async function extract(
  filePath: string,
  opts: CommandOpts
) {
  const file = await loadInput(filePath);
  header("Extract", formatFileInfo(file));

  const spin = spinner("Analyzing document");
  const { data, usage } = await requestJSON<ExtractedData>(
    "You are a data extraction expert. Extract structured information from documents with high accuracy. Return ONLY valid JSON.",
    file,
    `Extract all structured data from this document. Return a JSON object with these fields:

{
  "title": "Document title or null",
  "dates": ["Any dates mentioned, in ISO format where possible"],
  "people": ["Names of people mentioned"],
  "organizations": ["Companies, teams, organizations mentioned"],
  "amounts": ["Any monetary amounts, quantities, or metrics"],
  "key_facts": ["Important facts, decisions, or statements"],
  "action_items": ["Any tasks, to-dos, or action items"],
  "metadata": {"any": "other relevant key-value data"}
}

Be thorough. Include ALL instances found.`,
    opts
  );
  spin.stop();

  const output = JSON.stringify(data, null, 2);
  console.log(output);
  showUsage(opts, usage);
  await writeOutput(opts, output);
}

// ── Ask ─────────────────────────────────────────────────────

export async function ask(
  filePath: string,
  question: string,
  opts: CommandOpts
) {
  const file = await loadInput(filePath);
  header("Q&A", formatFileInfo(file));
  console.log(`${bold("Q:")} ${question}\n`);

  const result = await streamResponse(
    "You are a document analysis expert. Answer questions accurately and concisely. If the answer isn't in the document, say so clearly. Cite relevant sections when possible.",
    file,
    `Answer this question about the document:\n\n${question}`,
    opts
  );

  showUsage(opts, result.usage);
  await writeOutput(opts, `Q: ${question}\n\nA: ${result.text}`);
}

// ── Actions ─────────────────────────────────────────────────

export async function actions(
  filePath: string,
  opts: CommandOpts
) {
  const file = await loadInput(filePath);
  header("Action Items", formatFileInfo(file));

  const result = await streamResponse(
    "You are a project management expert. Extract actionable items with clarity and specificity.",
    file,
    `Extract ALL action items, tasks, to-dos, next steps, and follow-ups from this document.

For each item:
- **Action**: What needs to be done (specific, actionable)
- **Owner**: Who is responsible (if mentioned, otherwise "Unassigned")
- **Deadline**: When it's due (if mentioned, otherwise "No deadline")
- **Priority**: High / Medium / Low (infer from context)

If there are no action items, say so and suggest potential next steps based on the content.`,
    opts
  );

  showUsage(opts, result.usage);
  await writeOutput(opts, result.text);
}

// ── Review ──────────────────────────────────────────────────

export async function review(
  filePath: string,
  opts: CommandOpts & { format?: string }
) {
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    return batchReview(filePath, opts);
  }
  const file = await loadInput(filePath);

  if (file.type !== "code" && file.name !== "stdin") {
    console.log(warn(`Note: ${file.name} doesn't appear to be code. Reviewing anyway.\n`));
  }

  header("Code Review", formatFileInfo(file));

  if (opts.format === "json") {
    const spin = spinner("Reviewing code");
    const { data, usage } = await requestJSON<CodeReview>(
      "You are a senior software engineer doing a thorough code review. Return ONLY valid JSON.",
      file,
      `Review this code and return a JSON object:

{
  "file": "${file.name.replace(/"/g, '\\"')}",
  "language": "${(file.language || "unknown").replace(/"/g, '\\"')}",
  "summary": "One paragraph overall assessment",
  "issues": [
    { "severity": "critical|warning|suggestion", "line": null, "description": "Issue", "fix": "How to fix" }
  ],
  "quality_score": 7,
  "strengths": ["Good things about this code"]
}

Focus on bugs, security issues, performance, and maintainability. Score 1-10. Be specific with line numbers.`,
      opts
    );
    spin.stop();

    const output = JSON.stringify(data, null, 2);
    console.log(output);
    showUsage(opts, usage);
    await writeOutput(opts, output);
  } else {
    const result = await streamResponse(
      "You are a senior software engineer doing a thorough code review. Be constructive, specific, and cite line numbers.",
      file,
      `Review this code:

## Summary
Brief overall assessment and quality score (1-10).

## Critical Issues
Bugs, security vulnerabilities, or correctness problems.

## Warnings
Performance issues, edge cases, or maintainability concerns.

## Suggestions
Style improvements, better patterns, minor enhancements.

## Strengths
What this code does well.

Reference line numbers. Provide code examples for fixes. If the code is solid, say so.`,
      opts
    );

    showUsage(opts, result.usage);
    await writeOutput(opts, result.text);
  }
}

// ── Compare ─────────────────────────────────────────────────

export async function compare(
  filePath1: string,
  filePath2: string,
  opts: CommandOpts
) {
  const file1 = await loadInput(filePath1);
  const file2 = await loadInput(filePath2);

  header("Comparison");
  console.log(`  ${dim("File 1:")} ${formatFileInfo(file1)}`);
  console.log(`  ${dim("File 2:")} ${formatFileInfo(file2)}\n`);

  const result = await streamComparison(
    "You are a document analysis expert. Compare documents thoroughly and specifically.",
    file1,
    file2,
    `Compare these two documents:

## Overview
What each document is and their relationship.

## Similarities
What they share (content, structure, purpose).

## Differences
Where they diverge — be specific about changes, additions, and removals.

## Analysis
What do the differences mean? Concerns or recommendations?

## Verdict
One-paragraph bottom line.`,
    opts
  );

  showUsage(opts, result.usage);
  await writeOutput(opts, result.text);
}

// ── Chat (interactive Q&A) ──────────────────────────────────

export async function chat(
  filePath: string,
  opts: CommandOpts
) {
  if (filePath === "-") {
    throw new Error("Interactive chat mode does not support stdin (-). Provide a file path.");
  }
  const file = await loadInput(filePath);
  header("Interactive Chat", formatFileInfo(file));
  console.log(`${dim("Ask anything about this document. Type")} ${bold("exit")} ${dim("to quit.")}\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];
  let totalUsage = { input_tokens: 0, output_tokens: 0 };

  const prompt = () => {
    rl.question(`\n${bold("You:")} `, async (input) => {
      const trimmed = input.trim();
      if (!trimmed) { prompt(); return; }
      if (["exit", "quit", ".exit", "/exit"].includes(trimmed.toLowerCase())) {
        if (opts.usage && totalUsage.input_tokens > 0) {
          console.log(`\n${dim("Session total:")} ${totalUsage.input_tokens.toLocaleString()} in / ${totalUsage.output_tokens.toLocaleString()} out`);
        }
        console.log(dim("\nGoodbye!"));
        rl.close();
        return;
      }

      messages.push({ role: "user", content: trimmed });
      process.stdout.write(`\n${info("Claude:")} `);

      try {
        const result = await streamChat(
          "You are a helpful document analysis expert. Answer questions about the provided document accurately and conversationally. Be concise but thorough. If asked about something not in the document, say so.",
          file,
          messages,
          opts
        );
        messages.push({ role: "assistant", content: result.text });
        totalUsage.input_tokens += result.usage.input_tokens;
        totalUsage.output_tokens += result.usage.output_tokens;
      } catch (err: any) {
        console.error(`\n${warn("Error:")} ${err.message}`);
      }

      prompt();
    });
  };

  return new Promise<void>((resolve) => {
    rl.on("close", resolve);
    prompt();
  });
}

// ── Translate ───────────────────────────────────────────────

export async function translate(
  filePath: string,
  language: string,
  opts: CommandOpts
) {
  const file = await loadInput(filePath);
  header("Translate", formatFileInfo(file));
  console.log(`${dim("Target language:")} ${bold(language)}\n`);

  const result = await streamResponse(
    "You are a professional translator. Translate documents accurately while preserving tone, formatting, and meaning. Do not add explanations — only output the translation.",
    file,
    `Translate this document into ${language}. Preserve all formatting (headings, lists, code blocks, etc). If the document contains code, translate only comments and strings, not the code itself. Output ONLY the translation.`,
    opts
  );

  showUsage(opts, result.usage);
  await writeOutput(opts, result.text);
}

// ── Redact (find PII / sensitive data) ──────────────────────

export async function redact(
  filePath: string,
  opts: CommandOpts & { format?: string }
) {
  const file = await loadInput(filePath);
  header("Security Scan", formatFileInfo(file));

  if (opts.format === "json") {
    const spin = spinner("Scanning for sensitive data");
    const { data, usage } = await requestJSON<RedactReport>(
      "You are a data privacy and security expert. Identify PII and sensitive data with high accuracy. Return ONLY valid JSON.",
      file,
      `Scan this document for personally identifiable information (PII) and sensitive data. Return a JSON object:

{
  "total_findings": 5,
  "high_risk": 2,
  "medium_risk": 2,
  "low_risk": 1,
  "findings": [
    {
      "type": "email|phone|ssn|credit_card|address|name|api_key|password|ip_address|date_of_birth|financial|medical|other",
      "value": "The actual sensitive value found",
      "location": "Where in the document it appears",
      "risk": "high|medium|low",
      "recommendation": "What to do about it"
    }
  ],
  "summary": "Overall assessment of data sensitivity"
}

Check for: emails, phone numbers, SSNs, credit card numbers, API keys, passwords, secrets, tokens, IP addresses, physical addresses, dates of birth, financial data, medical information, and any other PII. Be thorough.`,
      opts
    );
    spin.stop();

    const output = JSON.stringify(data, null, 2);
    console.log(output);
    showUsage(opts, usage);
    await writeOutput(opts, output);
  } else {
    const result = await streamResponse(
      "You are a data privacy and security expert. Identify PII and sensitive data with high accuracy.",
      file,
      `Scan this document for personally identifiable information (PII) and sensitive data.

Report your findings as:

## Summary
Brief overview — how sensitive is this document?

## High Risk Findings
Data that could cause significant harm if exposed (SSNs, credit cards, passwords, API keys, medical records).

## Medium Risk Findings
Data that could identify individuals (emails, phone numbers, addresses, full names + context).

## Low Risk Findings
Potentially sensitive but lower risk (first names only, general locations, dates).

## Recommendations
What should be done to protect this data before sharing/publishing.

For each finding, quote the exact text found and its location. If the document is clean, say so.`,
      opts
    );

    showUsage(opts, result.usage);
    await writeOutput(opts, result.text);
  }
}

// ── Rewrite ─────────────────────────────────────────────────

export async function rewrite(
  filePath: string,
  opts: CommandOpts & { tone?: string; audience?: string }
) {
  const file = await loadInput(filePath);
  header("Rewrite", formatFileInfo(file));

  const toneGuide = opts.tone
    ? `Rewrite in a ${opts.tone} tone.`
    : "Improve clarity and readability while keeping the same tone.";

  const audienceGuide = opts.audience
    ? `Target audience: ${opts.audience}.`
    : "";

  console.log(`${dim("Tone:")} ${bold(opts.tone || "improved")}${opts.audience ? `  ${dim("Audience:")} ${bold(opts.audience)}` : ""}\n`);

  const result = await streamResponse(
    "You are a professional editor and writer. Rewrite documents to match the requested tone and audience while preserving all factual content and key information. Output ONLY the rewritten text.",
    file,
    `Rewrite this document. ${toneGuide} ${audienceGuide}

Rules:
- Preserve all factual content and data points
- Keep the same overall structure unless restructuring improves clarity
- If the document contains code, only rewrite comments and documentation, not code
- Do not add information that wasn't in the original
- Output ONLY the rewritten document, no commentary`,
    opts
  );

  showUsage(opts, result.usage);
  await writeOutput(opts, result.text);
}

// ── Batch review (directory) ────────────────────────────────

export async function batchReview(
  dirPath: string,
  opts: CommandOpts
) {
  const files = listCodeFiles(dirPath);

  if (files.length === 0) {
    console.log(warn("No code files found in directory."));
    return;
  }

  header("Batch Code Review", `${files.length} files in ${dirPath}`);
  console.log(dim(files.map((f) => `  ${f}`).join("\n")) + "\n");

  let totalUsage = { input_tokens: 0, output_tokens: 0, model: "batch" };

  for (const filePath of files) {
    const file = readFile(filePath);
    subheader(formatFileInfo(file));

    const result = await streamResponse(
      "You are a senior software engineer. Give a BRIEF code review — 3-5 bullet points max. Focus only on critical issues and bugs. Skip style nits. If the file looks good, just say so in one line.",
      file,
      "Brief code review. Critical issues only. Be concise.",
      opts
    );

    totalUsage.input_tokens += result.usage.input_tokens;
    totalUsage.output_tokens += result.usage.output_tokens;
    totalUsage.model = result.usage.model;
  }

  if (opts.usage) formatUsage(totalUsage);
}
