import { describe, it, expect, vi } from "vitest";
import type { ContentFields, ContentType } from "contentful-management";
import {
  toPascal,
  safeProp,
  fieldToTs,
  buildFileHeader,
  createFile,
  getArg,
  printHelp,
} from "../src/helpers";

const F = (f: Partial<ContentFields>) => f as ContentFields;

describe("helpers: primitives & small utilities", () => {
  it("toPascal normalizes and capitalizes words", () => {
    expect(toPascal("hello world")).toBe("HelloWorld");
    // underscores are preserved by design
    expect(toPascal("  foo-bar_baz  ")).toBe("FooBar_baz");
    expect(toPascal("123cats")).toBe("123cats");
  });

  it("safeProp emits valid identifiers and prefixes when needed", () => {
    expect(safeProp("title")).toBe("title");
    expect(safeProp("123 bad! id")).toBe("_123_bad__id");
    expect(safeProp(undefined)).toBe("field");
    // empty string → fallback to "field"
    expect(safeProp("")).toBe("field");
  });

  it("buildFileHeader pluralizes based on count", () => {
    expect(buildFileHeader(1)).toContain("interface generated");
    expect(buildFileHeader(2)).toContain("interfaces generated");
  });

  it("getArg reads CLI flags, respects defaults, and guards missing values", () => {
    const original = process.argv.slice();
    try {
      process.argv.push("--space", "abc123", "--novalue"); // --novalue has no value after it
      expect(getArg("space")).toBe("abc123");
      expect(getArg("missing", "fallback")).toBe("fallback");
      // present but missing value → undefined (or default if provided)
      expect(getArg("novalue")).toBeUndefined();
      expect(getArg("novalue", "defaulted")).toBe("defaulted");
    } finally {
      process.argv = original;
    }
  });

  it("printHelp substitutes the provided program name", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      printHelp("my-bin");
      const msg = (spy.mock.calls[0]?.[0] ?? "") as string;
      expect(msg).toContain("my-bin");
    } finally {
      spy.mockRestore();
    }
  });
});

