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
  "api::post-category.post-category",
  "api::author.author",
  "api::country-guideline.country-guideline",
  "api::country-flag.country-flag",
  "api::product.product",
  "api::team-member.team-member",
  "api::resource-item.resource-item",
  "api::location.location",
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
  "api::service-category.service-category",
] as const;

/** Single types: controller exposes find only. */
const SINGLE_API_UIDS = [
  "api::site-config.site-config",
  "api::region-highlights-section.region-highlights-section",
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
  await grantPublicPermission(strapi, "api::comment.comment.submit");
  await grantPublicPermission(strapi, "api::comment.comment.approvedList");
  await grantPublicPermission(strapi, "api::contact-submission.contact-submission.submit");
  await grantPublicPermission(strapi, "api::booking-request.booking-request.submit");
  await grantPublicPermission(strapi, "api::booking-request.booking-request.availability");
  await grantPublicPermission(strapi, "api::lab-report-file.lab-report-file.download");
  await grantPublicPermission(strapi, "api::lab-report-file.lab-report-file.staffLogin");
}
