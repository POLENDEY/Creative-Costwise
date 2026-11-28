import { describe, expect, it } from "vitest";
import { isTechnicalErrorMessage, isTransientDatabaseError, softenDatabaseError, userFacingError } from "./user-facing-error";

const prismaDump = "Invalid `prisma.notification.findMany()` invocation:\n\nRaw query failed. Code: `unknown`. Message: `Kind: Server selection timeout: No available servers. Topology: { Type: ReplicaSetNoPrimary }`";

describe("userFacingError", () => {
  it("hides a database dump behind the screen's own sentence", () => {
    expect(userFacingError(new Error(prismaDump), "Could not save this order.")).toBe("Could not save this order.");
  });

  it("keeps a sentence the app wrote for the person using it", () => {
    expect(userFacingError(new Error("Choose a stage from the board."), "Could not move that order.")).toBe("Choose a stage from the board.");
  });

  it("hides error codes and the generic database sentence", () => {
    expect(userFacingError("CredentialsSignin", "Sign-in could not be completed. Try again in a moment.")).toBe("Sign-in could not be completed. Try again in a moment.");
    expect(userFacingError(new Error("Something went wrong. Please try again."), "Could not save this bundle.")).toBe("Could not save this bundle.");
  });

  it("uses the fallback when there is no message", () => {
    expect(userFacingError(null, "Could not update stock.")).toBe("Could not update stock.");
  });
});

describe("softenDatabaseError", () => {
  it("replaces a timeout with a short sentence and still marks it as temporary", () => {
    const error = new Error("Kind: I/O error: timed out");
    softenDatabaseError(error);
    expect(error.message).toBe("The shop data is taking a moment. Please try again.");
    expect(isTransientDatabaseError(error)).toBe(true);
    expect(isTechnicalErrorMessage(error.message)).toBe(false);
  });

  it("leaves a validation sentence unchanged", () => {
    const error = new Error("Enter a valid amount.");
    softenDatabaseError(error);
    expect(error.message).toBe("Enter a valid amount.");
    expect(isTransientDatabaseError(error)).toBe(false);
  });
});
