import fs from "node:fs";
import { factories } from "@strapi/strapi";
import { LAB_STAFF_ROLE_TYPE } from "../../../bootstrap/lab-staff-role";
import {
  absolutePathForStoredFile,
  ensureLabReportStorageDir,
  fileStartsWithPdfMagic,
  makeStoredPdfFileName,
  normalizePassportNumber,
  normalizePhoneDigits,
  removeStoredPdf,
} from "../../../utils/lab-report-storage";

const UID = "api::lab-report-file.lab-report-file" as const;

type KoaUploaded = { filepath?: string; name?: string; type?: string; size?: number };

function getUploadedFile(ctx: any): KoaUploaded | undefined {
  const raw = ctx.request?.files?.files;
  if (Array.isArray(raw)) return raw[0] as KoaUploaded;
  return raw as KoaUploaded | undefined;
}

async function assertLabStaffUploader(ctx: any, strapi: any): Promise<boolean> {
  const stateId = ctx.state?.user?.id;
  if (stateId == null) {
    ctx.status = 401;
    ctx.body = { error: "Authentication required" };
    return false;
  }
  const user = await strapi.db.query("plugin::users-permissions.user").findOne({
    where: { id: stateId },
    populate: { role: true },
  });
  const u = user as { role?: { type?: string } | number } | null;
  let roleType = typeof u?.role === "object" && u.role !== null ? u.role.type : undefined;
  if (!roleType && typeof u?.role === "number") {
    const roleRow = await strapi.db.query("plugin::users-permissions.role").findOne({ where: { id: u.role } });
    roleType = (roleRow as { type?: string } | null)?.type;
  }
  if (roleType !== LAB_STAFF_ROLE_TYPE) {
    ctx.status = 403;
    ctx.body = { error: "Lab staff role required for uploads" };
    return false;
  }
  return true;
}

