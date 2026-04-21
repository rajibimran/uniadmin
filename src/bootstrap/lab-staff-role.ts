import type { Core } from "@strapi/strapi";

/** Users-permissions role `type` — assign in Admin → Users (end users), not admin users. */
export const LAB_STAFF_ROLE_TYPE = "lab-staff";

const LAB_STAFF_PERMISSIONS = [
  "plugin::users-permissions.user.me",
  "api::lab-report-file.lab-report-file.upload",
] as const;

async function grantPermissionIfMissing(strapi: Core.Strapi, roleId: number, action: string) {
  const existing = await strapi.db.query("plugin::users-permissions.permission").findOne({
    where: { action, role: roleId },
  });
  if (existing) return;
  await strapi.db.query("plugin::users-permissions.permission").create({
    data: { action, role: roleId },
  });
}

/**
 * Ensures a **Lab staff** role exists and can call `/api/users/me` and POST `/api/lab-report-files/upload`.
 * Create accounts in **Strapi Admin → Plugins → Users & Permissions → Users** and assign this role.
 */
export async function ensureLabStaffRole(strapi: Core.Strapi) {
  let role = await strapi.db.query("plugin::users-permissions.role").findOne({
    where: { type: LAB_STAFF_ROLE_TYPE },
  });

  if (!role) {
    role = await strapi.db.query("plugin::users-permissions.role").create({
      data: {
        name: "Lab staff",
        type: LAB_STAFF_ROLE_TYPE,
        description: "Upload lab PDFs for the website Report Check portal (/staff/lab-reports).",
      },
    });
    strapi.log.info(
      `[lab-staff] Created role "${LAB_STAFF_ROLE_TYPE}". Add users in Admin → Users (application users) and assign role "Lab staff".`,
    );
  }

  const roleId = (role as { id: number }).id;
  for (const action of LAB_STAFF_PERMISSIONS) {
    try {
      await grantPermissionIfMissing(strapi, roleId, action);
    } catch (e) {
      strapi.log.warn(
        `[lab-staff] Could not grant "${action}" (restart Strapi after new routes?): ${String(e)}`,
      );
    }
  }
}
