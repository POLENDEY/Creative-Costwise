import { describe, expect, it } from "vitest";
import { parseGoogleSheetsUrl } from "./resources";

describe("parseGoogleSheetsUrl", () => {
  it("accepts an https Google Sheets link", () => {
    expect(parseGoogleSheetsUrl("https://docs.google.com/spreadsheets/d/abc123/edit")).toBe(
      "https://docs.google.com/spreadsheets/d/abc123/edit",
    );
  });

  it("allows a blank value so a saved link can be cleared", () => {
    expect(parseGoogleSheetsUrl("  ")).toBe("");
  });

  it("rejects a link that is not a Google spreadsheet", () => {
    expect(() => parseGoogleSheetsUrl("https://example.com/sheet")).toThrow(/google sheets/i);
  });
});
