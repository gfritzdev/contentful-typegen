import { describe, it, beforeEach, expect, vi } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { TOGGLES_MODELS } from "./__mock__/models.mock";

vi.mock("contentful-management", () => {
  const createClient = () => ({
    getSpace: async () => ({
      getEnvironment: async () => ({
        getContentTypes: async () => ({ items: TOGGLES_MODELS.items }),
      }),
    }),
  });
  return { default: { createClient }, createClient };
});

describe("generateContentfulTypes (toggles)", () => {
  const outFile = path.join(
    process.cwd(),
    "__tests__",
    "artifacts",
    "toggles.d.ts"
  );

  beforeEach(async () => {
    vi.resetModules();
    await fs.rm(outFile, { force: true });
  });

  it("no-aliases + readonly arrays + no brand + no undefined-optionals", async () => {
    const { generateContentfulTypes } = await import("../src/generate");

    await generateContentfulTypes({
      spaceId: "S",
      environmentId: "E",
      managementToken: "T",
      outFile,
      prefix: "I",
      renderOptions: {
        includeUndefinedOnOptional: false, // no " | undefined"
        arraysReadonly: true, // ReadonlyArray<T>
        preferLinkedAliases: false, // Entry<IFields> instead of alias
        brandContentTypeId: false, // type alias instead of branded interface
      },
    });

    const text = await fs.readFile(outFile, "utf8");

    // Arrays readonly + aliases disabled
    expect(text).toMatch(
      /related\?\s*:\s*ReadonlyArray<Entry<IArticleFields>>;/
    );

    // Single entry link uses Entry<IFields>
    expect(text).toMatch(/author\?\s*:\s*Entry<IPersonFields>;/);

    // Optional unions without "| undefined"
    expect(text).toMatch(
      /status\?\s*:\s*['"]draft['"]\s*\|\s*['"]published['"]\s*;/
    );
    expect(text).toMatch(
      /role\?\s*:\s*['"]Staff['"]\s*\|\s*['"]Contributor['"]\s*\|\s*['"]Guest['"]\s*;/
    );
    expect(text).not.toMatch(/\|\s*undefined/);

    // No brand: type aliases instead of branded interfaces
    expect(text).toContain("export type IArticle = Entry<IArticleFields>;");
    expect(text).toContain("export type IPerson = Entry<IPersonFields>;");
    expect(text).not.toContain("export interface IArticle extends Entry<");
    expect(text).not.toContain("export interface IPerson extends Entry<");
    expect(text).not.toContain("id: 'article';");
    expect(text).not.toContain("id: 'person';");
  });
});
