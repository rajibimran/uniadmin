import type { Core } from "@strapi/strapi";
import { grantPublicContentApis } from "./bootstrap/public-permissions";
import { ensureLabStaffRole } from "./bootstrap/lab-staff-role";
import { ensureUsersPermissionsEmailProviderEnabled } from "./bootstrap/ensure-users-permissions-local-auth";
import { fixContentManagerSingleTypeMainFields } from "./bootstrap/fix-content-manager-single-type-main-fields";
import { registerFeaturedPostMiddleware } from "./bootstrap/featured-post-middleware";
import { runPhasedContentSeed } from "./bootstrap/phased-content-seed";

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register({ strapi }: { strapi: Core.Strapi }) {
    registerFeaturedPostMiddleware(strapi);
  },

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicContentApis(strapi);
    await ensureUsersPermissionsEmailProviderEnabled(strapi);
    await ensureLabStaffRole(strapi);
    await runPhasedContentSeed(strapi);
    await fixContentManagerSingleTypeMainFields(strapi);
  },
};
