import fs from "fs/promises";
import path from "path";
import os from "os";
import type { Core } from "@strapi/strapi";

/**
 * Download an image and register it in Strapi Media Library (local upload provider).
 * Returns the numeric file id for use on media fields.
 */
export async function uploadImageFromUrl(
  strapi: Core.Strapi,
  imageUrl: string,
  originalFilename: string,
  alternativeText?: string
): Promise<number> {
  const res = await fetch(imageUrl);
  if (!res.ok) {
    throw new Error(`[seed] Failed to fetch ${imageUrl}: HTTP ${res.status}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const ext = path.extname(originalFilename).toLowerCase() || ".jpg";
  const safeBase = path.basename(originalFilename, ext).replace(/[^a-zA-Z0-9._-]/g, "_") || "image";
  const filename = safeBase.endsWith(ext) ? safeBase : `${safeBase}${ext}`;
  const tmpPath = path.join(os.tmpdir(), `strapi-seed-${Date.now()}-${filename}`);
  await fs.writeFile(tmpPath, buffer);

  const mime =
    ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : ext === ".gif" ? "image/gif" : "image/jpeg";

  try {
    const uploadSvc = strapi.plugin("upload").service("upload") as {
      upload: (args: {
        data: { fileInfo: Record<string, unknown> };
        files: { filepath: string; originalFilename: string; mimetype: string; size: number };
      }) => Promise<Array<{ id: number }>>;
    };

    const uploaded = await uploadSvc.upload({
      data: {
        fileInfo: {
          name: filename,
          alternativeText: alternativeText ?? safeBase,
        },
      },
      files: {
        filepath: tmpPath,
        originalFilename: filename,
        mimetype: mime,
        size: buffer.length,
      },
    });

    const first = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    if (!first?.id) {
      throw new Error("[seed] Upload service returned no file id");
    }
    return first.id;
  } finally {
    await fs.unlink(tmpPath).catch(() => {});
  }
}
