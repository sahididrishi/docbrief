#!/usr/bin/env node

import { Command, Option } from "commander";
import {
  summarize, extract, ask, actions, review, compare,
  chat, translate, redact, rewrite, batchReview,
} from "./commands.js";

const program = new Command();

program
  .name("docbrief")
  .description(
    "AI-powered document analysis CLI — summarize, extract, question, review, compare, translate, and more.\nUse '-' as the file argument to read from stdin."
  )
  .version("1.0.0");

// ── Shared option helper ────────────────────────────────────

function addCommonOpts(cmd: Command): Command {
  return cmd
    .option("-m, --model <model>", "Claude model to use")
    .option("-o, --output <file>", "Write output to a file")
    .option("-u, --usage", "Show token usage and estimated cost");
}

// ── summary ─────────────────────────────────────────────────

addCommonOpts(
  program
    .command("summary")
    .alias("s")
    .description("Summarize any document (PDF, code, text, image)")
    .argument("<file>", "File path or '-' for stdin")
    .addOption(new Option("-l, --length <length>", "short | medium | long").default("medium").choices(["short", "medium", "long"]))
).action((file, opts) => run(() => summarize(file, opts)));

// ── extract ─────────────────────────────────────────────────

addCommonOpts(
  program
    .command("extract")
    .alias("e")
    .description("Extract structured data (dates, people, amounts) as JSON")
    .argument("<file>", "File path or '-' for stdin")
).action((file, opts) => run(() => extract(file, opts)));

// ── ask ─────────────────────────────────────────────────────

addCommonOpts(
  program
    .command("ask")
    .alias("a")
    .description("Ask a question about a document")
    .argument("<file>", "File path or '-' for stdin")
    .argument("<question>", "Your question")
).action((file, question, opts) => run(() => ask(file, question, opts)));

// ── actions ─────────────────────────────────────────────────

addCommonOpts(
  program
    .command("actions")
    .alias("todo")
    .description("Extract action items, tasks, and next steps")
    .argument("<file>", "File path or '-' for stdin")
).action((file, opts) => run(() => actions(file, opts)));

// ── review ──────────────────────────────────────────────────

addCommonOpts(
  program
    .command("review")
    .alias("r")
    .description("AI code review — bugs, security issues, improvements")
    .argument("<file>", "File path, directory, or '-' for stdin")
    .addOption(new Option("-f, --format <format>", "text | json").default("text").choices(["text", "json"]))
).action((file, opts) => run(() => review(file, opts)));

// ── compare ─────────────────────────────────────────────────

addCommonOpts(
  program
    .command("compare")
    .alias("diff")
    .description("Compare two documents and analyze differences")
    .argument("<file1>", "First file")
    .argument("<file2>", "Second file")
).action((file1, file2, opts) => run(() => compare(file1, file2, opts)));

// ── chat ────────────────────────────────────────────────────

addCommonOpts(
  program
    .command("chat")
    .alias("c")
    .description("Interactive Q&A session with a document")
    .argument("<file>", "File to chat about")
).action((file, opts) => run(() => chat(file, opts)));

// ── translate ───────────────────────────────────────────────

addCommonOpts(
  program
    .command("translate")
    .alias("t")
    .description("Translate a document to another language")
    .argument("<file>", "File path or '-' for stdin")
    .argument("<language>", "Target language (e.g. Spanish, Japanese, French)")
).action((file, language, opts) => run(() => translate(file, language, opts)));

// ── redact ──────────────────────────────────────────────────

addCommonOpts(
  program
    .command("redact")
    .description("Scan for PII and sensitive data (emails, SSNs, API keys, etc)")
    .argument("<file>", "File path or '-' for stdin")
    .addOption(new Option("-f, --format <format>", "text | json").default("text").choices(["text", "json"]))
).action((file, opts) => run(() => redact(file, opts)));

// ── rewrite ─────────────────────────────────────────────────

addCommonOpts(
  program
    .command("rewrite")
    .alias("rw")
    .description("Rewrite a document in a different tone or for a different audience")
    .argument("<file>", "File path or '-' for stdin")
    .option("-t, --tone <tone>", "Target tone: formal, casual, technical, simple, persuasive")
    .option("-a, --audience <audience>", "Target audience: executive, developer, student, client")
).action((file, opts) => run(() => rewrite(file, opts)));

// ── batch ───────────────────────────────────────────────────

addCommonOpts(
  program
    .command("batch")
    .alias("b")
    .description("Review all code files in a directory")
    .argument("<directory>", "Directory to scan")
).action((dir, opts) => run(() => batchReview(dir, opts)));

// ── Parse and run ───────────────────────────────────────────

program.parse();

function run(fn: () => Promise<void>) {
  fn().catch((err: Error) => {
    const msg = err.message.includes("Could not process")
      ? "API error — check your ANTHROPIC_API_KEY and try again"
      : err.message;
    console.error(`\n\x1b[31mError:\x1b[0m ${msg}`);
    process.exit(1);
  });
}
