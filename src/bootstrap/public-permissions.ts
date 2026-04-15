import type { Core } from "@strapi/strapi";

async function grantPublicPermission(strapi: Core.Strapi, action: string) {
  const publicRole = await strapi.db.query("plugin::users-permissions.role").findOne({
    where: { type: "public" },
  });
  if (!publicRole) return;

  const existing = await strapi.db.query("plugin::users-permissions.permission").findOne({
    where: { action, role: publicRole.id },
  });
  if (existing) return;

  await strapi.db.query("plugin::users-permissions.permission").create({
    data: { action, role: publicRole.id },
  });
}

/** Collection-type UIDs: Public needs find + findOne for anonymous REST reads. */
const COLLECTION_API_UIDS = [
  "api::navigation.navigation",
  "api::news-post.news-post",
  "api::article.article",
  "api::country-guideline.country-guideline",
  "api::gcc-country.gcc-country",
  "api::equipment-item.equipment-item",
  "api::fitness-criterion.fitness-criterion",
  "api::stat.stat",
  "api::testimonial.testimonial",
  "api::service-package.service-package",
  "api::faq.faq",
  "api::certification.certification",
  "api::footer-quick-link.footer-quick-link",
  "api::footer-service-link.footer-service-link",
  "api::gallery-image.gallery-image",
  "api::hero.hero",
  "api::service.service",
] as const;

/** Single types: controller exposes find only. */
const SINGLE_API_UIDS = [
  "api::site-config.site-config",
  "api::about-page.about-page",
  "api::services-page.services-page",
  "api::booking-page.booking-page",
  "api::report-page.report-page",
  "api::screening-process-page.screening-process-page",
  "api::privacy-page.privacy-page",
] as const;

export async function grantPublicContentApis(strapi: Core.Strapi) {
  for (const uid of SINGLE_API_UIDS) {
    await grantPublicPermission(strapi, `${uid}.find`);
  }
  for (const uid of COLLECTION_API_UIDS) {
    await grantPublicPermission(strapi, `${uid}.find`);
    await grantPublicPermission(strapi, `${uid}.findOne`);
  }
}
