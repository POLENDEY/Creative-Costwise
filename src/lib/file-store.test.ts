import { describe, expect, it } from "vitest";
import { containedPath, isBlobReference } from "./file-store";

describe("stored image references", () => {
  it("accepts a Vercel Blob URL and rejects other addresses", () => {
    expect(isBlobReference("https://abc.private.blob.vercel-storage.com/plan-payments/a/b.avif")).toBe(true);
    expect(isBlobReference("https://example.com/plan-payments/a/b.avif")).toBe(false);
    expect(isBlobReference("/uploads/shop/logo.avif")).toBe(false);
    expect(isBlobReference("plan-payments/shop/proof.avif")).toBe(false);
  });

  it("keeps a stored file inside its folder", () => {
    const root = "C:\\uploads";
    expect(containedPath(root, "plan-payments/shop/proof.avif")).toMatch(/plan-payments[\\/]shop[\\/]proof\.avif$/);
    expect(() => containedPath(root, "../secret.txt")).toThrow(/could not be saved/i);
    expect(() => containedPath(root, "/etc/passwd")).toThrow(/could not be saved/i);
  });
});
