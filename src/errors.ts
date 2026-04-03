export class DocbriefError extends Error {
  constructor(message: string, public exitCode: number = 1) {
    super(message);
    this.name = "DocbriefError";
  }
}

export class AuthError extends DocbriefError {
  constructor() {
    super(
      "Invalid or missing API key.\n" +
      "Set your key: export ANTHROPIC_API_KEY=sk-ant-...\n" +
      "Get one at: https://console.anthropic.com/settings/keys",
      2
    );
    this.name = "AuthError";
  }
}

export class RateLimitError extends DocbriefError {
  constructor() {
    super("Rate limited by the API. Wait a moment and try again.", 3);
    this.name = "RateLimitError";
  }
}

export class FileError extends DocbriefError {
  constructor(message: string) {
    super(message, 4);
    this.name = "FileError";
  }
}
