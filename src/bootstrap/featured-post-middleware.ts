import type { Core } from "@strapi/strapi";

const ARTICLE_UID = "api::article.article";
const NEWS_UID = "api::news-post.news-post";

async function clearOtherFeatured(strapi: Core.Strapi, uid: typeof ARTICLE_UID | typeof NEWS_UID, keepDocumentId: string) {
  for (const status of ["published", "draft"] as const) {
    const docs = await strapi.documents(uid).findMany({ limit: 500, status });
    for (const doc of docs) {
      const id = (doc as { documentId?: string }).documentId;
      if (!id || id === keepDocumentId) continue;
      if ((doc as { isFeatured?: boolean }).isFeatured) {
        try {
          await strapi.documents(uid).update({ documentId: id, data: { isFeatured: false } as any });
        } catch (e) {
          strapi.log.warn(`[featured-middleware] Could not clear isFeatured on ${uid} ${id}`, e);
        }
      }
    }
  }
}

export function registerFeaturedPostMiddleware(strapi: Core.Strapi) {
  strapi.documents.use(async (context, next) => {
    const uid = context.uid;
    if (uid !== ARTICLE_UID && uid !== NEWS_UID) {
      return next();
    }

    const result = await next();
    const row = result as { isFeatured?: boolean; documentId?: string } | null;
    if (row?.isFeatured === true && row.documentId) {
      await clearOtherFeatured(strapi, uid, row.documentId);
    }
    return result;
  });
}
