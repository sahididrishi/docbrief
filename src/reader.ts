import fs from "fs";
import path from "path";
import type { FileContent, FileType } from "./types.js";

// ── Language detection by extension ─────────────────────────

const CODE_EXTENSIONS: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin",
  ".swift": "swift",
  ".c": "c",
  ".cpp": "cpp",
  ".h": "c",
  ".hpp": "cpp",
  ".cs": "csharp",
  ".php": "php",
  ".r": "r",
  ".scala": "scala",
  ".sh": "bash",
  ".bash": "bash",
  ".zsh": "zsh",
  ".fish": "fish",
  ".sql": "sql",
  ".lua": "lua",
  ".ex": "elixir",
  ".exs": "elixir",
  ".erl": "erlang",
  ".hs": "haskell",
  ".ml": "ocaml",
  ".dart": "dart",
  ".vue": "vue",
  ".svelte": "svelte",
};

const IMAGE_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".bmp",
]);

const IMAGE_MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
};

// ── File type detection ─────────────────────────────────────

function detectFileType(filePath: string): {
  type: FileType;
  language?: string;
  mimeType?: string;
} {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".pdf") {
    return { type: "pdf", mimeType: "application/pdf" };
  }

  if (IMAGE_EXTENSIONS.has(ext)) {
    return { type: "image", mimeType: IMAGE_MIME[ext] || "image/png" };
  }

  if (ext === ".csv") {
    return { type: "csv" };
  }

  const language = CODE_EXTENSIONS[ext];
  if (language) {
    return { type: "code", language };
  }

  // Default: treat as text
  return { type: "text" };
}

// ── Read a file and return structured content ───────────────

export function readFile(filePath: string): FileContent {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new Error(`File not found: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new Error(`Not a file: ${resolved}`);
  }

  const maxSize = 50 * 1024 * 1024; // 50MB limit
  if (stat.size > maxSize) {
    throw new Error(
      `File too large: ${(stat.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`
    );
  }

  const { type, language, mimeType } = detectFileType(resolved);
  const name = path.basename(resolved);

  if (type === "pdf" || type === "image") {
    const buffer = fs.readFileSync(resolved);
    return {
      path: resolved,
      name,
      type,
      mimeType,
      base64: buffer.toString("base64"),
      size: stat.size,
    };
  }

  // Text-based files
  const text = fs.readFileSync(resolved, "utf-8");
  return {
    path: resolved,
    name,
    type,
    language,
    text,
    size: stat.size,
  };
}

// ── Format file info for display ────────────────────────────

export function formatFileInfo(file: FileContent): string {
  const sizeStr =
    file.size < 1024
      ? `${file.size}B`
      : file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)}KB`
        : `${(file.size / 1024 / 1024).toFixed(1)}MB`;

  const typeStr = file.language
    ? `${file.type} (${file.language})`
    : file.type;

  return `${file.name} | ${typeStr} | ${sizeStr}`;
}
