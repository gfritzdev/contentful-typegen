// Centralized static model data (fixtures) for tests

// Basic: Article + Person (used by happy path)
export const BASIC_MODELS = {
  items: [
    {
      sys: { id: "article", type: "ContentType" },
      name: "Article",
      description: "An article model with unions and links",
      fields: [
        { id: "title", name: "Title", type: "Symbol", required: true },
        {
          id: "status",
          name: "Status",
          type: "Symbol",
          validations: [{ in: ["draft", "published"] }],
        },
        {
          id: "heroImage",
          name: "Hero Image",
          type: "Link",
          linkType: "Asset",
        },
        {
          id: "author",
          name: "Author",
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["person"] }],
        },
        {
          id: "related",
          name: "Related",
          type: "Array",
          items: {
            type: "Link",
            linkType: "Entry",
            validations: [{ linkContentType: ["article"] }],
          },
        },
      ],
    },
    {
      sys: { id: "person", type: "ContentType" },
      name: "Person",
      description: "Author",
      fields: [
        { id: "name", name: "Name", type: "Symbol", required: true },
        {
          id: "role",
          name: "Role",
          type: "Symbol",
          validations: [{ in: ["Staff", "Contributor", "Guest"] }],
        },
      ],
    },
  ],
} as const;

// Toggles: same models as basic, but we flip render options in the test
export const TOGGLES_MODELS = BASIC_MODELS;

// Self-referencing: Task with parent/children links to itself
export const SELFREF_MODELS = {
  items: [
    {
      sys: { id: "task", type: "ContentType" },
      name: "Task",
      description: "A task with parent/children links to itself",
      fields: [
        { id: "title", name: "Title", type: "Symbol", required: true },
        {
          id: "parent",
          name: "Parent",
          type: "Link",
          linkType: "Entry",
          validations: [{ linkContentType: ["task"] }],
        },
        {
          id: "children",
          name: "Children",
          type: "Array",
          items: {
            type: "Link",
            linkType: "Entry",
            validations: [{ linkContentType: ["task"] }],
          },
        },
      ],
    },
  ],
} as const;
