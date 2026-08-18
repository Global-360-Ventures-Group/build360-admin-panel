import { mkdir, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const PUBLIC_PREFIX = "/uploads";

type ImageKind = { mime: string; ext: string };

/**
 * Detect the image type from the file's magic bytes.
 *
 * The browser-supplied Content-Type is attacker-controlled, so the extension
 * we write to disk is always derived from the bytes themselves. SVG is
 * deliberately unsupported — it can carry scripts and would be served from our
 * own origin.
 */
function detectImageKind(bytes: Uint8Array): ImageKind | null {
  const startsWith = (offset: number, ...signature: number[]) =>
    signature.every((byte, i) => bytes[offset + i] === byte);

  const ascii = (offset: number, text: string) =>
    [...text].every((char, i) => bytes[offset + i] === char.charCodeAt(0));

  // JPEG: FF D8 FF
  if (startsWith(0, 0xff, 0xd8, 0xff)) {
    return { mime: "image/jpeg", ext: "jpg" };
  }
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (startsWith(0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) {
    return { mime: "image/png", ext: "png" };
  }
  // GIF: "GIF87a" / "GIF89a"
  if (ascii(0, "GIF8")) {
    return { mime: "image/gif", ext: "gif" };
  }
  // WebP: "RIFF" .... "WEBP"
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) {
    return { mime: "image/webp", ext: "webp" };
  }
  // AVIF: .... "ftyp" "avif" | "avis"
  if (ascii(4, "ftyp") && (ascii(8, "avif") || ascii(8, "avis"))) {
    return { mime: "image/avif", ext: "avif" };
  }

  return null;
}

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Stores an uploaded image under `public/uploads` and returns its public URL.
 *
 * NOTE: this writes to the local filesystem, which works in development and on
 * a long-running Node server. On a read-only/ephemeral host (Vercel, Lambda),
 * swap the write below for an object-storage upload (S3, R2, Cloudinary).
 */
export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return fail("Expected a multipart form upload.", 400);
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return fail("No file was provided.", 400);
  }
  if (file.size === 0) {
    return fail("The file is empty.", 400);
  }
  if (file.size > MAX_BYTES) {
    return fail("Image must be 5 MB or smaller.", 413);
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImageKind(bytes);
  if (!kind) {
    return fail(
      "Unsupported file type. Use JPG, PNG, WebP, AVIF or GIF.",
      415,
    );
  }

  // The name is generated, never taken from the upload — no path traversal,
  // no collisions, no surprising extensions.
  const filename = `${randomUUID()}.${kind.ext}`;

  try {
    await mkdir(UPLOAD_DIR, { recursive: true });
    await writeFile(path.join(UPLOAD_DIR, filename), bytes);
  } catch (error) {
    console.error("[upload] failed to store file", error);
    return fail("Could not store the image. Please try again.", 500);
  }

  return NextResponse.json({
    url: `${PUBLIC_PREFIX}/${filename}`,
    mime: kind.mime,
    size: file.size,
  });
}
