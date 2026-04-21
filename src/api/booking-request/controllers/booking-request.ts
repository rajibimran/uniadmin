import { factories } from "@strapi/strapi";
import { sendSmtpMail } from "../../../utils/smtp-mail";

const UID = "api::booking-request.booking-request" as const;
const SITE_UID = "api::site-config.site-config" as const;
const BOOKING_PAGE_UID = "api::booking-page.booking-page" as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normalizeSlot(s: string): string {
  return s.trim().replace(/\s+/g, " ");
}

async function loadAllowedTimeSlots(strapi: any): Promise<string[]> {
  try {
    const page = await strapi.documents(BOOKING_PAGE_UID).findFirst({
      populate: { timeSlotLines: true },
    });
    const rows = (page as { timeSlotLines?: Array<{ text?: string }> } | null)?.timeSlotLines ?? [];
    const out = rows.map((r) => normalizeSlot(String(r.text ?? ""))).filter(Boolean);
    return out;
  } catch {
    return [];
  }
}

/** Bookings that still hold the slot (cancelled frees it). Same calendar date + time = one slot (any service). */
async function findBlockingBookings(strapi: any, appointmentDate: string, timeSlot: string) {
  const slot = normalizeSlot(timeSlot);
  return strapi.db.query(UID).findMany({
    where: {
      appointmentDate,
      timeSlot: slot,
      status: { $ne: "cancelled" },
    },
    limit: 25,
  });
}