export default factories.createCoreController(UID as any, ({ strapi }) => ({
  /**
   * POST /api/lab-report-files/download
   * JSON body: { passportNumber, phoneNumber }
   * Returns PDF stream on match; 404 JSON on failure (generic client message).
   */
  async download(ctx: any) {
    try {
      const body = ctx.request.body as Record<string, unknown>;
      const passportNumber = normalizePassportNumber(String(body?.passportNumber ?? ""));
      const phoneDigits = normalizePhoneDigits(String(body?.phoneNumber ?? ""));

      if (passportNumber.length < 4 || passportNumber.length > 64) {
        ctx.status = 404;
        ctx.body = { error: "not_found" };
        return;
      }
      if (phoneDigits.length < 10) {
        ctx.status = 404;
        ctx.body = { error: "not_found" };
        return;
      }

      const rows = await strapi.db.query(UID).findMany({
        where: { passportNumber, phoneDigits },
        limit: 1,
      });
      const row = rows[0] as
        | { storedFileName?: string; originalFileName?: string; mimeType?: string }
        | undefined;
      if (!row?.storedFileName) {
        ctx.status = 404;
        ctx.body = { error: "not_found" };
        return;
      }

      const abs = absolutePathForStoredFile(row.storedFileName);
      if (!fs.existsSync(abs)) {
        strapi.log.warn(`[lab-report-file] Missing file on disk: ${row.storedFileName}`);
        ctx.status = 404;
        ctx.body = { error: "not_found" };
        return;
      }

      const safeBase = (row.originalFileName || "report.pdf").replace(/[^\w.\-]+/g, "_").slice(0, 120);
      const filename = safeBase.toLowerCase().endsWith(".pdf") ? safeBase : `${safeBase}.pdf`;

      ctx.set("Content-Type", row.mimeType || "application/pdf");
      ctx.set("Content-Disposition", `attachment; filename="${filename}"`);
      ctx.body = fs.createReadStream(abs);
    } catch (e) {
      strapi.log.error("[lab-report-file.download]", e);
      ctx.status = 500;
      ctx.body = { error: "server_error" };
    }
  },

  /**
   * POST /api/lab-report-files/upload (multipart)
   * Field `files` (Strapi body parser) + passportNumber + phoneNumber.
   * Header: Authorization: Bearer <JWT> for a Users & Permissions user with role type `lab-staff`.
   * Replaces any existing row for the same passport + phone.
   */
  async upload(ctx: any) {
    if (!(await assertLabStaffUploader(ctx, strapi))) return;

    try {
      const body = ctx.request.body as Record<string, unknown>;
      const passportNumber = normalizePassportNumber(String(body?.passportNumber ?? ""));
      const phoneDigits = normalizePhoneDigits(String(body?.phoneNumber ?? ""));

      if (passportNumber.length < 4 || passportNumber.length > 64) {
        ctx.status = 400;
        ctx.body = { error: "Invalid passport number" };
        return;
      }
      if (phoneDigits.length < 10) {
        ctx.status = 400;
        ctx.body = { error: "Invalid phone number (need at least 10 digits)" };
        return;
      }

      const file = getUploadedFile(ctx);
      if (!file?.filepath) {
        ctx.status = 400;
        ctx.body = { error: "Missing file field `files` (PDF)" };
        return;
      }

      const okMagic = await fileStartsWithPdfMagic(file.filepath);
      if (!okMagic) {
        ctx.status = 400;
        ctx.body = { error: "File must be a PDF" };
        return;
      }

      const origName = String(file.name || "report.pdf").slice(0, 255);
      const storedFileName = makeStoredPdfFileName();
      await ensureLabReportStorageDir();
      const dest = absolutePathForStoredFile(storedFileName);

      await fs.promises.copyFile(file.filepath, dest);
      let size = 0;
      try {
        size = (await fs.promises.stat(dest)).size;
      } catch {
        /* ignore */
      }

      const existing = await strapi.db.query(UID).findMany({
        where: { passportNumber, phoneDigits },
        limit: 5,
      });
      for (const ex of existing as Array<{ id?: number; storedFileName?: string }>) {
        if (ex.storedFileName) await removeStoredPdf(ex.storedFileName);
        if (ex.id != null) {
          await strapi.db.query(UID).delete({ where: { id: ex.id } });
        }
      }

      await strapi.db.query(UID).create({
        data: {
          passportNumber,
          phoneDigits,
          originalFileName: origName,
          storedFileName,
          mimeType: "application/pdf",
          fileSize: size || file.size || 0,
        },
      });

      ctx.status = 200;
      ctx.body = { ok: true, passportNumber, phoneDigits };
    } catch (e) {
      strapi.log.error("[lab-report-file.upload]", e);
      ctx.status = 500;
      ctx.body = { error: "Upload failed" };
    }
  },

  /**
   * POST /api/lab-report-files/staff-login
   * Same as Users & Permissions /auth/local but with case-insensitive username/email match
   * and without depending on the "Email" grant toggle (still validates password, blocked, confirmed).
   */
  async staffLogin(ctx: any) {
    const USER_UID = "plugin::users-permissions.user" as const;
    try {
      const body = ctx.request.body as Record<string, unknown>;
      const identifier = String(body.identifier ?? "").trim();
      const password = String(body.password ?? "");
      if (!identifier || !password) {
        ctx.status = 400;
        ctx.body = { error: { message: "identifier and password required" } };
        return;
      }

      const idLower = identifier.toLowerCase();
      const variants = Array.from(
        new Set([
          identifier,
          idLower,
          identifier ? identifier.charAt(0).toUpperCase() + identifier.slice(1).toLowerCase() : "",
          identifier.toUpperCase(),
        ]),
      ).filter(Boolean);

      let user =
        (await strapi.db.query(USER_UID).findOne({
          where: { provider: "local", email: idLower },
        })) ?? null;

      if (!user) {
        for (const v of variants) {
          user =
            (await strapi.db.query(USER_UID).findOne({
              where: { provider: "local", username: v },
            })) ?? null;
          if (user) break;
        }
      }

      if (!user) {
        try {
          const meta = strapi.db.metadata.get(USER_UID);
          const tbl = meta.tableName;
          const row = await strapi.db
            .connection(tbl)
            .select("id")
            .where("provider", "local")
            .where(function (this: any) {
              this.whereRaw("LOWER(COALESCE(email, '')) = ?", [idLower]).orWhereRaw(
                "LOWER(COALESCE(username, '')) = ?",
                [idLower],
              );
            })
            .first();
          if (row?.id != null) {
            user = await strapi.db.query(USER_UID).findOne({ where: { id: row.id } });
          }
        } catch (e) {
          strapi.log.warn("[lab-report-file.staffLogin] case-insensitive SQL fallback failed", e);
        }
      }

      if (!user) {
        ctx.status = 400;
        ctx.body = { error: { message: "Invalid identifier or password" } };
        return;
      }

      const u = user as { password?: string; confirmed?: boolean; blocked?: boolean; id: number };
      if (!u.password) {
        ctx.status = 400;
        ctx.body = { error: { message: "Invalid identifier or password" } };
        return;
      }

      const valid = await strapi.plugin("users-permissions").service("user").validatePassword(password, u.password);
      if (!valid) {
        ctx.status = 400;
        ctx.body = { error: { message: "Invalid identifier or password" } };
        return;
      }

      const store = strapi.store({ type: "plugin", name: "users-permissions" });
      const advancedSettings = (await store.get({ key: "advanced" })) as { email_confirmation?: boolean } | null;
      if (advancedSettings?.email_confirmation && u.confirmed !== true) {
        ctx.status = 400;
        ctx.body = { error: { message: "Your account email is not confirmed" } };
        return;
      }
      if (u.blocked === true) {
        ctx.status = 400;
        ctx.body = { error: { message: "Your account has been blocked by an administrator" } };
        return;
      }

      const jwt = strapi.plugin("users-permissions").service("jwt").issue({ id: u.id });
      ctx.status = 200;
      ctx.body = { jwt };
    } catch (e) {
      strapi.log.error("[lab-report-file.staffLogin]", e);
      ctx.status = 500;
      ctx.body = { error: { message: "Login failed" } };
    }
  },
}));
