import { del, get, put } from "@vercel/blob";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const BLOB_HOST_SUFFIX = ".blob.vercel-storage.com";

function blobToken(visibility: "public" | "private") {
  if (visibility === "public" && process.env.BLOB_PUBLIC_READ_WRITE_TOKEN) {
    return process.env.BLOB_PUBLIC_READ_WRITE_TOKEN;
  }
  return process.env.BLOB_READ_WRITE_TOKEN;
}

export function blobStorageEnabled() {
  return Boolean(blobToken("private") || blobToken("public"));
}

export function isBlobReference(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(BLOB_HOST_SUFFIX);
  } catch {
    return false;
  }
}

/** Rejects absolute paths and any segment that would leave the chosen folder. */
export function containedPath(root: string, pathname: string) {
  const normalized = pathname.replace(/\\/g, "/");
  if (!normalized || normalized.startsWith("/") || normalized.split("/").some((part) => !part || part === "." || part === "..")) {
    throw new Error("The file could not be saved. Try again.");
  }
  const filePath = path.resolve(root, normalized);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    throw new Error("The file could not be saved. Try again.");
  }
  return filePath;
}

function blobAccess(reference: string): "public" | "private" {
  return new URL(reference).hostname.includes(".public.") ? "public" : "private";
}

async function bytesFromStream(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const next = await reader.read();
    if (next.done) break;
    if (next.value) chunks.push(next.value);
  }
  return Buffer.concat(chunks);
}

/**
 * Saves an image. With a Blob token the return value is the Blob URL.
 * Without one, a public file returns a site path such as `/uploads/…`
 * and a private file returns a path relative to `private-uploads`.
 */
export async function saveImageFile(options: {
  pathname: string;
  body: Buffer;
  visibility: "public" | "private";
}) {
  if (blobStorageEnabled()) {
    try {
      const blob = await put(options.pathname, options.body, {
        access: options.visibility,
        contentType: "image/avif",
        addRandomSuffix: false,
        token: blobToken(options.visibility),
      });
      return blob.url;
    } catch (error) {
      console.error("[uploads] The image could not be stored.", error instanceof Error ? error.name : "Error");
      throw new Error("The file could not be saved. Try again.");
    }
  }

  const root = path.join(process.cwd(), options.visibility === "public" ? "public" : "private-uploads");
  const filePath = containedPath(root, options.pathname);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, options.body, { flag: "wx" });
  const stored = options.pathname.replace(/\\/g, "/");
  return options.visibility === "public" ? `/${stored}` : stored;
}

export async function readPrivateImage(reference: string) {
  if (!reference) return null;
  if (isBlobReference(reference)) {
    try {
      const access = blobAccess(reference);
      const result = await get(reference, { access, token: blobToken(access) });
      if (!result || result.statusCode !== 200 || !result.stream) return null;
      return bytesFromStream(result.stream);
    } catch {
      return null;
    }
  }

  const root = path.join(process.cwd(), "private-uploads");
  let filePath: string;
  try {
    filePath = containedPath(root, reference);
  } catch {
    return null;
  }
  try {
    return await readFile(filePath);
  } catch {
    return null;
  }
}

export async function deleteStoredFile(reference: string) {
  if (!isBlobReference(reference)) return;
  try {
    const access = blobAccess(reference);
    await del(reference, { token: blobToken(access) });
  } catch (error) {
    console.error("[uploads] The stored image could not be removed.", error instanceof Error ? error.name : "Error");
  }
}
