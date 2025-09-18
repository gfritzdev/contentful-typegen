/**
 * Options governing how TypeScript is rendered from Contentful models.
 */
export type RenderOptions = {
  /**
   * Prefix for generated model names (e.g. "I" → `IArticleFields`, `IArticle`).
   * @default "I"
   */
  prefix?: string;

  /**
   * Include `| undefined` on optional properties (e.g. `title?: string | undefined`).
   * Recommended when consumers enable `exactOptionalPropertyTypes`.
   * @default true
   */
  includeUndefinedOnOptional?: boolean;

  /**
   * Use `ReadonlyArray<T>` (true) or `T[]` (false) for arrays.
   * `contentful-typescript-codegen` emits mutable arrays (`T[]`).
   * @default false
   */
  arraysReadonly?: boolean;

  /**
   * Prefer linked entry aliases (`IThing`) instead of `Entry<IThingFields>` in field types.
   * @default true
   */
  preferLinkedAliases?: boolean;

  /**
   * Brand each `I<Name>` with `sys.contentType.sys.id: '<id>'` to support precise narrowing.
   * @default true
   */
  brandContentTypeId?: boolean;
};