export default factories.createCoreController(UID as any, ({ strapi }) => ({
  /**
   * GET /api/booking-requests/availability?date=YYYY-MM-DD
   * Returns time slots already taken (non-cancelled) for that day.
   */
  async availability(ctx: any) {
    try {
      const raw = String(ctx.query?.date ?? "").trim();
      if (!DATE_RE.test(raw)) {
        ctx.status = 400;
        ctx.body = { error: "Query parameter date=YYYY-MM-DD is required" };
        return;
      }
      const rows = await strapi.db.query(UID).findMany({
        where: {
          appointmentDate: raw,
          status: { $ne: "cancelled" },
        },
        select: ["timeSlot"],
        limit: 500,
      });
      const bookedSlots = [
        ...new Set(
          (rows as Array<{ timeSlot?: string }>)
            .map((r) => normalizeSlot(String(r.timeSlot ?? "")))
            .filter(Boolean)
        ),
      ];
      ctx.status = 200;
      ctx.body = { bookedSlots };
    } catch (e) {
      strapi.log.error("[booking.availability]", e);
      ctx.status = 500;
      ctx.body = { error: "Could not load availability" };
    }
  },

  /**
   * POST /api/booking-requests/submit
   * Body: { patientName, email, phone, serviceId, serviceTitle?, appointmentDate, timeSlot }
   */
  async submit(ctx: any) {
    try {
      const body = ctx.request.body as Record<string, unknown>;
      const patientName = String(body.patientName ?? body.name ?? "").trim();
      const email = String(body.email ?? "").trim();
      const phone = String(body.phone ?? "").trim();
      const serviceId = String(body.serviceId ?? "").trim();
      const serviceTitle = String(body.serviceTitle ?? "").trim();
      const appointmentDate = String(body.appointmentDate ?? "").trim();
      let timeSlot = normalizeSlot(String(body.timeSlot ?? ""));

      if (!patientName || patientName.length > 120) {
        ctx.status = 400;
        ctx.body = { error: "Valid patient name is required" };
        return;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        ctx.status = 400;
        ctx.body = { error: "Valid email is required" };
        return;
      }
      if (!phone || phone.length > 40) {
        ctx.status = 400;
        ctx.body = { error: "Valid phone is required" };
        return;
      }
      if (!serviceId || serviceId.length > 120) {
        ctx.status = 400;
        ctx.body = { error: "Service is required" };
        return;
      }
      if (!DATE_RE.test(appointmentDate)) {
        ctx.status = 400;
        ctx.body = { error: "appointmentDate must be YYYY-MM-DD" };
        return;
      }
      if (!timeSlot || timeSlot.length > 80) {
        ctx.status = 400;
        ctx.body = { error: "Time slot is required" };
        return;
      }

      const allowed = await loadAllowedTimeSlots(strapi);
      if (allowed.length > 0 && !allowed.includes(timeSlot)) {
        ctx.status = 400;
        ctx.body = { error: "This time slot is not offered. Please choose another." };
        return;
      }

      const conflicts = await findBlockingBookings(strapi, appointmentDate, timeSlot);
      if (conflicts.length > 0) {
        ctx.status = 409;
        ctx.body = { error: "This time slot was just booked. Please pick another time." };
        return;
      }

      await strapi.documents(UID as any).create({
        data: {
          patientName,
          email,
          phone,
          serviceId,
          ...(serviceTitle ? { serviceTitle } : {}),
          appointmentDate,
          timeSlot,
          status: "pending",
        },
      } as any);

      const site = await strapi.documents(SITE_UID as any).findFirst({});
      const siteFlat = (site ?? {}) as Record<string, unknown>;
      const mainEmail = String(siteFlat.email ?? "").trim();
      const bookingTo = String(siteFlat.bookingFormToEmail ?? "").trim();
      const contactTo = String(siteFlat.contactFormToEmail ?? "").trim();
      const staffTo = bookingTo || contactTo || mainEmail;
      if (!staffTo) {
        strapi.log.warn(
          "[booking.submit] Booking saved but no staff inbox — set **Booking form — staff inbox** or **Contact form — staff inbox** (or main Email) in Site config to receive notifications."
        );
      }

      const sendUserCopy = siteFlat.bookingFormSendConfirmation !== false;
      const siteLabel = String(siteFlat.siteName ?? "Clinic").trim() || "Clinic";

      const adminText = [
        "New online appointment request",
        "",
        `Name: ${patientName}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Service: ${serviceTitle || serviceId} (${serviceId})`,
        `Date: ${appointmentDate}`,
        `Time: ${timeSlot}`,
        "",
        "Please call the patient to confirm. Manage status in Admin → Appointment booking.",
        "",
        "— Sent from the website booking form",
      ].join("\n");

      if (staffTo) {
        try {
          const adminMail = await sendSmtpMail(siteFlat, {
            to: staffTo,
            subject: `[Booking request] ${patientName} — ${appointmentDate} ${timeSlot}`,
            text: adminText,
            replyTo: email,
          });
          if (adminMail.skipped) {
            strapi.log.warn(`[booking.submit] Staff email not sent: ${adminMail.reason}`);
          }
        } catch (e) {
          strapi.log.error("[booking.submit] Staff email failed:", e);
        }
      }

      if (sendUserCopy) {
        try {
          const userText = [
            `Hi ${patientName},`,
            "",
            `We received your appointment request for ${appointmentDate} at ${timeSlot}.`,
            "Our team will contact you by phone to confirm your booking.",
            "",
            "If you need to change anything, reply to this email or call the clinic.",
            "",
            `— ${siteLabel}`,
          ].join("\n");
          const userMail = await sendSmtpMail(siteFlat, {
            to: email,
            subject: `We received your booking request — ${siteLabel}`,
            text: userText,
            replyTo: staffTo,
          });
          if (userMail.skipped) {
            strapi.log.warn(`[booking.submit] User confirmation not sent: ${userMail.reason}`);
          }
        } catch (e) {
          strapi.log.error("[booking.submit] User confirmation email failed:", e);
        }
      }

      ctx.status = 200;
      ctx.body = { ok: true };
    } catch (e) {
      strapi.log.error("[booking.submit]", e);
      ctx.status = 500;
      ctx.body = { error: "Could not complete booking" };
    }
  },
}));
