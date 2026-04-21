import { factories } from "@strapi/strapi";
import { escapeText, sendSmtpMail } from "../../../utils/smtp-mail";

const UID = "api::contact-submission.contact-submission" as const;
const SITE_UID = "api::site-config.site-config" as const;

export default factories.createCoreController(UID as any, ({ strapi }) => ({
  /**
   * Public POST: { formKey, name, email, phone?, serviceInterest?, message }
   * Persists a row in **Contact submission**; emails staff + optional user copy when SMTP is configured.
   */
  async submit(ctx: any) {
    try {
      const body = ctx.request.body as Record<string, unknown>;
      const formKey = String(body.formKey ?? "").trim();
      const name = String(body.name ?? "").trim();
      const email = String(body.email ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      const serviceInterest = String(body.serviceInterest ?? "").trim();
      const message = String(body.message ?? "").trim();

      if (formKey !== "contact_page" && formKey !== "home_quick") {
        ctx.status = 400;
        ctx.body = { error: "Invalid formKey" };
        return;
      }
      if (!name || name.length > 120 || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ctx.status = 400;
        ctx.body = { error: "Valid name and email are required" };
        return;
      }
      if (!message || message.length > 5000) {
        ctx.status = 400;
        ctx.body = { error: "Message is required (max 5000 characters)" };
        return;
      }
      if (phone.length > 40 || serviceInterest.length > 120) {
        ctx.status = 400;
        ctx.body = { error: "Field too long" };
        return;
      }

      const site = await strapi.documents(SITE_UID as any).findFirst({});
      const siteFlat = (site ?? {}) as Record<string, unknown>;
      const mainEmail = String(siteFlat.email ?? "").trim();
      const toOverride = String(siteFlat.contactFormToEmail ?? "").trim();
      const staffTo = toOverride || mainEmail;
      if (!staffTo) {
        ctx.status = 503;
        ctx.body = { error: "Site email is not configured" };
        return;
      }
      const sendUserCopy = siteFlat.contactFormSendConfirmation !== false;

      const data: Record<string, unknown> = {
        formKey,
        name,
        email,
        message: escapeText(message),
      };
      if (phone) data.phone = phone;
      if (serviceInterest) data.serviceInterest = serviceInterest;

      await strapi.documents(UID as any).create({ data } as any);

      const formLabel = formKey === "home_quick" ? "Home (Get in touch)" : "Contact page";
      const adminText = [
        `New website message (${formLabel})`,
        "",
        `Name: ${name}`,
        `Email: ${email}`,
        phone ? `Phone: ${phone}` : null,
        serviceInterest ? `Service / topic: ${serviceInterest}` : null,
        "",
        "Message:",
        escapeText(message),
        "",
        "— Sent from the public site contact form",
      ]
        .filter(Boolean)
        .join("\n");

      try {
        const adminMail = await sendSmtpMail(siteFlat, {
          to: staffTo,
          subject: `[${formLabel}] Message from ${name}`,
          text: adminText,
          replyTo: email,
        });
        if (adminMail.skipped) {
          strapi.log.warn(`[contact.submit] Staff email not sent: ${adminMail.reason}`);
        }
      } catch (e) {
        strapi.log.error("[contact.submit] Staff email failed:", e);
      }

      if (sendUserCopy) {
        try {
          const userText = [
            `Hi ${name},`,
            "",
            "Thanks for contacting us. We received your message and will get back to you as soon as we can.",
            "",
            "A copy of what you sent:",
            "",
            escapeText(message),
            "",
            `— ${String(siteFlat.siteName ?? "Our team")}`,
          ].join("\n");
          const userMail = await sendSmtpMail(siteFlat, {
            to: email,
            subject: "We received your message",
            text: userText,
            replyTo: staffTo,
          });
          if (userMail.skipped) {
            strapi.log.warn(`[contact.submit] User confirmation not sent: ${userMail.reason}`);
          }
        } catch (e) {
          strapi.log.error("[contact.submit] User confirmation email failed:", e);
        }
      }

      ctx.status = 200;
      ctx.body = { ok: true };
    } catch (e) {
      strapi.log.error("[contact.submit]", e);
      ctx.status = 500;
      ctx.body = { error: "Could not submit message" };
    }
  },
}));
