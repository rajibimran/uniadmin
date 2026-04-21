import nodemailer from "nodemailer";

export function escapeText(s: string): string {
  return s.replace(/\r\n/g, "\n").slice(0, 12000);
}

/** Site config fields override `process.env` when set. */
export function resolveSmtp(site: Record<string, unknown>) {
  const host = String(site.smtpHost ?? process.env.SMTP_HOST ?? "").trim();
  const portRaw = site.smtpPort ?? process.env.SMTP_PORT;
  const port = portRaw != null && portRaw !== "" ? Number(portRaw) : 587;
  const envSecure = String(process.env.SMTP_SECURE ?? "").toLowerCase() === "true";
  const secure = site.smtpSecure === true || envSecure || port === 465;
  const user = String(site.smtpUsername ?? process.env.SMTP_USERNAME ?? "").trim();
  const pass = String(site.smtpPassword ?? process.env.SMTP_PASSWORD ?? "").trim();
  const from =
    String(site.emailFrom ?? process.env.EMAIL_FROM ?? "").trim() ||
    user ||
    String(site.email ?? "").trim();
  return { host, port, secure, user, pass, from };
}

export async function sendSmtpMail(
  site: Record<string, unknown>,
  opts: { to: string; subject: string; text: string; replyTo?: string }
) {
  const { host, port, secure, user, pass, from } = resolveSmtp(site);
  if (!host) {
    return { skipped: true as const, reason: "SMTP host not set (Site config or SMTP_HOST env)" };
  }
  if (!from) {
    return {
      skipped: true as const,
      reason: "From address not set (Site config “SMTP — From”, EMAIL_FROM env, or SMTP username)",
    };
  }
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
  });
  await transporter.sendMail({
    from,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  });
  return { skipped: false as const };
}
