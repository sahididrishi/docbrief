import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildFileContent } from "../src/claude.js";
import type { FileContent } from "../src/types.js";

describe("buildFileContent", () => {
  it("returns text block with 'File: name' prefix for text file", () => {
    const file: FileContent = {
      path: "/tmp/readme.md",
      name: "readme.md",
      type: "text",
      text: "Hello world",
      size: 11,
    };
    const blocks = buildFileContent(file);
    assert.equal(blocks.length, 1);
    assert.equal((blocks[0] as any).type, "text");
    assert.ok((blocks[0] as any).text.startsWith("File: readme.md"));
    assert.ok((blocks[0] as any).text.includes("Hello world"));
  });

  it("wraps code file in language fences", () => {
    const file: FileContent = {
      path: "/tmp/app.ts",
      name: "app.ts",
      type: "code",
      language: "typescript",
      text: "const x = 1;",
      size: 12,
    };
    const blocks = buildFileContent(file);
    assert.equal(blocks.length, 1);
    const text = (blocks[0] as any).text as string;
    assert.ok(text.includes("```typescript"));
    assert.ok(text.includes("const x = 1;"));
    assert.ok(text.includes("```"));
  });

  it("returns document block with base64 for PDF file", () => {
    const file: FileContent = {
      path: "/tmp/doc.pdf",
      name: "doc.pdf",
      type: "pdf",
      mimeType: "application/pdf",
      base64: "AAAA",
      size: 3,
    };
    const blocks = buildFileContent(file);
    assert.equal(blocks.length, 1);
    assert.equal((blocks[0] as any).type, "document");
    assert.equal((blocks[0] as any).source.type, "base64");
    assert.equal((blocks[0] as any).source.data, "AAAA");
    assert.equal((blocks[0] as any).source.media_type, "application/pdf");
  });

  it("returns image block with base64 and media_type for image file", () => {
    const file: FileContent = {
      path: "/tmp/photo.png",
      name: "photo.png",
      type: "image",
      mimeType: "image/png",
      base64: "BBBB",
      size: 3,
    };
    const blocks = buildFileContent(file);
    assert.equal(blocks.length, 1);
    assert.equal((blocks[0] as any).type, "image");
    assert.equal((blocks[0] as any).source.type, "base64");
    assert.equal((blocks[0] as any).source.data, "BBBB");
    assert.equal((blocks[0] as any).source.media_type, "image/png");
  });

  it("returns a text block even when text is empty string", () => {
    const file: FileContent = {
      path: "/tmp/empty.txt",
      name: "empty.txt",
      type: "text",
      text: "",
      size: 0,
    };
    const blocks = buildFileContent(file);
    assert.equal(blocks.length, 1);
    assert.equal((blocks[0] as any).type, "text");
  });

  it("returns empty array when text is null/undefined", () => {
    const file: FileContent = {
      path: "/tmp/null.txt",
      name: "null.txt",
      type: "text",
      size: 0,
    };
    const blocks = buildFileContent(file);
    assert.equal(blocks.length, 0);
  });
});
