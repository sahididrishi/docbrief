import fs from "fs";
import path from "path";
import type { FileContent, FileType } from "./types.js";
import { FileError } from "./errors.js";

// ── Language detection by extension ─────────────────────────

const CODE_EXTENSIONS: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".cjs": "javascript",
  ".py": "python", ".pyw": "python",
  ".rb": "ruby",
  ".go": "go",
  ".rs": "rust",
  ".java": "java",
  ".kt": "kotlin", ".kts": "kotlin",
  ".swift": "swift",
  ".c": "c", ".h": "c",
  ".cpp": "cpp", ".hpp": "cpp", ".cc": "cpp", ".cxx": "cpp",
  ".cs": "csharp",
  ".php": "php",
  ".r": "r",
  ".scala": "scala",
  ".sh": "bash", ".bash": "bash", ".zsh": "zsh", ".fish": "fish",
  ".sql": "sql",
  ".lua": "lua",
  ".ex": "elixir", ".exs": "elixir",
  ".erl": "erlang",
  ".hs": "haskell",
  ".ml": "ocaml",
  ".dart": "dart",
  ".vue": "vue",
  ".svelte": "svelte",
  ".tf": "terraform", ".hcl": "hcl",
  ".yaml": "yaml", ".yml": "yaml",
  ".toml": "toml",
  ".xml": "xml",
  ".html": "html", ".htm": "html",
  ".css": "css", ".scss": "scss", ".less": "less",
  ".graphql": "graphql", ".gql": "graphql",
  ".proto": "protobuf",
  ".sol": "solidity",
  ".zig": "zig",
  ".nim": "nim",
  ".v": "vlang",
  ".jl": "julia",
};

const IMAGE_EXTENSIONS = new Set([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"]);

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

  if (ext === ".pdf") return { type: "pdf", mimeType: "application/pdf" };
  if (IMAGE_EXTENSIONS.has(ext)) return { type: "image", mimeType: IMAGE_MIME[ext] || "image/png" };
  if (ext === ".csv") return { type: "csv" };

  const language = CODE_EXTENSIONS[ext];
  if (language) return { type: "code", language };

  return { type: "text" };
}

// ── Read a file from disk ───────────────────────────────────

/** Read a file from disk and detect its type. */
export function readFile(filePath: string): FileContent {
  const resolved = path.resolve(filePath);

  if (!fs.existsSync(resolved)) {
    throw new FileError(`File not found: ${resolved}`);
  }

  const stat = fs.statSync(resolved);
  if (!stat.isFile()) {
    throw new FileError(`Not a file: ${resolved}`);
  }

  const maxSize = 50 * 1024 * 1024;
  if (stat.size > maxSize) {
    throw new FileError(
      `File too large: ${(stat.size / 1024 / 1024).toFixed(1)}MB (max 50MB)`
    );
  }

  const { type, language, mimeType } = detectFileType(resolved);
  const name = path.basename(resolved);

  if (type === "pdf" || type === "image") {
    const buffer = fs.readFileSync(resolved);
    return { path: resolved, name, type, mimeType, base64: buffer.toString("base64"), size: stat.size };
  }

  const text = fs.readFileSync(resolved, "utf-8");
  return { path: resolved, name, type, language, text, size: stat.size };
}

// ── Read from stdin (pipe support) ──────────────────────────

/** Read all data from stdin. Throws if stdin is a TTY or exceeds 50MB. */
export async function readStdin(): Promise<FileContent> {
  if (process.stdin.isTTY) {
    throw new FileError("No input piped to stdin. Use a file path instead of '-', or pipe data: echo 'text' | docbrief summary -");
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const maxSize = 50 * 1024 * 1024;

    process.stdin.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxSize) {
        reject(new FileError("Stdin input too large (max 50MB)"));
        process.stdin.destroy();
        return;
      }
      chunks.push(chunk);
    });

    process.stdin.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf-8");
      resolve({
        path: "stdin",
        name: "stdin",
        type: "text",
        text,
        size: Buffer.byteLength(text),
      });
    });

    process.stdin.on("error", reject);
  });
}

// ── Smart file loader (file path or "-" for stdin) ──────────

/** Load input from a file path or stdin (pass '-' for stdin). */
export async function loadInput(filePath: string): Promise<FileContent> {
  if (filePath === "-") {
    return readStdin();
  }
  return readFile(filePath);
}

// ── Format file info for display ────────────────────────────

export function formatFileInfo(file: FileContent): string {
  const sizeStr =
    file.size < 1024
      ? `${file.size}B`
      : file.size < 1024 * 1024
        ? `${(file.size / 1024).toFixed(1)}KB`
        : `${(file.size / 1024 / 1024).toFixed(1)}MB`;

  const typeStr = file.language ? `${file.type} (${file.language})` : file.type;
  return `${file.name} | ${typeStr} | ${sizeStr}`;
}

// ── List code files in a directory ──────────────────────────

/** Recursively list code files in a directory, skipping common non-source dirs. */
export function listCodeFiles(dirPath: string, maxFiles = 20): string[] {
  const resolved = path.resolve(dirPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
    throw new FileError(`Not a directory: ${resolved}`);
  }

  const files: string[] = [];
  const skipDirs = new Set(["node_modules", ".git", "dist", "build", "__pycache__", ".next", "vendor"]);

  function walk(dir: string, depth: number) {
    if (depth > 5 || files.length >= maxFiles) return;

    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (files.length >= maxFiles) break;

      if (entry.isDirectory() && !skipDirs.has(entry.name) && !entry.name.startsWith(".")) {
        walk(path.join(dir, entry.name), depth + 1);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (CODE_EXTENSIONS[ext]) {
          files.push(path.join(dir, entry.name));
        }
      }
    }
  }

  walk(resolved, 0);
  return files;
}
