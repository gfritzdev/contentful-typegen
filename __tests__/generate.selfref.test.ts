import { describe, it, beforeEach, expect, vi } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { SELFREF_MODELS } from "./__mock__/models.mock";

vi.mock("contentful-management", () => {
  const createClient = () => ({
    getSpace: async () => ({
      getEnvironment: async () => ({
        getContentTypes: async () => ({ items: SELFREF_MODELS.items }),
      }),
    }),
  });
  return { default: { createClient }, createClient };
});

describe("generateContentfulTypes (self-reference)", () => {
  const outFile = path.join(
    process.cwd(),
    "__tests__",
    "artifacts",
    "selfref.d.ts"
  );

  beforeEach(async () => {
    vi.resetModules();
    await fs.rm(outFile, { force: true });
  });

  it("handles entry → same entry links for single and array fields", async () => {
    const { generateContentfulTypes } = await import("../src/generate");

    await generateContentfulTypes({
      spaceId: "S",
      environmentId: "E",
      managementToken: "T",
      outFile,
      prefix: "I",
      renderOptions: {
        includeUndefinedOnOptional: true,
        arraysReadonly: false,
        preferLinkedAliases: true,
        brandContentTypeId: true,
      },
    });

    const text = await fs.readFile(outFile, "utf8");

    expect(text).toContain("export interface ITaskFields");
    expect(text).toMatch(/parent\?\s*:\s*ITask\s*\|\s*undefined;/);
    expect(text).toMatch(/children\?\s*:\s*ITask\[\]\s*\|\s*undefined;/);
    expect(text).toContain("id: 'task';");
    expect(text).toContain("linkType: 'ContentType';");
    expect(text).toContain("type: 'Link';");

    expect(text).toMatchSnapshot();
  });
});
