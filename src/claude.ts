import Anthropic from "@anthropic-ai/sdk";
import type { FileContent } from "./types.js";

// ── Client singleton ────────────────────────────────────────

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.error(
        "\nError: ANTHROPIC_API_KEY environment variable is not set.\n\n" +
          "Get your API key at: https://console.anthropic.com/settings/keys\n" +
          "Then run:  export ANTHROPIC_API_KEY=sk-ant-...\n"
      );
      process.exit(1);
    }
    client = new Anthropic();
  }
  return client;
}

// ── Build message content from file ─────────────────────────

function buildFileContent(file: FileContent): Anthropic.ContentBlockParam[] {
  const blocks: Anthropic.ContentBlockParam[] = [];

  if (file.type === "pdf" && file.base64) {
    blocks.push({
      type: "document",
      source: {
        type: "base64",
        media_type: "application/pdf",
        data: file.base64,
      },
    } as any);
  } else if (file.type === "image" && file.base64 && file.mimeType) {
    blocks.push({
      type: "image",
      source: {
        type: "base64",
        media_type: file.mimeType as any,
        data: file.base64,
      },
    });
  } else if (file.text) {
    const label = file.language
      ? `\`\`\`${file.language}\n${file.text}\n\`\`\``
      : file.text;
    blocks.push({
      type: "text",
      text: `File: ${file.name}\n\n${label}`,
    });
  }

  return blocks;
}

// ── Stream a response to stdout ─────────────────────────────

export async function streamResponse(
  systemPrompt: string,
  file: FileContent,
  userInstruction: string,
  opts?: { json?: boolean; model?: string }
): Promise<string> {
  const claude = getClient();

  const fileBlocks = buildFileContent(file);
  fileBlocks.push({ type: "text", text: userInstruction });

  const stream = claude.messages.stream({
    model: opts?.model ?? "claude-sonnet-4-5-20241022",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: fileBlocks,
      },
    ],
  });

  let fullResponse = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const text = event.delta.text;
      process.stdout.write(text);
      fullResponse += text;
    }
  }

  process.stdout.write("\n");
  return fullResponse;
}

// ── Non-streaming request (for JSON output) ─────────────────

export async function requestJSON<T>(
  systemPrompt: string,
  file: FileContent,
  userInstruction: string,
  opts?: { model?: string }
): Promise<T> {
  const claude = getClient();

  const fileBlocks = buildFileContent(file);
  fileBlocks.push({ type: "text", text: userInstruction });

  const response = await claude.messages.create({
    model: opts?.model ?? "claude-sonnet-4-5-20241022",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: fileBlocks,
      },
    ],
  });

  const text =
    response.content[0].type === "text" ? response.content[0].text : "";

  // Extract JSON from response (handles markdown code blocks)
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
  const jsonStr = jsonMatch[1]?.trim() ?? text.trim();

  try {
    return JSON.parse(jsonStr) as T;
  } catch {
    throw new Error(`Failed to parse JSON from Claude response:\n${text}`);
  }
}

// ── Compare two files ───────────────────────────────────────

export async function streamComparison(
  systemPrompt: string,
  file1: FileContent,
  file2: FileContent,
  userInstruction: string
): Promise<string> {
  const claude = getClient();

  const content: Anthropic.ContentBlockParam[] = [
    ...buildFileContent(file1),
    { type: "text", text: "\n---\n\nSecond document:\n" },
    ...buildFileContent(file2),
    { type: "text", text: userInstruction },
  ];

  const stream = claude.messages.stream({
    model: "claude-sonnet-4-5-20241022",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content }],
  });

  let fullResponse = "";

  for await (const event of stream) {
    if (
      event.type === "content_block_delta" &&
      event.delta.type === "text_delta"
    ) {
      const text = event.delta.text;
      process.stdout.write(text);
      fullResponse += text;
    }
  }

  process.stdout.write("\n");
  return fullResponse;
}