describe("fieldToTs: mapping coverage", () => {
  const allIds = ["known", "task"];

  it("handles validations entries without linkContentType (flatMap + ?? [] path)", () => {
    const allIds = ["known"];
    const res = fieldToTs(
      // Link → Entry with mixed validations objects, only one has linkContentType
      F({
        id: "mixed",
        type: "Link",
        linkType: "Entry",
        validations: [
          {}, // no linkContentType
          { foo: 1 } as any, // still no linkContentType
          { linkContentType: ["known"] }, // only this one contributes
        ],
      } as any),
      allIds,
      { prefix: "I", arraysReadonly: false, preferLinkedAliases: true }
    );
    expect(res.tsType).toBe("IKnown"); // narrows to the present target only
  });

  it("maps primitives, structured types, and literal unions (string + number)", () => {
    // string literal union
    expect(
      fieldToTs(
        F({ id: "status", type: "Symbol", validations: [{ in: ["a", "b"] }] }),
        allIds,
        "I"
      ).tsType
    ).toBe('"a" | "b"');

    // number literal union
    expect(
      fieldToTs(
        F({ id: "rank", type: "Integer", validations: [{ in: [1, 2, 3] }] }),
        allIds,
        "I"
      ).tsType
    ).toBe("1 | 2 | 3");

    expect(fieldToTs(F({ id: "t", type: "Text" }), allIds, "I").tsType).toBe(
      "string"
    );
    expect(fieldToTs(F({ id: "s", type: "Slug" }), allIds, "I").tsType).toBe(
      "string"
    );
    expect(fieldToTs(F({ id: "d", type: "Date" }), allIds, "I").tsType).toBe(
      "string"
    );
    expect(fieldToTs(F({ id: "i", type: "Integer" }), allIds, "I").tsType).toBe(
      "number"
    );
    expect(fieldToTs(F({ id: "n", type: "Number" }), allIds, "I").tsType).toBe(
      "number"
    );
    expect(fieldToTs(F({ id: "b", type: "Boolean" }), allIds, "I").tsType).toBe(
      "boolean"
    );
    expect(fieldToTs(F({ id: "o", type: "Object" }), allIds, "I").tsType).toBe(
      "Record<string, unknown>"
    );
    expect(
      fieldToTs(F({ id: "loc", type: "Location" }), allIds, "I").tsType
    ).toBe("{ lat: number; lon: number }");
    expect(
      fieldToTs(F({ id: "rt", type: "RichText" }), allIds, "I").tsType
    ).toBe("Document");
  });

  it("maps Link fields: Asset, narrowed Entry (single & multi), unknown Entry, and unknown linkType", () => {
    // Asset
    expect(
      fieldToTs(
        F({ id: "a", type: "Link", linkType: "Asset" } as any),
        allIds,
        "I"
      ).tsType
    ).toBe("Asset");

    // Entry narrowed with one present + one missing → only present retained (alias)
    expect(
      fieldToTs(
        F({
          id: "mix",
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["known", "missing"] }],
        } as any),
        allIds,
        { prefix: "I", arraysReadonly: false, preferLinkedAliases: true }
      ).tsType
    ).toBe("IKnown");

    // Entry narrowed with multiple present → union of aliases
    expect(
      fieldToTs(
        F({
          id: "multi",
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["known", "task"] }],
        } as any),
        allIds,
        { prefix: "I", arraysReadonly: false, preferLinkedAliases: true }
      ).tsType
    ).toBe("IKnown | ITask");

    // Same multi-present case but prefer Entry<IFields>
    expect(
      fieldToTs(
        F({
          id: "multiEntry",
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["known", "task"] }],
        } as any),
        allIds,
        { prefix: "I", arraysReadonly: false, preferLinkedAliases: false }
      ).tsType
    ).toBe("Entry<IKnownFields> | Entry<ITaskFields>");

    // Unknown targets → Entry<unknown>
    expect(
      fieldToTs(
        F({
          id: "u",
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["missing"] }],
        } as any),
        allIds,
        "I"
      ).tsType
    ).toBe("Entry<unknown>");

    // Unrecognized link type (still inside Link case) → "unknown"
    expect(
      fieldToTs(
        F({ id: "x", type: "Link", linkType: "SomethingElse" } as any),
        allIds,
        "I"
      ).tsType
    ).toBe("unknown");
  });

  it("maps Array fields: missing items, union items, ReadonlyArray, and 'item' fallback id", () => {
    // No items → unknown[]
    expect(
      fieldToTs(F({ id: "arr1", type: "Array" } as any), allIds, "I").tsType
    ).toBe("unknown[]");

    // Items with a union → parentheses when mutable array
    const unionItem = F({
      id: "choice",
      type: "Symbol",
      validations: [{ in: ["x", "y"] }],
    } as any);

    const mutable = fieldToTs(
      // Outer field with an id → exercises the `${id}Item` naming path internally
      F({ id: "choices", type: "Array", items: unionItem } as any),
      allIds,
      { prefix: "I", arraysReadonly: false, preferLinkedAliases: true }
    ).tsType;
    expect(mutable).toBe('("x" | "y")[]');

    const readonly = fieldToTs(
      F({ id: "choices", type: "Array", items: unionItem } as any),
      allIds,
      { prefix: "I", arraysReadonly: true, preferLinkedAliases: true }
    ).tsType;
    expect(readonly).toBe('ReadonlyArray<"x" | "y">');

    // ⬇️ Outer field WITHOUT an id → exercises the "item" fallback path
    const mutableNoId = fieldToTs(
      F({ /* no id */ type: "Array", items: unionItem } as any),
      allIds,
      { prefix: "I", arraysReadonly: false, preferLinkedAliases: true }
    ).tsType;
    expect(mutableNoId).toBe('("x" | "y")[]');
  });

  it("returns 'unknown' for unrecognized field.type (default branch)", () => {
    const res = fieldToTs(
      F({ id: "mystery", type: "TotallyUnknownType" } as any),
      allIds,
      "I"
    );
    expect(res.tsType).toBe("unknown");
    expect(res.name).toBe("mystery");
  });
});

