/**
 * Helper utilities for contentful-typegen.
 * Dependency-free (except Contentful types). Handles:
 *  - name/identifier normalization
 *  - field → TypeScript type mapping
 *  - CLI helpers
 *  - building the final .d.ts string via `createFile`
 */

import type { ContentFields, ContentType } from "contentful-management";
import { CORE_TYPES, CLI_HELP } from "./constants.js";
import type { RenderOptions } from "./types.js";

/**
 * Convert arbitrary text to PascalCase for interface/type names.
 */
export function toPascal(input: string): string {
  return input
    .replace(/\W+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join("");
}

/**
 * Produce a safe TS property identifier from a possibly-missing field id/name.
 */
export function safeProp(id?: string): string {
  const base = id && id.length > 0 ? id : "field";
  const cleaned = base.replace(/\W/g, "_");
  return /^[A-Za-z_]/.test(cleaned) ? cleaned : `_${cleaned}`;
}

type FieldToTsOptions = {
  prefix: string;
  arraysReadonly: boolean;
  preferLinkedAliases: boolean;
};

/**
 * Resolve a Contentful field definition to a TypeScript type string.
 *
 * Notes:
 * - Returns `required` separately; caller decides `?` and `| undefined`.
 * - Supports string/number literal unions via `in` validations.
 * - Narrows entry links using `linkContentType`; unknown targets → `Entry<unknown>`.
 * - Arrays honor `ReadonlyArray<T>` or `T[]` per options.
 * - RichText maps to local `Document` stub.
 */
export function fieldToTs(
  field: ContentFields,
  allTypeIds: string[],
  optsOrPrefix: string | FieldToTsOptions = "I"
): { name: string; tsType: string; required: boolean } {
  const opts: FieldToTsOptions =
    typeof optsOrPrefix === "string"
      ? {
          prefix: optsOrPrefix,
          arraysReadonly: false,
          preferLinkedAliases: true,
        }
      : optsOrPrefix;

  const { prefix, arraysReadonly, preferLinkedAliases } = opts;
  const validations = field.validations ?? [];

  // Literal unions via `in` validation (strings/numbers only)
  const literalValues = validations
    .flatMap((v: unknown) =>
      Array.isArray((v as any).in) ? (v as any).in : []
    )
    .filter(
      (v): v is string | number =>
        typeof v === "string" || typeof v === "number"
    );

  const literalUnion =
    literalValues.length > 0
      ? literalValues
          .map((v) => (typeof v === "string" ? JSON.stringify(v) : String(v)))
          .join(" | ")
      : null;

  const arrayWrap = (inner: string) => {
    if (arraysReadonly) return `ReadonlyArray<${inner}>`;
    const needsParens = /[|&]/.test(inner.trim());
    return needsParens ? `(${inner})[]` : `${inner}[]`;
  };

  const baseType =
    literalUnion ??
    (() => {
      switch (field.type) {
        case "Symbol":
        case "Text":
        case "Slug":
        case "Date":
          return "string";
        case "Integer":
        case "Number":
          return "number";
        case "Boolean":
          return "boolean";
        case "Object":
          return "Record<string, unknown>";
        case "Location":
          return "{ lat: number; lon: number }";
        case "RichText":
          return "Document";

        case "Link": {
          const lt = (field as any).linkType as string | undefined;
          if (lt === "Asset") return "Asset";
          if (lt === "Entry") {
            const allowed = validations
              .flatMap(
                (v: unknown) => ((v as any).linkContentType ?? []) as string[]
              )
              .filter(Boolean);

            // Keep only targets that exist in this generation run
            const present = allowed.filter((id) => allTypeIds.includes(id));

            if (present.length > 0) {
              return present
                .map((id) => {
                  const pas = toPascal(id);
                  const alias = `${prefix}${pas}`; // e.g., IArticle
                  const entry = `Entry<${prefix}${pas}Fields>`;
                  return preferLinkedAliases ? alias : entry;
                })
                .join(" | ");
            }

            // Unknown targets → generic entry
            return "Entry<unknown>";
          }
          return "unknown";
        }

        case "Array": {
          const items: ContentFields | undefined = (field as any).items;
          if (!items) return arrayWrap("unknown");

          const itemId = field.id ? `${field.id}Item` : "item";
          const itemType = fieldToTs(
            {
              ...items,
              id: itemId,
              name: (items as any).name ?? itemId,
            } as ContentFields,
            allTypeIds,
            opts
          ).tsType;

          return arrayWrap(itemType);
        }

        default:
          return "unknown";
      }
    })();

  return {
    name: safeProp(field.id || field.name),
    tsType: baseType,
    required: !!field.required,
  };
}

/**
 * Print concise CLI help text (with program name substitution).
 */
export function printHelp(programName = "contentful-typegen") {
  console.log(CLI_HELP.replace(/contentful-typegen/g, programName));
}

/**
 * Read a CLI flag value in the form `--name value`.
 * Overload preserves string when a default is provided.
 */
export function getArg(name: string): string | undefined;
export function getArg(name: string, def: string): string;
export function getArg(name: string, def?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

/**
 * Build the banner/header placed at the top of the generated .d.ts file.
 */
export function buildFileHeader(count: number): string {
  return `/* ============================================================================
 * 📦 ${count} Contentful content type interface${count === 1 ? "" : "s"} generated by contentful-typegen 🤖
 * 🛑 DO NOT EDIT THIS FILE — it is auto-generated and overwritten on each build.
 * ========================================================================== */
`;
}

/**
 * Create the full .d.ts content:
 *  - banner
 *  - local core stubs (CORE_TYPES)
 *  - one `I<Name>Fields` + `I<Name>` per content type
 *
 * Field comments use Contentful's field `note` only; if no note is present, no comment is emitted.
 */
export function createFile(
  contentTypes: ContentType[],
  options?: RenderOptions
): string {
  const {
    prefix = "I",
    includeUndefinedOnOptional = true,
    arraysReadonly = false,
    preferLinkedAliases = true,
    brandContentTypeId = true,
  } = options ?? {};

  const allIds = contentTypes.map((ct) => ct.sys.id);

  const blocks = contentTypes
    .map((ct) => {
      const ifaceBase = `${prefix}${toPascal(ct.sys.id)}`;

      const fieldLines = ct.fields
        .map((f) => {
          const res = fieldToTs(f, allIds, {
            prefix,
            arraysReadonly,
            preferLinkedAliases,
          });

          // Add note field as comment
          const note = (f as any).note?.trim();
          const doc = note ? `  /** ${note} */\n` : "";

          const maybeUndef =
            !res.required && includeUndefinedOnOptional ? " | undefined" : "";
          return `${doc}  ${res.name}${res.required ? "" : "?"}: ${res.tsType}${maybeUndef};`;
        })
        .join("\n");

      const entryDoc = ct.description ? `/** ${ct.description} */\n` : "";
      const fieldsInterface = `${entryDoc}export interface ${ifaceBase}Fields {\n${fieldLines}\n}\n`;

      const brandedEntry = brandContentTypeId
        ? `export interface ${ifaceBase} extends Entry<${ifaceBase}Fields> {
  sys: Entry<${ifaceBase}Fields>["sys"] & {
    contentType: {
      sys: {
        id: '${ct.sys.id}';
        linkType: 'ContentType';
        type: 'Link';
      };
    };
  };
}\n`
        : `export type ${ifaceBase} = Entry<${ifaceBase}Fields>;\n`;

      return `${fieldsInterface}${brandedEntry}`;
    })
    .join("\n");

  return buildFileHeader(contentTypes.length) + CORE_TYPES + "\n\n" + blocks;
}
