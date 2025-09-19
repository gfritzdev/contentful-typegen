import { describe, it, beforeEach, expect, vi } from "vitest";
import path from "node:path";
import fs from "node:fs/promises";
import { BASIC_MODELS } from "./__mock__/models.mock";

// Mock the Contentful Management SDK with DEFAULT + named exports
vi.mock("contentful-management", () => {
  const createClient = () => ({
    getSpace: async () => ({
      getEnvironment: async () => ({
        getContentTypes: async () => ({ items: BASIC_MODELS.items }),
      }),
    }),
  });
  return { default: { createClient }, createClient };
});

// NOTE: Prettier is mocked in __tests__/setup.ts

describe("generateContentfulTypes (happy path)", () => {
  const outFile = path.join(
    process.cwd(),
    "__tests__",
    "artifacts",
    "basic.d.ts"
  );

  beforeEach(async () => {
    vi.resetModules();
    await fs.rm(outFile, { force: true });
  });

  it("writes a .d.ts with unions, narrowed links, aliases, branded contentType id, and optionals", async () => {
    const { generateContentfulTypes } = await import("../src/generate");

    const result = await generateContentfulTypes({
      spaceId: "SPACE",
      environmentId: "ENV",
      managementToken: "TOKEN",
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

    expect(text).toContain("export interface IArticleFields");
    expect(text).toContain("export interface IPersonFields");
    expect(text).toMatch(
      /status\?\s*:\s*("draft" \| "published")\s*\|\s*undefined;/
    );
    expect(text).toMatch(
      /role\?\s*:\s*("Staff" \| "Contributor" \| "Guest")\s*\|\s*undefined;/
    );
    expect(text).toMatch(/heroImage\?\s*:\s*Asset\s*\|\s*undefined;/);
    expect(text).toMatch(/author\?\s*:\s*IPerson\s*\|\s*undefined;/);
    expect(text).toMatch(/related\?\s*:\s*IArticle\[\]\s*\|\s*undefined;/);
    expect(text).toContain("id: 'article';");
    expect(text).toContain("linkType: 'ContentType';");
    expect(text).toContain("type: 'Link';");
    expect(text).toMatchSnapshot();

    expect(result).toEqual(expect.objectContaining({ count: 2, outFile }));
  });
});
