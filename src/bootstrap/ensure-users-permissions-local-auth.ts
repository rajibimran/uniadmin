import type { Core } from "@strapi/strapi";

/**
 * Strapi maps local login to grant key `email`. If an admin disabled it, POST /api/auth/local fails.
 * Staff SPA can use /lab-report-files/staff-login instead, but we still normalize this store for consistency.
 */
export async function ensureUsersPermissionsEmailProviderEnabled(strapi: Core.Strapi) {
  const store = strapi.store({ type: "plugin", name: "users-permissions" });
  const grant = (await store.get({ key: "grant" })) as Record<string, { enabled?: boolean }> | null;
  if (!grant?.email || grant.email.enabled !== false) return;

  await store.set({
    key: "grant",
    value: {
      ...grant,
      email: { ...grant.email, enabled: true },
    },
  });
  strapi.log.info("[users-permissions] Re-enabled grant.email (required for local email/password auth).");
}