describe("createFile: notes and optionality toggle", () => {
  const ct: ContentType = {
    sys: { id: "noteDemo", type: "ContentType" } as any,
    name: "Note Demo",
    description: "",
    fields: [
      {
        id: "requiredTitle",
        name: "Required Title",
        type: "Symbol",
        required: true,
      } as any,
      {
        id: "optionalNote",
        name: "Optional Note",
        type: "Symbol",
        note: "Nice note!",
      } as any,
      {
        id: "blankNote",
        name: "Blank Note",
        type: "Symbol",
        note: "   ",
      } as any, // whitespace-only note
    ],
  } as any;

  it("createFile uses default rendering options when 'options' is omitted", () => {
    const ct: ContentType = {
      sys: { id: "article", type: "ContentType" } as any,
      name: "Article",
      description: "With defaults applied",
      fields: [
        { id: "title", name: "Title", type: "Symbol", required: true } as any,
        { id: "status", name: "Status", type: "Symbol" } as any, // optional
      ],
    } as any;

    const out = createFile([ct]);
    expect(out).toMatch(/status\?\s*:\s*string\s*\|\s*undefined;/);
    expect(out).toContain(
      "export interface IArticle extends Entry<IArticleFields>"
    );
    expect(out).toContain("id: 'article';");
  });

  it("emits field notes and can include/exclude '| undefined' on optionals; blank notes are omitted", () => {
    const withUndef = createFile([ct], {
      includeUndefinedOnOptional: true,
      brandContentTypeId: false,
    });
    expect(withUndef).toContain("/** Nice note! */");
    // whitespace-only note should not render a comment
    expect(withUndef).not.toMatch(/\/\*\*\s*\*\/\s*\n\s*blankNote/);
    expect(withUndef).toMatch(/optionalNote\?\s*:\s*string\s*\|\s*undefined;/);

    const withoutUndef = createFile([ct], {
      includeUndefinedOnOptional: false,
      brandContentTypeId: false,
    });
    expect(withoutUndef).toContain("/** Nice note! */");
    // still omit blankNote comment
    expect(withoutUndef).not.toMatch(/\/\*\*\s*\*\/\s*\n\s*blankNote/);
    expect(withoutUndef).toMatch(/optionalNote\?\s*:\s*string\s*;/);
  });
});

describe("createFile: field mapping options (alias vs entry; arraysReadonly flip; entry docs)", () => {
  const KNOWN_CT: ContentType = {
    sys: { id: "known", type: "ContentType" } as any,
    name: "Known",
    description: "Model used as a link target",
    fields: [
      { id: "title", name: "Title", type: "Symbol", required: true } as any,
    ],
  } as any;

  const CONSUMER_CT_LINK: ContentType = {
    sys: { id: "consumer", type: "ContentType" } as any,
    name: "Consumer",
    description: "Links to Known",
    fields: [
      {
        id: "ref",
        name: "Ref",
        type: "Link",
        linkType: "Entry",
        validations: [{ linkContentType: ["known"] }],
      } as any,
      {
        id: "noNote",
        name: "No Note",
        type: "Symbol",
      } as any,
    ],
  } as any;

  const CONSUMER_CT_ARRAY: ContentType = {
    sys: { id: "consumerArr", type: "ContentType" } as any,
    name: "ConsumerArr",
    description: "",
    fields: [
      {
        id: "refs",
        name: "Refs",
        type: "Array",
        items: {
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["known"] }],
        },
      } as any,
    ],
  } as any;

  it("preferLinkedAliases=true emits alias; false emits Entry<IFields>", () => {
    const withAlias = createFile([KNOWN_CT, CONSUMER_CT_LINK], {
      prefix: "I",
      arraysReadonly: false,
      preferLinkedAliases: true,
      includeUndefinedOnOptional: true,
      brandContentTypeId: false,
    });
    // Entry doc comment from description
    expect(withAlias).toContain("/** Links to Known */");
    // Field without note must not emit a /** */ line
    expect(withAlias).not.toMatch(/\/\*\*.*No Note.*\*\//);
    // Alias used
    expect(withAlias).toMatch(/ref\?\s*:\s*IKnown\s*\|\s*undefined;/);

    const withoutAlias = createFile([KNOWN_CT, CONSUMER_CT_LINK], {
      prefix: "I",
      arraysReadonly: false,
      preferLinkedAliases: false,
      includeUndefinedOnOptional: true,
      brandContentTypeId: false,
    });
    expect(withoutAlias).toMatch(
      /ref\?\s*:\s*Entry<IKnownFields>\s*\|\s*undefined;/
    );
  });

  it("arraysReadonly flips array container shape for linked entries", () => {
    const mutable = createFile([KNOWN_CT, CONSUMER_CT_ARRAY], {
      prefix: "I",
      arraysReadonly: false,
      preferLinkedAliases: true,
      includeUndefinedOnOptional: true,
      brandContentTypeId: false,
    });
    expect(mutable).toMatch(/refs\?\s*:\s*IKnown\[\]\s*\|\s*undefined;/);

    const readonly = createFile([KNOWN_CT, CONSUMER_CT_ARRAY], {
      prefix: "I",
      arraysReadonly: true,
      preferLinkedAliases: true,
      includeUndefinedOnOptional: true,
      brandContentTypeId: false,
    });
    expect(readonly).toMatch(
      /refs\?\s*:\s*ReadonlyArray<IKnown>\s*\|\s*undefined;/
    );
  });
});
