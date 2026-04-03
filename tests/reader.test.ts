import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, formatFileInfo, listCodeFiles } from "../src/reader.js";
import fs from "fs";
import path from "path";
import os from "os";

let tmpDir: string;

before(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "docbrief-test-"));

  // Create test files
  fs.writeFileSync(path.join(tmpDir, "hello.ts"), 'const x: number = 42;\nconsole.log(x);');
  fs.writeFileSync(path.join(tmpDir, "notes.md"), "# Meeting Notes\n\nDiscussed Q3 targets.");
  fs.writeFileSync(path.join(tmpDir, "data.csv"), "name,age\nAlice,30\nBob,25");
  fs.writeFileSync(path.join(tmpDir, "config.yaml"), "port: 3000\nhost: localhost");
  fs.writeFileSync(path.join(tmpDir, "app.py"), "def main():\n    print('hello')");
  fs.writeFileSync(path.join(tmpDir, "styles.css"), "body { margin: 0; }");

  // Create a subdirectory with more code
  const subDir = path.join(tmpDir, "src");
  fs.mkdirSync(subDir);
  fs.writeFileSync(path.join(subDir, "index.js"), "module.exports = {}");
  fs.writeFileSync(path.join(subDir, "utils.go"), "package main");
});

after(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ── File type detection ─────────────────────────────────────

describe("File type detection", () => {
  it("detects TypeScript files", () => {
    const file = readFile(path.join(tmpDir, "hello.ts"));
    assert.equal(file.type, "code");
    assert.equal(file.language, "typescript");
    assert.ok(file.text?.includes("const x"));
  });

  it("detects Markdown as text", () => {
    const file = readFile(path.join(tmpDir, "notes.md"));
    assert.equal(file.type, "text");
    assert.ok(file.text?.includes("Meeting Notes"));
  });

  it("detects CSV files", () => {
    const file = readFile(path.join(tmpDir, "data.csv"));
    assert.equal(file.type, "csv");
  });

  it("detects YAML as code", () => {
    const file = readFile(path.join(tmpDir, "config.yaml"));
    assert.equal(file.type, "code");
    assert.equal(file.language, "yaml");
  });

  it("detects Python files", () => {
    const file = readFile(path.join(tmpDir, "app.py"));
    assert.equal(file.type, "code");
    assert.equal(file.language, "python");
  });

  it("detects CSS files", () => {
    const file = readFile(path.join(tmpDir, "styles.css"));
    assert.equal(file.type, "code");
    assert.equal(file.language, "css");
  });
});

// ── File reading ────────────────────────────────────────────

describe("File reading", () => {
  it("reads a file successfully", () => {
    const file = readFile(path.join(tmpDir, "hello.ts"));
    assert.ok(file.text);
    assert.ok(file.size > 0);
    assert.equal(file.name, "hello.ts");
  });

  it("throws on non-existent file", () => {
    assert.throws(
      () => readFile(path.join(tmpDir, "nope.txt")),
      /File not found/
    );
  });

  it("throws on directory", () => {
    assert.throws(
      () => readFile(tmpDir),
      /Not a file/
    );
  });

  it("calculates correct file size", () => {
    const content = "Hello, World!";
    const testFile = path.join(tmpDir, "size-test.txt");
    fs.writeFileSync(testFile, content);
    const file = readFile(testFile);
    assert.equal(file.size, Buffer.byteLength(content));
  });
});

// ── File info formatting ────────────────────────────────────

describe("formatFileInfo", () => {
  it("formats code file info", () => {
    const file = readFile(path.join(tmpDir, "hello.ts"));
    const info = formatFileInfo(file);
    assert.ok(info.includes("hello.ts"));
    assert.ok(info.includes("typescript"));
    assert.ok(info.includes("B") || info.includes("KB"));
  });

  it("formats text file info", () => {
    const file = readFile(path.join(tmpDir, "notes.md"));
    const info = formatFileInfo(file);
    assert.ok(info.includes("notes.md"));
    assert.ok(info.includes("text"));
  });
});

// ── Directory scanning ──────────────────────────────────────

describe("listCodeFiles", () => {
  it("finds code files in a directory", () => {
    const files = listCodeFiles(tmpDir);
    assert.ok(files.length >= 4); // .ts, .py, .css, .yaml, .js, .go
  });

  it("finds files in subdirectories", () => {
    const files = listCodeFiles(tmpDir);
    const hasSubDirFile = files.some((f) => f.includes("index.js") || f.includes("utils.go"));
    assert.ok(hasSubDirFile);
  });

  it("respects maxFiles limit", () => {
    const files = listCodeFiles(tmpDir, 2);
    assert.ok(files.length <= 2);
  });

  it("throws on non-directory", () => {
    assert.throws(
      () => listCodeFiles(path.join(tmpDir, "hello.ts")),
      /Not a directory/
    );
  });
});
