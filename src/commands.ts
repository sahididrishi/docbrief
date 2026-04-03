import { streamResponse, requestJSON, streamComparison } from "./claude.js";
import { readFile, formatFileInfo } from "./reader.js";
import type { ExtractedData, CodeReview } from "./types.js";

function header(label: string, file: string) {
  console.log(`\n--- ${label} ---`);
  console.log(`${file}\n`);
}

// ── Summarize ───────────────────────────────────────────────

export async function summarize(
  filePath: string,
  opts: { length?: string; model?: string }
) {
  const file = readFile(filePath);
  header("Summary", formatFileInfo(file));

  const lengthGuide =
    opts.length === "short"
      ? "Provide a 2-3 sentence summary."
      : opts.length === "long"
        ? "Provide a thorough summary covering all major points (500-800 words)."
        : "Provide a concise summary covering the key points (150-300 words).";

  await streamResponse(
    "You are a document analysis expert. Provide clear, accurate summaries that capture the essential information. Use plain language.",
    file,
    `Summarize this document. ${lengthGuide}\n\nStructure your response with:\n1. **Overview** — what this document is and its purpose\n2. **Key Points** — the most important information\n3. **Conclusion** — bottom line or main takeaway`,
    { model: opts.model }
  );
}

// ── Extract structured data ─────────────────────────────────

export async function extract(
  filePath: string,
  opts: { model?: string }
) {
  const file = readFile(filePath);
  header("Extracting data", formatFileInfo(file));

  const data = await requestJSON<ExtractedData>(
    "You are a data extraction expert. Extract structured information from documents with high accuracy. Return ONLY valid JSON, no markdown formatting.",
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

Be thorough. Include all instances found, not just the first occurrence.`,
    { model: opts.model }
  );

  console.log(JSON.stringify(data, null, 2));
}

// ── Ask a question ──────────────────────────────────────────

export async function ask(
  filePath: string,
  question: string,
  opts: { model?: string }
) {
  const file = readFile(filePath);
  header("Q&A", formatFileInfo(file));
  console.log(`Q: ${question}\n`);

  await streamResponse(
    "You are a document analysis expert. Answer questions about documents accurately and concisely. If the answer is not in the document, say so clearly. Always cite the relevant section or quote when possible.",
    file,
    `Answer this question about the document:\n\n${question}`,
    { model: opts.model }
  );
}

// ── Extract action items ────────────────────────────────────

export async function actions(
  filePath: string,
  opts: { model?: string }
) {
  const file = readFile(filePath);
  header("Action Items", formatFileInfo(file));

  await streamResponse(
    "You are a project management expert. Extract actionable items from documents with clarity and specificity.",
    file,
    `Extract all action items, tasks, to-dos, next steps, and follow-ups from this document.

For each item, provide:
- **Action**: What needs to be done (specific and actionable)
- **Owner**: Who is responsible (if mentioned, otherwise "Unassigned")
- **Deadline**: When it's due (if mentioned, otherwise "No deadline")
- **Priority**: High / Medium / Low (infer from context)

If there are no action items, say so and suggest potential next steps based on the content.`,
    { model: opts.model }
  );
}

// ── Code review ─────────────────────────────────────────────

export async function review(
  filePath: string,
  opts: { format?: string; model?: string }
) {
  const file = readFile(filePath);

  if (file.type !== "code") {
    console.log(
      `Warning: ${file.name} doesn't appear to be a code file. Reviewing anyway.\n`
    );
  }

  header("Code Review", formatFileInfo(file));

  if (opts.format === "json") {
    const data = await requestJSON<CodeReview>(
      "You are a senior software engineer performing a thorough code review. Return ONLY valid JSON, no markdown formatting.",
      file,
      `Review this code file and return a JSON object:

{
  "file": "${file.name}",
  "language": "${file.language || "unknown"}",
  "summary": "One paragraph overall assessment",
  "issues": [
    {
      "severity": "critical | warning | suggestion",
      "line": null,
      "description": "What the issue is",
      "fix": "How to fix it"
    }
  ],
  "quality_score": 7,
  "strengths": ["Good things about this code"]
}

Be specific with line numbers where possible. Focus on bugs, security issues, performance problems, and maintainability concerns. Score from 1-10.`,
      { model: opts.model }
    );
    console.log(JSON.stringify(data, null, 2));
  } else {
    await streamResponse(
      "You are a senior software engineer performing a thorough code review. Be constructive and specific.",
      file,
      `Review this code and provide feedback organized as:

## Summary
Brief overall assessment and quality score (1-10).

## Critical Issues
Bugs, security vulnerabilities, or correctness problems that must be fixed.

## Warnings
Performance issues, potential edge cases, or maintainability concerns.

## Suggestions
Style improvements, better patterns, or minor enhancements.

## Strengths
What this code does well.

Be specific — reference line numbers and provide code examples for fixes where helpful. If the code is good, say so.`,
      { model: opts.model }
    );
  }
}

// ── Compare two files ───────────────────────────────────────

export async function compare(
  filePath1: string,
  filePath2: string,
  opts: { model?: string }
) {
  const file1 = readFile(filePath1);
  const file2 = readFile(filePath2);

  console.log(`\n--- Comparison ---`);
  console.log(`File 1: ${formatFileInfo(file1)}`);
  console.log(`File 2: ${formatFileInfo(file2)}\n`);

  await streamComparison(
    "You are a document analysis expert skilled at comparing and contrasting documents. Be thorough and specific.",
    file1,
    file2,
    `Compare these two documents and provide:

## Overview
What each document is and their relationship.

## Key Similarities
What they have in common (content, structure, purpose).

## Key Differences
Where they diverge — be specific about what changed, was added, or removed.

## Analysis
What do the differences mean? Any concerns or recommendations?

## Verdict
One-paragraph bottom line.`
  );
}
