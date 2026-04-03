import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { bold, dim, success, warn, error, info, accent, formatUsage } from "../src/formatter.js";

describe("formatter exports", () => {
  it("bold() returns a string", () => {
    const result = bold("hello");
    assert.equal(typeof result, "string");
    assert.ok(result.includes("hello"));
  });

  it("dim() returns a string", () => {
    const result = dim("hello");
    assert.equal(typeof result, "string");
    assert.ok(result.includes("hello"));
  });

  it("success() returns a string", () => {
    assert.ok(success("ok").includes("ok"));
  });

  it("warn() returns a string", () => {
    assert.ok(warn("caution").includes("caution"));
  });

  it("error() returns a string", () => {
    assert.ok(error("fail").includes("fail"));
  });

  it("info() returns a string", () => {
    assert.ok(info("note").includes("note"));
  });

  it("accent() returns a string", () => {
    assert.ok(accent("highlight").includes("highlight"));
  });
});

describe("formatUsage", () => {
  it("does not throw for a sonnet model", () => {
    assert.doesNotThrow(() => {
      formatUsage({ input_tokens: 100, output_tokens: 50, model: "claude-sonnet-4-20250514" });
    });
  });

  it("does not throw for an opus model", () => {
    assert.doesNotThrow(() => {
      formatUsage({ input_tokens: 200, output_tokens: 100, model: "claude-opus-4-20250514" });
    });
  });

  it("does not throw for an unknown model", () => {
    assert.doesNotThrow(() => {
      formatUsage({ input_tokens: 50, output_tokens: 25, model: "unknown-model-xyz" });
    });
  });
});
