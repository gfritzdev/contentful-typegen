import prettier from "prettier";
import contentfulManagement from "contentful-management";
import fs from "node:fs/promises";
import path from "node:path";
import type { RenderOptions } from "./types.js";
import { createFile } from "./helpers.js";

const { createClient } = contentfulManagement;

/**
 * Generate a TypeScript declaration file (`.d.ts`) for all Contentful content types
 * in the specified environment and write it to disk.
 *
 * Steps:
 *  1) Connect to CMA and fetch content types
 *  2) Build the .d.ts content via `createFile`
 *  3) Format with Prettier (if available)
 *  4) Ensure directory and write file
 */
export async function generateContentfulTypes(params: {
  spaceId: string;
  environmentId: string;
  managementToken: string;
  outFile: string;
  prefix?: string;
  renderOptions?: RenderOptions;
}): Promise<{ count: number; outFile: string }> {
  const {
    spaceId,
    environmentId,
    managementToken,
    outFile,
    prefix,
    renderOptions,
  } = params;

  const client = createClient({ accessToken: managementToken });
  const space = await client.getSpace(spaceId);
  const env = await space.getEnvironment(environmentId);
  const { items } = await env.getContentTypes();

  const raw = createFile(items, {
    prefix,
    includeUndefinedOnOptional:
      renderOptions?.includeUndefinedOnOptional ?? true,
    arraysReadonly: renderOptions?.arraysReadonly ?? false,
    preferLinkedAliases: renderOptions?.preferLinkedAliases ?? true,
    brandContentTypeId: renderOptions?.brandContentTypeId ?? true,
  });

  let output = raw;
  try {
    const prettierConfig = await prettier.resolveConfig(process.cwd());
    output = await prettier.format(raw, {
      ...(prettierConfig ?? {}),
      parser: "typescript",
      filepath: outFile,
    });
  } catch {
    // Formatting is best-effort; keep raw output on failure.
  }

  await fs.mkdir(path.dirname(outFile), { recursive: true });
  await fs.writeFile(outFile, output, "utf8");

  return { count: items.length, outFile };
}
