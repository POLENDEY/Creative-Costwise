import sharp, { type Metadata } from "sharp";

const imageFormats = {
  "image/jpeg": {
    format: "jpeg",
    signature: (buffer: Buffer) =>
      buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  },
  "image/png": {
    format: "png",
    signature: (buffer: Buffer) =>
      buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
  },
  "image/webp": {
    format: "webp",
    signature: (buffer: Buffer) =>
      buffer.toString("ascii", 0, 4) === "RIFF" &&
      buffer.toString("ascii", 8, 12) === "WEBP",
  },
} as const;

export async function convertImageUploadToAvif(
  file: File,
  options: { maxInputBytes?: number; maxDimension?: number; quality?: number } = {},
) {
  const maxInputBytes = options.maxInputBytes ?? 2 * 1024 * 1024;
  const maxDimension = options.maxDimension ?? 2048;
  const quality = options.quality ?? 55;

  if (file.size === 0) throw new Error("Choose an image file to upload.");
  if (file.size > maxInputBytes) {
    throw new Error(`The image must be ${Math.floor(maxInputBytes / (1024 * 1024))} MB or smaller.`);
  }

  const expectedFormat = imageFormats[file.type as keyof typeof imageFormats];
  if (!expectedFormat) throw new Error("Use a JPEG, PNG, or WebP image.");

  const input = Buffer.from(await file.arrayBuffer());
  if (!expectedFormat.signature(input)) {
    throw new Error("The selected file does not match its image type.");
  }

  let pipeline = sharp(input, { failOn: "error", limitInputPixels: 40_000_000, animated: false });
  let metadata: Metadata;
  try {
    metadata = await pipeline.metadata();
  } catch (error) {
    throw new Error("The selected file is not a valid supported image.", { cause: error });
  }

  if (metadata.format !== expectedFormat.format) {
    throw new Error("The selected file does not match its image type.");
  }

  pipeline = pipeline.rotate().resize({
    width: maxDimension,
    height: maxDimension,
    fit: "inside",
    withoutEnlargement: true,
  });

  try {
    const output = await pipeline
      .avif({ quality, effort: 4, chromaSubsampling: "4:2:0" })
      .toBuffer();
    return { buffer: output, format: "avif" as const };
  } catch (error) {
    throw new Error("The image could not be converted to AVIF.", { cause: error });
  }
}
