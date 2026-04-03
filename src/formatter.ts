import type { TokenUsage } from "./types.js";

// ── ANSI escape codes ───────────────────────────────────────

const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const MAGENTA = "\x1b[35m";

// Disable colors if NO_COLOR env is set or not a TTY
const useColor = !process.env.NO_COLOR && process.stdout.isTTY;

function c(code: string, text: string): string {
  return useColor ? `${code}${text}${RESET}` : text;
}

// ── Public formatting helpers ───────────────────────────────

export function bold(text: string): string {
  return c(BOLD, text);
}

export function dim(text: string): string {
  return c(DIM, text);
}

export function success(text: string): string {
  return c(GREEN, text);
}

export function warn(text: string): string {
  return c(YELLOW, text);
}

export function error(text: string): string {
  return c(RED, text);
}

export function info(text: string): string {
  return c(CYAN, text);
}

export function accent(text: string): string {
  return c(MAGENTA, text);
}

// ── Section headers ─────────────────────────────────────────

export function header(label: string, detail?: string): void {
  const line = "─".repeat(50);
  console.error(`\n${dim(line)}`);
  console.error(`  ${bold(label)}${detail ? `  ${dim(detail)}` : ""}`);
  console.error(`${dim(line)}\n`);
}

export function subheader(label: string): void {
  console.error(`\n${info(">")} ${bold(label)}\n`);
}

// ── Token usage display ─────────────────────────────────────

// Pricing per million tokens (as of 2025)
const PRICING: Record<string, { input: number; output: number }> = {
  "sonnet": { input: 3, output: 15 },
  "opus": { input: 15, output: 75 },
  "haiku": { input: 0.8, output: 4 },
};

export function formatUsage(usage: TokenUsage): void {
  const pricing = Object.entries(PRICING).find(([key]) =>
    usage.model.toLowerCase().includes(key)
  );

  const inputCost = pricing
    ? (usage.input_tokens / 1_000_000) * pricing[1].input
    : null;
  const outputCost = pricing
    ? (usage.output_tokens / 1_000_000) * pricing[1].output
    : null;
  const totalCost =
    inputCost !== null && outputCost !== null ? inputCost + outputCost : null;

  console.error(`\n${dim("─".repeat(50))}`);
  console.error(
    `  ${dim("Tokens:")} ${accent(usage.input_tokens.toLocaleString())} in / ${accent(usage.output_tokens.toLocaleString())} out`
  );
  console.error(`  ${dim("Model:")}  ${usage.model}`);
  if (totalCost !== null) {
    console.error(`  ${dim("Cost:")}   ${success("$" + totalCost.toFixed(4))}`);
  }
  console.error(dim("─".repeat(50)));
}

// ── Spinner (simple dots for non-streaming waits) ───────────

export function spinner(label: string): { stop: () => void } {
  const frames = [".", "..", "..."];
  let i = 0;
  const interval = setInterval(() => {
    process.stderr.write(`\r${dim(label + frames[i % frames.length])}   `);
    i++;
  }, 400);

  return {
    stop() {
      clearInterval(interval);
      process.stderr.write("\r" + " ".repeat(label.length + 10) + "\r");
    },
  };
}
