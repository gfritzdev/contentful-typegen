#!/usr/bin/env node
import "dotenv/config";
import { generateContentfulTypes } from "./generate.js";
import { getArg, printHelp } from "./helpers.js";

/**
 * CLI entrypoint: validates inputs, then generates the `.d.ts` file.
 *
 * Flags:
 *  --space <id>                Contentful Space ID (or CF_SPACE_ID)
 *  --env <id>                  Environment ID (or CF_ENV)
 *  --token <token>             CMA token (or CF_MANAGER_TOKEN)
 *  --out <path>                Output file path (default: types/contentful.d.ts)
 *  --prefix <I>                Interface prefix (default: I)
 *
 * Rendering toggles (defaults mirror contentful-typescript-codegen ergonomics):
 *  --no-undefined-optionals    Do NOT include `| undefined` on optional props (default: include)
 *  --readonly-arrays           Use ReadonlyArray<T> instead of T[] (default: T[])
 *  --no-aliases                Use Entry<IThingFields> instead of IThing for links (default: alias)
 *  --no-brand                  Do NOT brand sys.contentType.sys.id (default: brand)
 */
async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    printHelp("contentful-typegen");
    return;
  }

  const spaceId = getArg("space") || process.env.CF_SPACE_ID;
  const environmentId = getArg("env") || process.env.CF_ENV;
  const managementToken = getArg("token") || process.env.CF_MANAGER_TOKEN;
  const outFile = getArg("out", "types/contentful.d.ts");
  const prefix = getArg("prefix", "I");

  if (!spaceId || !environmentId || !managementToken) {
    console.error(
      "❌ Missing required inputs. Provide --space, --env, --token or set CF_SPACE_ID / CF_ENV / CF_MANAGER_TOKEN."
    );
    process.exit(1);
  }

  // Rendering flags (boolean presence toggles)
  const includeUndefinedOnOptional = !process.argv.includes(
    "--no-undefined-optionals"
  );
  const arraysReadonly = process.argv.includes("--readonly-arrays");
  const preferLinkedAliases = !process.argv.includes("--no-aliases");
  const brandContentTypeId = !process.argv.includes("--no-brand");

  try {
    const { count, outFile: out } = await generateContentfulTypes({
      spaceId,
      environmentId,
      managementToken,
      outFile,
      prefix,
      renderOptions: {
        includeUndefinedOnOptional,
        arraysReadonly,
        preferLinkedAliases,
        brandContentTypeId,
      },
    });

    console.log(`✅ Generated ${count} type(s) → ${out}`);
  } catch (err) {
    console.error("❌ contentful-typegen failed");
    console.error(err instanceof Error ? err.stack || err.message : err);
    process.exit(1);
  }
}

main();
