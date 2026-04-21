import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DIR_SEGMENTS = ["private", "lab-reports"] as const;

export function getLabReportStorageDir(): string {
  return path.join(process.cwd(), ...DIR_SEGMENTS);
}

export async function ensureLabReportStorageDir(): Promise<string> {
  const dir = getLabReportStorageDir();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export function makeStoredPdfFileName(): string {
  return `${randomUUID()}.pdf`;
}

export function absolutePathForStoredFile(storedFileName: string): string {
  return path.join(getLabReportStorageDir(), path.basename(storedFileName));
}

export async function removeStoredPdf(storedFileName: string | undefined | null): Promise<void> {
  if (!storedFileName) return;
  const fp = absolutePathForStoredFile(storedFileName);
  try {
    await fs.unlink(fp);
  } catch {
    /* ignore */
  }
}

export function normalizePassportNumber(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .slice(0, 64);
}

/** Digits only, max 20 (handles local formats). */
export function normalizePhoneDigits(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 20);
}

export async function fileStartsWithPdfMagic(filePath: string): Promise<boolean> {
  const fh = await fs.open(filePath, "r");
  try {
    const buf = Buffer.alloc(5);
    const { bytesRead } = await fh.read(buf, 0, 5, 0);
    return bytesRead >= 4 && buf.subarray(0, 4).toString("ascii") === "%PDF";
  } finally {
    await fh.close();
  }
}
