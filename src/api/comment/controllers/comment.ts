import { factories } from "@strapi/strapi";

export default factories.createCoreController("api::comment.comment" as any, ({ strapi }) => ({
  /**
   * GET ?postType=article|news-post&targetSlug=... — approved top-level comments only (safe for public).
   */
  async approvedList(ctx: any) {
    const postType = String(ctx.query.postType ?? "").trim();
    const targetSlug = String(ctx.query.targetSlug ?? "").trim();
    if (postType !== "article" && postType !== "news-post") {
      ctx.status = 400;
      ctx.body = { error: "Invalid postType" };
      return;
    }
    if (!targetSlug) {
      ctx.status = 400;
      ctx.body = { error: "targetSlug required" };
      return;
    }

    const site = await strapi.documents("api::site-config.site-config" as any).findFirst({});
    if ((site as { commentsEnabled?: boolean } | null)?.commentsEnabled !== true) {
      ctx.status = 200;
      ctx.body = { data: [] };
      return;
    }

    const postUid = postType === "article" ? ("api::article.article" as const) : ("api::news-post.news-post" as const);
    const post = await strapi.documents(postUid).findFirst({
      filters: { slug: { $eq: targetSlug } },
      status: "published",
    });
    if (!post || (post as { commentsOpen?: boolean }).commentsOpen === false) {
      ctx.status = 200;
      ctx.body = { data: [] };
      return;
    }

    const rows = await strapi.documents("api::comment.comment" as any).findMany({
      filters: {
        postType: { $eq: postType },
        targetSlug: { $eq: targetSlug },
        isApproved: { $eq: true },
      },
      limit: 100,
    });
    const list = (rows as Array<{ parent?: unknown }>).filter((r) => r.parent == null);
    ctx.status = 200;
    ctx.body = { data: list };
  },

  /**
   * Public POST body: { postType, targetSlug, authorName, authorEmail?, body, parentId? }
   * Creates an unapproved comment (moderation in Strapi admin).
   */
  async submit(ctx: any) {
    try {
      const body = ctx.request.body as Record<string, unknown>;
      const postType = String(body.postType ?? "").trim();
      const targetSlug = String(body.targetSlug ?? "").trim();
      const authorName = String(body.authorName ?? "").trim();
      const authorEmail = String(body.authorEmail ?? "").trim();
      const text = String(body.body ?? "").trim();
      const parentId = body.parentId != null ? String(body.parentId).trim() : "";

      if (postType !== "article" && postType !== "news-post") {
        ctx.status = 400;
        ctx.body = { error: "Invalid postType" };
        return;
      }
      if (!targetSlug || !authorName || !text) {
        ctx.status = 400;
        ctx.body = { error: "targetSlug, authorName, and body are required" };
        return;
      }
      if (text.length > 8000) {
        ctx.status = 400;
        ctx.body = { error: "body too long" };
        return;
      }

      const uid = postType === "article" ? ("api::article.article" as const) : ("api::news-post.news-post" as const);
      const found = await strapi.documents(uid).findFirst({
        filters: { slug: { $eq: targetSlug } },
        status: "published",
      });
      if (!found) {
        ctx.status = 404;
        ctx.body = { error: "Post not found" };
        return;
      }

      const flat = found as Record<string, unknown>;
      if (flat.commentsOpen === false) {
        ctx.status = 403;
        ctx.body = { error: "Comments are closed for this post" };
        return;
      }

      const site = await strapi.documents("api::site-config.site-config" as any).findFirst({});
      const siteFlat = (site ?? {}) as Record<string, unknown>;
      if (siteFlat.commentsEnabled !== true) {
        ctx.status = 403;
        ctx.body = { error: "Comments are disabled for this site" };
        return;
      }

      const data: Record<string, unknown> = {
        postType,
        targetSlug,
        authorName,
        body: text,
        isApproved: false,
      };
      if (authorEmail) data.authorEmail = authorEmail;
      if (parentId) data.parent = parentId;

      await strapi.documents("api::comment.comment" as any).create({ data } as any);
      ctx.status = 200;
      ctx.body = { ok: true };
    } catch (e) {
      strapi.log.error("[comment.submit]", e);
      ctx.status = 500;
      ctx.body = { error: "Could not submit comment" };
    }
  },
}));
