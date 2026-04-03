// ── File handling ───────────────────────────────────────────

export type FileType = "text" | "code" | "pdf" | "image" | "csv";

export interface FileContent {
  path: string;
  name: string;
  type: FileType;
  language?: string;
  /** Text content for text/code/csv files */
  text?: string;
  /** Base64 data for PDF/image files */
  base64?: string;
  /** MIME type for binary files */
  mimeType?: string;
  /** File size in bytes */
  size: number;
}

// ── API usage tracking ──────────────────────────────────────

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
  model: string;
}

export interface StreamResult {
  text: string;
  usage: TokenUsage;
}

// ── Command output types ────────────────────────────────────

export type OutputFormat = "text" | "json" | "markdown";

export interface ExtractedData {
  title: string | null;
  dates: string[];
  people: string[];
  organizations: string[];
  amounts: string[];
  key_facts: string[];
  action_items: string[];
  metadata: Record<string, string>;
}

export interface ReviewIssue {
  severity: "critical" | "warning" | "suggestion";
  line?: number;
  description: string;
  fix?: string;
}

export interface CodeReview {
  file: string;
  language: string;
  summary: string;
  issues: ReviewIssue[];
  quality_score: number;
  strengths: string[];
}

export interface RedactFinding {
  type: string;
  value: string;
  location: string;
  risk: "high" | "medium" | "low";
  recommendation: string;
}

export interface RedactReport {
  total_findings: number;
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  findings: RedactFinding[];
  summary: string;
}

// ── Shared command options ──────────────────────────────────

export interface CommandOpts {
  model?: string;
  output?: string;
  usage?: boolean;
}
