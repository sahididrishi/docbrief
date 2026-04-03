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

export interface ComparisonResult {
  summary: string;
  similarities: string[];
  differences: string[];
  recommendation: string;
}
