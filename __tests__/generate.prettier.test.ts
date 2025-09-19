import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";

// tiny fixture so we hit the formatting path
const MODELS = {
  items: [
    {
      sys: { id: "mini", type: "ContentType" },
      name: "Mini",
      fields: [{ id: "title", name: "Title", type: "Symbol", required: true }],
    },
  ],
};

// Mock CMA client to return our tiny model
vi.mock("contentful-management", () => {
  const createClient = () => ({
    getSpace: async () => ({
      getEnvironment: async () => ({
        getContentTypes: async () => ({ items: MODELS.items }),
      }),
    }),
  });
  return { default: { createClient }, createClient };
});

describe("generateContentfulTypes – prettier fallback catch branch", () => {
  const outFile = path.join(
    process.cwd(),
    "__tests__",
    "artifacts",
    "prettier-fallback.d.ts"
  );

  beforeEach(async () => {
    vi.resetModules(); // ensure fresh imports
    await fs.rm(outFile, { force: true });
  });

  it("keeps raw output if prettier.format throws", async () => {
    // Import the (already mocked) prettier from setup.ts and make format throw
    const prettierMod: any = await import("prettier");
    const prettierDefault = prettierMod.default ?? prettierMod;
    const spy = vi.spyOn(prettierDefault, "format").mockImplementation(() => {
      throw new Error("boom from prettier");
    });

    // Now import and run the generator (it will hit the try/catch and fall back)
    const { generateContentfulTypes } = await import("../src/generate");

    await generateContentfulTypes({
      spaceId: "S",
      environmentId: "E",
      managementToken: "T",
      outFile,
      prefix: "I",
      renderOptions: {},
    });

    const text = await fs.readFile(outFile, "utf8");
    expect(text).toContain("export interface IMiniFields");
    expect(text.length).toBeGreaterThan(20);

    spy.mockRestore();
  });
});
