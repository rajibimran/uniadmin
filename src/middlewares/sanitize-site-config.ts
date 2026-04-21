/**
 * Removes outbound-mail settings from public `GET /api/site-config` responses
 * so SMTP credentials stored in Site config are never sent to the browser.
 */
const SMTP_FIELDS = [
  "smtpHost",
  "smtpPort",
  "smtpSecure",
  "smtpUsername",
  "smtpPassword",
  "emailFrom",
] as const;

function stripFromObject(obj: Record<string, unknown>) {
  for (const k of SMTP_FIELDS) {
    delete obj[k];
  }
}

export default () => {
  return async (ctx: any, next: () => Promise<void>) => {
    await next();
    const path = typeof ctx.path === "string" ? ctx.path : "";
    if (ctx.method !== "GET" || !path.startsWith("/api/site-config")) return;

    const body = ctx.body as { data?: Record<string, unknown> } | undefined;
    if (!body?.data || typeof body.data !== "object") return;

    const d = body.data as Record<string, unknown>;
    stripFromObject(d);
    const attrs = d.attributes;
    if (attrs && typeof attrs === "object" && !Array.isArray(attrs)) {
      stripFromObject(attrs as Record<string, unknown>);
    }
  };
};
