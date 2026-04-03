import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { DocbriefError, AuthError, RateLimitError, FileError } from "../src/errors.js";

describe("DocbriefError", () => {
  it("has a default exitCode of 1", () => {
    const err = new DocbriefError("generic error");
    assert.equal(err.exitCode, 1);
    assert.ok(err instanceof Error);
  });
});

describe("AuthError", () => {
  it("extends DocbriefError and Error", () => {
    const err = new AuthError();
    assert.ok(err instanceof DocbriefError);
    assert.ok(err instanceof Error);
  });

  it("has exitCode 2", () => {
    const err = new AuthError();
    assert.equal(err.exitCode, 2);
  });
});

describe("RateLimitError", () => {
  it("has exitCode 3", () => {
    const err = new RateLimitError();
    assert.equal(err.exitCode, 3);
    assert.ok(err instanceof DocbriefError);
  });
});

describe("FileError", () => {
  it("has exitCode 4 and custom message", () => {
    const err = new FileError("File not found: /tmp/x.txt");
    assert.equal(err.exitCode, 4);
    assert.equal(err.message, "File not found: /tmp/x.txt");
    assert.ok(err instanceof DocbriefError);
    assert.ok(err instanceof Error);
  });
});
