import { vi } from "vitest";

// Keep formatting deterministic for snapshots
vi.mock("prettier", () => {
  return {
    default: {
      format: (code: string) =>
        code
          .replace(/\r\n/g, "\n")
          .replace(/[ \t]+\n/g, "\n")
          .replace(/\n{3,}/g, "\n\n")
          .trim() + "\n",
      resolveConfig: async () => null,
    },
  };
});
