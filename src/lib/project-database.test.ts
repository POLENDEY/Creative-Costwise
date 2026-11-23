import { describe, expect, it } from "vitest";
import { assertProjectDatabase, databaseNameFromUrl } from "./project-database";

const projectUrl = "mongodb+srv://user:secret@polen.example.mongodb.net/creative_costwise?retryWrites=true&w=majority";

describe("project database guard", () => {
  it("reads the database name from the connection string", () => {
    expect(databaseNameFromUrl(projectUrl)).toBe("creative_costwise");
  });

  it("allows only the creative_costwise database", () => {
    expect(assertProjectDatabase(projectUrl)).toBe("creative_costwise");
  });

  it("refuses the other databases already on the cluster", () => {
    for (const name of ["depth_dot", "sample_mflix", "admin", "local"]) {
      const url = projectUrl.replace("creative_costwise", name);
      expect(() => assertProjectDatabase(url)).toThrow(/Refusing to connect/);
    }
  });
});
