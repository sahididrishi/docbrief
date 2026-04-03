import Anthropic from "@anthropic-ai/sdk";
import type { FileContent, TokenUsage, StreamResult } from "./types.js";

const DEFAULT_MODEL = "claude-sonnet-4-20250514";

// ── Build message content from file ─────────────────────────

export function buildFileContent(file: FileContent): Anthropic.ContentBlockParam[] {
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
  } else if (file.text != null) {
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

// ── Claude client class with dependency injection ───────────

export class ClaudeClient {
  private client: Anthropic;
  private model: string;

  constructor(opts?: { apiKey?: string; model?: string }) {
    const apiKey = opts?.apiKey || process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is not set.\n" +
        "Get your key at: https://console.anthropic.com/settings/keys\n" +
        "Then run: export ANTHROPIC_API_KEY=sk-ant-..."
      );
    }
    this.client = new Anthropic({
      apiKey,
      maxRetries: 3,
      timeout: 120_000, // 2 minutes
    });
    this.model = opts?.model || DEFAULT_MODEL;
  }

  // ── Shared stream drain helper ──────────────────────────

  private async drainStream(stream: any): Promise<StreamResult> {
    let fullResponse = "";
    for await (const event of stream) {
      if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
        process.stdout.write(event.delta.text);
        fullResponse += event.delta.text;
      }
    }
    process.stdout.write("\n");
    const finalMessage = await stream.finalMessage();
    return {
      text: fullResponse,
      usage: {
        input_tokens: finalMessage.usage.input_tokens,
        output_tokens: finalMessage.usage.output_tokens,
        model: finalMessage.model,
      },
    };
  }

  // ── Stream a response to stdout ───────────────────────────

  async streamResponse(
    systemPrompt: string,
    file: FileContent,
    userInstruction: string,
    opts?: { model?: string }
  ): Promise<StreamResult> {
    const fileBlocks = buildFileContent(file);
    fileBlocks.push({ type: "text", text: userInstruction });

    const stream = this.client.messages.stream({
      model: opts?.model ?? this.model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: fileBlocks }],
    });

    return this.drainStream(stream);
  }

  // ── Non-streaming request (for JSON output) ─────────────────

  async requestJSON<T>(
    systemPrompt: string,
    file: FileContent,
    userInstruction: string,
    opts?: { model?: string }
  ): Promise<{ data: T; usage: TokenUsage }> {
    const fileBlocks = buildFileContent(file);
    fileBlocks.push({ type: "text", text: userInstruction });

    const response = await this.client.messages.create({
      model: opts?.model ?? this.model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content: fileBlocks }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";

    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, text];
    const jsonStr = jsonMatch[1]?.trim() ?? text.trim();

    const usage: TokenUsage = {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      model: response.model,
    };

    try {
      return { data: JSON.parse(jsonStr) as T, usage };
    } catch {
      throw new Error(`Failed to parse JSON response:\n${text.slice(0, 500)}`);
    }
  }

  // ── Compare two files ───────────────────────────────────────

  async streamComparison(
    systemPrompt: string,
    file1: FileContent,
    file2: FileContent,
    userInstruction: string,
    opts?: { model?: string }
  ): Promise<StreamResult> {
    const content: Anthropic.ContentBlockParam[] = [
      { type: "text", text: "First document:" },
      ...buildFileContent(file1),
      { type: "text", text: "\n---\n\nSecond document:" },
      ...buildFileContent(file2),
      { type: "text", text: userInstruction },
    ];

    const stream = this.client.messages.stream({
      model: opts?.model ?? this.model,
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: "user", content }],
    });

    return this.drainStream(stream);
  }

  // ── Multi-turn chat ─────────────────────────────────────────

  async streamChat(
    systemPrompt: string,
    file: FileContent,
    messages: Array<{ role: "user" | "assistant"; content: string }>,
    opts?: { model?: string }
  ): Promise<StreamResult> {
    // Build API messages — first user message includes the file
    const apiMessages: Anthropic.MessageParam[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      if (i === 0 && msg.role === "user") {
        const fileBlocks = buildFileContent(file);
        fileBlocks.push({ type: "text", text: msg.content });
        apiMessages.push({ role: "user", content: fileBlocks });
      } else {
        apiMessages.push({ role: msg.role, content: msg.content });
      }
    }

    const stream = this.client.messages.stream({
      model: opts?.model ?? this.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: apiMessages,
    });

    return this.drainStream(stream);
  }
}

// ── Default instance for backward compatibility ─────────────

let defaultClient: ClaudeClient | null = null;

export function getDefaultClient(model?: string): ClaudeClient {
  if (!defaultClient) {
    defaultClient = new ClaudeClient({ model });
  }
  return defaultClient;
}
