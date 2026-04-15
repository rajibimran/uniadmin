import type { Core } from "@strapi/strapi";
import { grantPublicContentApis } from "./bootstrap/public-permissions";
import { runPhasedContentSeed } from "./bootstrap/phased-content-seed";

export default {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   *
   * This gives you an opportunity to extend code.
   */
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   *
   * This gives you an opportunity to set up your data model,
   * run jobs, or perform some special logic.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await grantPublicContentApis(strapi);
    await runPhasedContentSeed(strapi);
  },
};
