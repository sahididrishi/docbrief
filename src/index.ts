#!/usr/bin/env node

import { Command } from "commander";
import { summarize, extract, ask, actions, review, compare } from "./commands.js";

const program = new Command();

program
  .name("docbrief")
  .description(
    "AI-powered document analysis — summarize, extract, question, review, and compare any file using Claude"
  )
  .version("1.0.0");

// ── summarize ───────────────────────────────────────────────

program
  .command("summary")
  .alias("s")
  .description("Generate a concise summary of any document")
  .argument("<file>", "Path to the file to summarize")
  .option(
    "-l, --length <length>",
    "Summary length: short, medium, long",
    "medium"
  )
  .option("-m, --model <model>", "Claude model to use")
  .action((file, opts) => run(() => summarize(file, opts)));

// ── extract ─────────────────────────────────────────────────

program
  .command("extract")
  .alias("e")
  .description(
    "Extract structured data (dates, people, amounts, action items) as JSON"
  )
  .argument("<file>", "Path to the file")
  .option("-m, --model <model>", "Claude model to use")
  .action((file, opts) => run(() => extract(file, opts)));

// ── ask ─────────────────────────────────────────────────────

program
  .command("ask")
  .alias("a")
  .description("Ask a question about a document")
  .argument("<file>", "Path to the file")
  .argument("<question>", "Your question")
  .option("-m, --model <model>", "Claude model to use")
  .action((file, question, opts) => run(() => ask(file, question, opts)));

// ── actions ─────────────────────────────────────────────────

program
  .command("actions")
  .alias("todo")
  .description("Extract action items, tasks, and next steps")
  .argument("<file>", "Path to the file")
  .option("-m, --model <model>", "Claude model to use")
  .action((file, opts) => run(() => actions(file, opts)));

// ── review ──────────────────────────────────────────────────

program
  .command("review")
  .alias("r")
  .description("AI code review — find bugs, security issues, and improvements")
  .argument("<file>", "Path to the code file")
  .option("-f, --format <format>", "Output format: text, json", "text")
  .option("-m, --model <model>", "Claude model to use")
  .action((file, opts) => run(() => review(file, opts)));

// ── compare ─────────────────────────────────────────────────

program
  .command("compare")
  .alias("diff")
  .description("Compare two documents and analyze differences")
  .argument("<file1>", "First file")
  .argument("<file2>", "Second file")
  .option("-m, --model <model>", "Claude model to use")
  .action((file1, file2, opts) => run(() => compare(file1, file2, opts)));

// ── Parse and run ───────────────────────────────────────────

program.parse();

function run(fn: () => Promise<void>) {
  fn().catch((err: Error) => {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  });
}
