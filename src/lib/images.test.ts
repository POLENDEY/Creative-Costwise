import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { convertImageUploadToAvif } from "./images";

describe("convertImageUploadToAvif", () => {
  it("converts an uploaded PNG to AVIF and keeps its dimensions", async () => {
    const png = await sharp({
      create: {
        width: 40,
        height: 24,
        channels: 4,
        background: { r: 190, g: 24, b: 93, alpha: 0.8 },
      },
    }).png().toBuffer();
    const file = new File([new Uint8Array(png)], "logo.png", { type: "image/png" });

    const converted = await convertImageUploadToAvif(file);
    const metadata = await sharp(converted.buffer).metadata();

    expect(converted.format).toBe("avif");
    expect(metadata.format).toBe("heif");
    expect(metadata.width).toBe(40);
    expect(metadata.height).toBe(24);
  });

  it("rejects content whose signature does not match the declared image type", async () => {
    const file = new File([new Uint8Array([0, 1, 2, 3])], "logo.png", {
      type: "image/png",
    });

    await expect(convertImageUploadToAvif(file)).rejects.toThrow(
      "The selected file does not match its image type.",
    );
  });

  it("rejects images exceeding the input size limit", async () => {
    const file = new File([new Uint8Array(1024 * 1024 + 1)], "logo.png", {
      type: "image/png",
    });

    await expect(convertImageUploadToAvif(file, { maxInputBytes: 1024 * 1024 })).rejects.toThrow(
      "The image must be 1 MB or smaller.",
    );
  });
});
