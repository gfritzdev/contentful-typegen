# contentful-typegen

**This library is not affiliated with, endorsed, or sponsored by Contentful. “Contentful” is a trademark of Contentful GmbH.**

🛠️ Generate **TypeScript types** automatically from your [Contentful](https://www.contentful.com/) content models using the Contentful Management API.

> Output is a `contentful.d.ts` file with ergonomic interfaces, branded entries, and precise link narrowing.

---

## ✨ Features

- ⚡ **Zero runtime deps** — outputs plain `.d.ts` declarations, no SDK needed
- 📝 **Strong typing**:
  - Literal unions from validations (`status: "pending" | "done"`)
  - Branded entries with `sys.contentType.sys.id`
  - Linked entries narrowed to target types
- 🎛️ **Customizable ergonomics**:
  - Optional properties with or without `| undefined`
  - `T[]` or `ReadonlyArray<T>`
  - Aliases (`IArticle`) or raw `Entry<IArticleFields>`
- 💬 **Clean comments**:
  - Field `note`s become JSDoc
  - Model description becomes interface JSDoc
- 🖊️ **Prettier integrated** — auto-formats generated file
- 🧰 **CLI + API** — run via `npx` or programmatically

---

## 📦 Installation

```bash
npm install --save-dev contentful-typegen
# or
yarn add -D contentful-typegen
# or
pnpm add -D contentful-typegen
```

---

## 🚀 Quick Start

Generate TypeScript types into `types/contentful.d.ts`:

```bash
npx contentful-typegen \
  --space <SPACE_ID> \
  --env <ENV_ID> \
  --token <CMA_TOKEN>
```

Output example:

```ts
/** Blog Post entry */
export interface IBlogPostFields {
  /** Title */
  title: string;
  /** Body */
  body: Document;
  /** Author */
  author?: IAuthor | undefined;
}

export interface IBlogPost extends Entry<IBlogPostFields> {
  sys: Entry<IBlogPostFields>["sys"] & {
    contentType: {
      sys: {
        id: "blogPost";
        linkType: "ContentType";
        type: "Link";
      };
    };
  };
}
```

---

## ⚙️ CLI Usage

```bash
npx contentful-typegen [options]
```

### Required options

- `--space <id>` — Contentful Space ID (`CF_SPACE_ID` env also supported)
- `--env <id>` — Environment ID (`CF_ENV` env also supported)
- `--token <token>` — CMA access token (`CF_MANAGER_TOKEN` env also supported)

### Optional flags

- `--out <file>` — Output file path (default: `types/contentful.d.ts`)
- `--prefix <I>` — Interface prefix (default: I)

### Rendering toggles

- `--no-undefined-optionals` — do **not** add `| undefined` to optional fields
- `--readonly-arrays` — use `ReadonlyArray<T>` instead of `T[]`
- `--no-aliases` — use `Entry<IThingFields>` instead of `IThing` in link fields
- `--no-brand` — skip branding `sys.contentType.sys.id` (use plain `type` instead)

### Help

```bash
npx contentful-typegen --help
```

---

## 🧩 Programmatic API

Import and run inside a build script:

```ts
import { generateContentfulTypes } from "contentful-typegen";

await generateContentfulTypes({
  spaceId: process.env.CF_SPACE_ID!,
  environmentId: process.env.CF_ENV!,
  managementToken: process.env.CF_MANAGER_TOKEN!,
  outFile: "types/contentful.d.ts",
  prefix: "I",
  renderOptions: {
    includeUndefinedOnOptional: true,
    arraysReadonly: false,
    preferLinkedAliases: true,
    brandContentTypeId: true,
  },
});
```

Returns:

```ts
{
  count: number;
  outFile: string;
}
```

---

## 🔧 Configuration

You can run type checks with your generated file using `tsc`.  
Recommended `tsconfig.json` snippet for libraries:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "outDir": "dist",
    "rootDir": "src",
    "declaration": true,
    "declarationDir": "dist/types",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true,
    "types": ["node"],
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true
  },
  "include": ["src"],
  "exclude": ["dist", "node_modules", "**/__tests__/**"]
}
```

---

## 🛠️ Examples

### Only comment fields with notes

If a Contentful field has a **Note**, it will appear as a JSDoc comment:

```ts
export interface ICommonImageFields {
  desktopImage: Asset;
  /** Shown on mobile devices */
  mobileImage?: Asset | undefined;
}
```

---

### Self-referencing content types

A model that links to itself (e.g., subtasks) is handled cleanly:

```ts
export interface ITaskFields {
  title: string;
  parentTask?: ITask | undefined;
  subtasks?: ITask[] | undefined;
}
```

---

## 🐞 Troubleshooting

- **`Cannot find name 'IUserFields'`**  
  Happens if a link points to a content type not fetched in your space.  
  Fix: ensure the content type exists, or fall back to `Entry<unknown>`.

- **Prettier errors**  
  Formatting is best-effort; if Prettier fails, raw output is written.  
  Add a `.prettierrc` to customize formatting.

- **No output**  
  Ensure your CMA token has access to the space/environment.

---

## 🤝 Contributing

Contributions are welcome!  
Feel free to open an issue or PR:

1. Fork this repo
2. Create a feature branch (`git checkout -b feat/my-feature`)
3. Commit changes (`git commit -m "feat: add my feature"`)
4. Push branch & open PR

---

## 📄 License

MIT © Garrett Fritz

---

## 🔮 Roadmap

- [ ] Support generating **enums** for `in` validations
- [ ] Add option for JSDoc descriptions from Contentful field descriptions
- [ ] Watch mode (`--watch`) for dev workflows
- [ ] ESM + CJS dual output
