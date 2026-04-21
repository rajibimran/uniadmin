import type { Core } from "@strapi/strapi";
import { uploadImageFromUrl } from "./upload-from-url";
import { runAboutSeed } from "./about-seed";

const SITE_UID = "api::site-config.site-config" as any;
const NAV_UID = "api::navigation.navigation" as any;
const FOOT_Q_UID = "api::footer-quick-link.footer-quick-link" as any;
const FOOT_S_UID = "api::footer-service-link.footer-service-link" as any;
const STAT_UID = "api::stat.stat" as any;
const COUNTRY_FLAG_UID = "api::country-flag.country-flag" as any;
const REGION_HIGHLIGHTS_SECTION_UID = "api::region-highlights-section.region-highlights-section" as any;
const CERT_UID = "api::certification.certification" as any;
const HERO_UID = "api::hero.hero" as any;
const SERVICE_UID = "api::service.service" as any;
const TESTIMONIAL_UID = "api::testimonial.testimonial" as any;
const PKG_UID = "api::service-package.service-package" as any;
const GALLERY_UID = "api::gallery-image.gallery-image" as any;
const FAQ_UID = "api::faq.faq" as any;
const CG_UID = "api::country-guideline.country-guideline" as any;
const NEWS_UID = "api::news-post.news-post" as any;
const ARTICLE_UID = "api::article.article" as any;
const POST_CATEGORY_UID = "api::post-category.post-category" as any;
const AUTHOR_UID = "api::author.author" as any;
const EQUIP_UID = "api::equipment-item.equipment-item" as any;
const FITNESS_UID = "api::fitness-criterion.fitness-criterion" as any;
const ABOUT_UID = "api::about-page.about-page" as any;
const SERVICES_PAGE_UID = "api::services-page.services-page" as any;
const BOOKING_PAGE_UID = "api::booking-page.booking-page" as any;
const REPORT_PAGE_UID = "api::report-page.report-page" as any;
const SCREENING_PAGE_UID = "api::screening-process-page.screening-process-page" as any;
const PRIVACY_PAGE_UID = "api::privacy-page.privacy-page" as any;
const FITNESS_PAGE_UID = "api::fitness-page.fitness-page" as any;

const LOGO_URL = "https://unicaremedicalbd.co/assets/img/logo_unicare.png";

/** Rich text payload for current Strapi schema fields (stored as string). */
function richtext(text: string) {
  return text;
}

async function count(strapi: Core.Strapi, uid: any): Promise<number> {
  const many = await strapi.documents(uid).findMany({ limit: 500 });
  return many.length;
}

/**
 * Link FAQs to the matching **Hero** (dropdown source in Admin).
 * - If `sitePage` is empty: resolve from legacy DB column `page` when present, else default `home`.
 */
async function ensureFaqSitePageLinks(strapi: Core.Strapi) {
  let heroes: Array<{ documentId?: string; page?: string }> = [];
  try {
    heroes = (await strapi.documents(HERO_UID).findMany({ limit: 200 })) as Array<{ documentId?: string; page?: string }>;
  } catch {
    return;
  }
  const pageToHeroDocId = new Map<string, string>();
  for (const h of heroes) {
    if (h.page && h.documentId) pageToHeroDocId.set(String(h.page).trim(), h.documentId);
  }
  if (pageToHeroDocId.size === 0) return;

  let tableName = "faqs";
  try {
    const meta = strapi.db.metadata.get(FAQ_UID);
    if (meta && typeof (meta as { tableName?: string }).tableName === "string") {
      tableName = (meta as { tableName: string }).tableName;
    }
  } catch {
    /* keep default */
  }

  const knex = strapi.db.connection;
  let hasLegacyPageCol = false;
  try {
    hasLegacyPageCol = await knex.schema.hasColumn(tableName, "page");
  } catch {
    hasLegacyPageCol = false;
  }

  const faqs = (await strapi.documents(FAQ_UID).findMany({
    limit: 500,
    populate: { sitePage: true },
  })) as Array<{
    documentId?: string;
    sitePage?: { documentId?: string } | string | null;
  }>;

  let linked = 0;
  for (const row of faqs) {
    if (!row.documentId) continue;
    const siteRef =
      typeof row.sitePage === "object" && row.sitePage && "documentId" in row.sitePage
        ? row.sitePage.documentId
        : typeof row.sitePage === "string"
          ? row.sitePage
          : null;
    if (siteRef) continue;

    let pageKey: string | null = null;
    if (hasLegacyPageCol) {
      try {
        const r = await knex(tableName).where({ document_id: row.documentId }).first();
        const p = r?.page;
        if (p != null && String(p).trim()) pageKey = String(p).trim();
      } catch {
        /* ignore */
      }
    }
    if (!pageKey) pageKey = "home";
    const hid = pageToHeroDocId.get(pageKey);
    if (!hid) {
      strapi.log.warn(
        `[seed:faq] FAQ ${row.documentId} has no sitePage; no published Hero for page="${pageKey}". Link it in Admin.`
      );
      continue;
    }
    try {
      await strapi.documents(FAQ_UID).update({
        documentId: row.documentId,
        data: { sitePage: hid } as any,
        status: "published",
      });
      linked++;
    } catch (e) {
      strapi.log.warn(`[seed:faq] Could not link FAQ ${row.documentId} to hero:`, e);
    }
  }
  if (linked) strapi.log.info(`[seed:faq] Linked ${linked} FAQ(s) to Hero (sitePage).`);
}

function hasMediaField(val: unknown): boolean {
  if (val == null) return false;
  if (typeof val === "object" && val !== null && "id" in val) return true;
  return false;
}

// ── Phase: layout ───────────────────────────────────────────────

async function seedLayoutPhase(strapi: Core.Strapi) {
  strapi.log.info("[seed:layout] Site config, navigation, footer, certifications…");

  let logoId: number | undefined;
  try {
    logoId = await uploadImageFromUrl(strapi, LOGO_URL, "unicare-logo.png", "Unicare Medical Services logo");
  } catch (e) {
    strapi.log.warn("[seed:layout] Logo upload failed (offline?):", e);
  }

  const sites = await strapi.documents(SITE_UID).findMany({ limit: 1 });
  const sitePayload = {
    siteName: "Unicare Medical Services",
    tagline: "GCC Approved Medical Center",
    phone: "+88 02 48316027",
    email: "unicaremedicalbd@gmail.com",
    address: "13/1, New Eskaton Road (2nd Floor), Moghbazar, Dhaka",
    workingHours: "Sat–Thu: 8:00 AM – 8:00 PM",
    googleMapsEmbed:
      "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3652.0!2d90.4!3d23.75!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zMjPCsDQ1JzAwLjAiTiA5MMKwMjQnMDAuMCJF!5e0!3m2!1sen!2sbd!4v1",
    facebookUrl: "https://facebook.com",
    instagramUrl: "https://instagram.com",
    linkedinUrl: "https://linkedin.com",
    showBlogSection: true,
    showNewsSection: true,
    commentsEnabled: false,
    contactFormSendConfirmation: true,
    footerBrandExtra:
      "GCC approved medical center providing comprehensive health screening and certification services in Dhaka, Bangladesh.",
    footerColumns: [],
    footerCertStripTitle: "Approved & Certified By",
    footerPrivacyLinkLabel: "Privacy Policy",
    footerCopyrightExtra: ", Dhaka. All rights reserved.",
    footerMapPlaceholderLabel: "Map Placeholder",
    footerLegacyQuickTitle: "Quick Navigation",
    footerLegacyServicesTitle: "Our Services",
    footerLegacyHelpTitle: "Help Desk",
    footerLegacyHelpBody: "Need assistance? Our help desk is available during working hours.",
    quickContactSectionTitle: "Get In Touch",
    quickContactSectionBody:
      "Have questions? Reach out to us directly or send a quick message. Submissions are saved for staff and can trigger email when the server is configured.",
    quickContactFormHeading: "Send a Message",
    quickContactSuccessHeading: "Message Sent!",
    quickContactSuccessBody: "We'll get back to you within 24 hours.",
    quickContactIframeTitle: "Clinic location",
    ...(logoId ? { logo: logoId } : {}),
  } as any;

  if (sites.length === 0) {
    await strapi.documents(SITE_UID).create({ data: sitePayload, status: "published" });
    strapi.log.info("[seed:layout] Created site-config with logo.");
  } else {
    const sid = (sites[0] as { documentId: string }).documentId;
    if (logoId && !hasMediaField((sites[0] as { logo?: unknown }).logo)) {
      await strapi.documents(SITE_UID).update({
        documentId: sid,
        data: { logo: logoId } as any,
        status: "published",
      });
      strapi.log.info("[seed:layout] Updated site-config logo.");
    } else {
      strapi.log.info("[seed:layout] Site-config already present; skipped create.");
    }
  }

  if ((await count(strapi, NAV_UID)) === 0) {
    await strapi.documents(NAV_UID).create({ data: { label: "Home", href: "/", order: 0 } as any, status: "published" });
    await strapi.documents(NAV_UID).create({ data: { label: "About", href: "/about", order: 1 } as any, status: "published" });
    await strapi.documents(NAV_UID).create({ data: { label: "Services", href: "/services", order: 2 } as any, status: "published" });
    const res = await strapi.documents(NAV_UID).create({
      data: { label: "Resources", href: "#", order: 3 } as any,
      status: "published",
    });
    const resId = (res as { documentId?: string }).documentId ?? (res as { id?: number }).id;
    await strapi.documents(NAV_UID).create({
      data: { label: "Fitness Criteria", href: "/fitness", order: 0, parent: resId } as any,
      status: "published",
    });
    await strapi.documents(NAV_UID).create({
      data: { label: "Equipment", href: "/equipment", order: 1, parent: resId } as any,
      status: "published",
    });
    await strapi.documents(NAV_UID).create({ data: { label: "News", href: "/news", order: 4 } as any, status: "published" });
    await strapi.documents(NAV_UID).create({ data: { label: "Blog", href: "/blog", order: 5 } as any, status: "published" });
    await strapi.documents(NAV_UID).create({ data: { label: "Contact", href: "/contact", order: 6 } as any, status: "published" });
    strapi.log.info("[seed:layout] Navigation created.");
  }

  if ((await count(strapi, FOOT_Q_UID)) === 0) {
    for (const row of [
      { label: "About Us", href: "/about", order: 0 },
      { label: "Services", href: "/services", order: 1 },
      { label: "Fitness Criteria", href: "/fitness", order: 2 },
      { label: "Contact", href: "/contact", order: 3 },
      { label: "Privacy Policy", href: "/privacy", order: 4 },
    ]) {
      await strapi.documents(FOOT_Q_UID).create({ data: row as any, status: "published" });
    }
    strapi.log.info("[seed:layout] Footer quick links created.");
  } else {
    const quickLinks = await strapi.documents(FOOT_Q_UID).findMany({ limit: 500 });
    const hasPrivacy = (quickLinks as Array<{ href?: string }>).some((row) => row.href === "/privacy");
    if (!hasPrivacy) {
      await strapi.documents(FOOT_Q_UID).create({
        data: { label: "Privacy Policy", href: "/privacy", order: 99 } as any,
        status: "published",
      });
      strapi.log.info("[seed:layout] Added missing Privacy Policy quick link.");
    }
  }

  if ((await count(strapi, FOOT_S_UID)) === 0) {
    for (const row of [
      { label: "Physical Examination", href: "/services/physical-examination", order: 0 },
      { label: "Digital Radiology", href: "/services/digital-radiology", order: 1 },
      { label: "Laboratory Tests", href: "/services/laboratory-tests", order: 2 },
      { label: "Vaccination", href: "/services/vaccination", order: 3 },
    ]) {
      await strapi.documents(FOOT_S_UID).create({ data: row as any, status: "published" });
    }
    strapi.log.info("[seed:layout] Footer service links created.");
  }

  if ((await count(strapi, CERT_UID)) === 0) {
    let o = 0;
    for (const name of ["GAMCA", "WAFID", "DGHS", "ISO Certified", "MOH Approved"]) {
      await strapi.documents(CERT_UID).create({ data: { name, order: o++ } as any, status: "published" });
    }
    strapi.log.info("[seed:layout] Certifications created.");
  }

  if ((await count(strapi, SERVICES_PAGE_UID)) === 0) {
    await strapi.documents(SERVICES_PAGE_UID).create({
      data: {
        entryTitle: "Services Page",
        comparisonRows: [
          { feature: "General Medical Exam", physical: "yes", radiology: "no", laboratory: "no", vaccination: "no" },
          { feature: "Chest X-ray", physical: "no", radiology: "yes", laboratory: "no", vaccination: "no" },
          { feature: "Blood Tests", physical: "no", radiology: "no", laboratory: "yes", vaccination: "no" },
          { feature: "MMR & Meningococcal", physical: "no", radiology: "no", laboratory: "no", vaccination: "yes" },
        ],
      } as any,
      status: "published",
    });
    strapi.log.info("[seed:layout] Services Page single type seeded.");
  }

  if ((await count(strapi, BOOKING_PAGE_UID)) === 0) {
    const slotLabels = [
      "08:00 AM", "08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM",
      "11:00 AM", "11:30 AM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM",
      "04:00 PM", "04:30 PM", "05:00 PM",
    ];
    await strapi.documents(BOOKING_PAGE_UID).create({
      data: {
        entryTitle: "Booking Page",
        timeSlotLines: slotLabels.map((text) => ({ text })),
      } as any,
      status: "published",
    });
    strapi.log.info("[seed:layout] Booking Page single type seeded.");
  }

  if ((await count(strapi, REPORT_PAGE_UID)) === 0) {
    await strapi.documents(REPORT_PAGE_UID).create({
      data: {
        samplePatientName: "Mohammad Rahman",
        sampleReportDate: "April 10, 2026",
        sampleStatus: "Completed",
        supportPhone: "+88 02 48316027",
      } as any,
      status: "published",
    });
    strapi.log.info("[seed:layout] Report Page single type seeded.");
  }

  if ((await count(strapi, SCREENING_PAGE_UID)) === 0) {
    await strapi.documents(SCREENING_PAGE_UID).create({
      data: {
        checklistTitle: "Preparation Checklist",
        checklistDescription: "Download our complete preparation guide before your visit.",
        totalTimeLabel: "Total Estimated Time: 2–3 hours (report in 24–48 hours)",
        steps: [
          {
            title: "Registration & Document Check",
            description: "Present your documents at the reception desk for verification and registration.",
            estimatedTime: "15–20 min",
            details: [
              "Bring original passport and 2 passport-size photos",
              "Submit GAMCA slip or token number",
              "Complete patient registration form",
              "Receive your medical file and queue number",
            ],
          },
          {
            title: "Sample Collection",
            description: "Blood and urine samples are collected by certified laboratory technicians.",
            estimatedTime: "10–15 min",
            details: [
              "Ensure 8–12 hours fasting for accurate blood work",
              "Blood drawn via venipuncture by trained phlebotomist",
              "Urine sample collected in sterile container",
              "Samples labeled and sent to automated analyzers",
            ],
          },
        ],
      } as any,
      status: "published",
    });
    strapi.log.info("[seed:layout] Screening Process Page single type seeded.");
  }

  if ((await count(strapi, PRIVACY_PAGE_UID)) === 0) {
    await strapi.documents(PRIVACY_PAGE_UID).create({
      data: {
        title: "Privacy Policy",
        intro:
          "At Unicare Medical Services, we are committed to protecting the privacy and confidentiality of your personal and medical information.",
        contactBlock:
          "For privacy-related inquiries, contact us at [unicaremedicalbd@gmail.com](mailto:unicaremedicalbd@gmail.com).",
        sections: [
          {
            heading: "Information We Collect",
            body: "We collect personal information necessary for medical screening including name, contact details, passport information, and medical history as required by GCC medical examination standards.",
          },
          {
            heading: "How We Use Your Information",
            body: "Your information is used exclusively for medical examination, report generation, and compliance with GAMCA and GCC health ministry requirements. We do not sell or share your data with third parties.",
          },
          {
            heading: "Data Security",
            body: "We employ industry-standard security measures including encrypted data storage, secure server infrastructure, and strict access controls to protect your medical records.",
          },
        ],
      } as any,
      status: "published",
    });
    strapi.log.info("[seed:layout] Privacy Page single type seeded.");
  }

  if ((await count(strapi, FITNESS_PAGE_UID)) === 0) {
    await strapi.documents(FITNESS_PAGE_UID).create({
      data: {
        entryTitle: "Fitness Page",
        disclaimer:
          "**Note:** These are standard GCC fitness criteria. Specific requirements may vary by destination country. Please consult our medical team for country-specific guidance.",
      } as any,
      status: "published",
    });
    strapi.log.info("[seed:layout] Fitness Page single type seeded.");
  }

  strapi.log.info("[seed:layout] Done. Check Admin → Site Config, Navigation, Footer links, Certifications.");
}

// ── Phase: home ─────────────────────────────────────────────────

const SLIDE_POOL = [
  "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1600&h=900&fit=crop",
  "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1600&h=900&fit=crop",
  "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=1600&h=900&fit=crop",
];

type HeroCtaSeed = { label: string; href: string; variant: "primary" | "secondary" };

type HeroSlideSeed = { imageId: number; title: string; text: string; ctaButtons?: HeroCtaSeed[] };

/** One uploaded image per pool URL, paired with slide title + body text. */
async function uploadHeroSlideItems(
  strapi: Core.Strapi,
  prefix: string,
  copies: { title: string; text: string }[]
): Promise<HeroSlideSeed[]> {
  const out: HeroSlideSeed[] = [];
  let i = 0;
  for (const url of SLIDE_POOL) {
    if (i >= copies.length) break;
    const c = copies[i];
    const id = await uploadImageFromUrl(strapi, url, `${prefix}-slide-${i}.jpg`, c.title);
    out.push({ imageId: id, title: c.title, text: c.text });
    i++;
  }
  return out;
}

function repeatSlideCopy(
  count: number,
  title: string,
  text: string
): { title: string; text: string }[] {
  return Array.from({ length: count }, () => ({ title, text }));
}

async function upsertHero(
  strapi: Core.Strapi,
  page: string,
  title: string,
  subtitle: string,
  slideDeck: HeroSlideSeed[],
  /** Applied to each slide that does not define its own `ctaButtons` (per-slide CTAs live on `hero.slide`). */
  defaultSlideCtas?: HeroCtaSeed[]
) {
  const existing = await strapi.documents(HERO_UID).findMany({ filters: { page: { $eq: page } }, limit: 1 });
  const data: Record<string, unknown> = {
    page,
    title,
    subtitle,
    ...(slideDeck.length
      ? {
          slideItems: slideDeck.map((s) => {
            const slideCtas =
              s.ctaButtons && s.ctaButtons.length > 0 ? s.ctaButtons : defaultSlideCtas && defaultSlideCtas.length > 0
                ? defaultSlideCtas
                : undefined;
            return {
              image: s.imageId,
              title: s.title,
              text: s.text,
              ...(slideCtas && slideCtas.length ? { ctaButtons: slideCtas } : {}),
            };
          }),
        }
      : {}),
    ctaButtons: [],
  };
  if (existing.length === 0) {
    await strapi.documents(HERO_UID).create({ data: data as any, status: "published" });
  } else {
    const id = (existing[0] as { documentId: string }).documentId;
    await strapi.documents(HERO_UID).update({ documentId: id, data: data as any, status: "published" });
  }
}

/** Banner image for home region-highlights strip (matches previous static marketing). */
const REGION_HIGHLIGHTS_BANNER_URL =
  "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=1920&h=640&fit=crop";

async function upsertRegionHighlightsSectionSeed(strapi: Core.Strapi) {
  const existing = await strapi.documents(REGION_HIGHLIGHTS_SECTION_UID).findMany({ limit: 1 });
  if (existing.length > 0) {
    const row = existing[0] as { documentId: string; bannerImage?: unknown; bannerTitle?: string; bannerDescription?: string };
    if (
      hasMediaField(row.bannerImage) &&
      String(row.bannerTitle ?? "").trim() &&
      String(row.bannerDescription ?? "").trim()
    ) {
      strapi.log.info("[seed:home] region-highlights-section already complete; skip.");
      return;
    }
    try {
      const imgId = await uploadImageFromUrl(
        strapi,
        REGION_HIGHLIGHTS_BANNER_URL,
        "region-highlights-banner.jpg",
        "Region highlights banner"
      );
      await strapi.documents(REGION_HIGHLIGHTS_SECTION_UID).update({
        documentId: row.documentId,
        data: {
          bannerImage: imgId,
          bannerTitle: "GAMCA Medical Centers in Bangladesh",
          bannerDescription:
            "GCC-approved medical screening for overseas employment — trusted by thousands of Bangladeshi workers",
        } as any,
        status: "published",
      });
      strapi.log.info("[seed:home] Updated region-highlights-section (filled missing fields).");
    } catch (e) {
      strapi.log.warn("[seed:home] region-highlights-section update skipped:", e);
    }
    return;
  }
  try {
    const imgId = await uploadImageFromUrl(
      strapi,
      REGION_HIGHLIGHTS_BANNER_URL,
      "region-highlights-banner.jpg",
      "Region highlights banner"
    );
    await strapi.documents(REGION_HIGHLIGHTS_SECTION_UID).create({
      data: {
        bannerImage: imgId,
        bannerTitle: "GAMCA Medical Centers in Bangladesh",
        bannerDescription:
          "GCC-approved medical screening for overseas employment — trusted by thousands of Bangladeshi workers",
      } as any,
      status: "published",
    });
    strapi.log.info("[seed:home] Created region-highlights-section.");
  } catch (e) {
    strapi.log.warn("[seed:home] region-highlights-section create skipped:", e);
  }
}

async function seedHomePhase(strapi: Core.Strapi) {
  strapi.log.info("[seed:home] Stats, country flags, testimonials, packages, gallery, FAQs, country guidelines, home hero…");

  if ((await count(strapi, STAT_UID)) === 0) {
    for (const row of [
      { label: "Accuracy Rate", value: 100, suffix: "%", order: 0 },
      { label: "Patients Served", value: 50000, suffix: "+", order: 1 },
      { label: "GCC Approved", value: 7, suffix: " Countries", order: 2 },
    ]) {
      await strapi.documents(STAT_UID).create({ data: row as any, status: "published" });
    }
  }

  if ((await count(strapi, COUNTRY_FLAG_UID)) === 0) {
    const flags = [
      { name: "Bahrain", url: "https://flagcdn.com/w160/bh.png", order: 0 },
      { name: "Kuwait", url: "https://flagcdn.com/w160/kw.png", order: 1 },
      { name: "Oman", url: "https://flagcdn.com/w160/om.png", order: 2 },
      { name: "UAE", url: "https://flagcdn.com/w160/ae.png", order: 3 },
      { name: "Saudi Arabia", url: "https://flagcdn.com/w160/sa.png", order: 4 },
      { name: "Qatar", url: "https://flagcdn.com/w160/qa.png", order: 5 },
      { name: "Yemen", url: "https://flagcdn.com/w160/ye.png", order: 6 },
    ];
    for (const row of flags) {
      const fid = await uploadImageFromUrl(
        strapi,
        row.url,
        `country-flag-${row.order}.png`,
        `${row.name} flag`
      );
      await strapi.documents(COUNTRY_FLAG_UID).create({
        data: { name: row.name, flag: fid, order: row.order } as any,
        status: "published",
      });
    }
  }

  await upsertRegionHighlightsSectionSeed(strapi);

  if ((await count(strapi, TESTIMONIAL_UID)) === 0) {
    const faces = [
      "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=200&h=200&fit=crop",
      "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop",
      "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop",
    ];
    const quotes = [
      { name: "Rashid Khan", quote: "Professional staff and quick report turnaround. Highly recommend for GCC medical.", order: 0 },
      { name: "Fatima Begum", quote: "Clean facility and clear guidance through every step of the screening process.", order: 1 },
      { name: "Abdul Karim", quote: "The radiology team was thorough and the digital X-ray results were ready the same day.", order: 2 },
    ];
    let i = 0;
    for (const q of quotes) {
      const pid = await uploadImageFromUrl(strapi, faces[i % faces.length], `testimonial-${i}.jpg`, q.name);
      i++;
      await strapi.documents(TESTIMONIAL_UID).create({
        data: { ...q, rating: 5, photo: pid } as any,
        status: "published",
      });
    }
  }

  if ((await count(strapi, PKG_UID)) === 0) {
    const pkgs = [
      {
        title: "Standard Screening",
        description: "Core medical tests required for most GCC employment visas.",
        features: JSON.stringify(["Physical exam", "Chest X-ray", "Laboratory panel"]),
        pricing: "Call for Pricing",
        order: 0,
      },
      {
        title: "Express Package",
        description: "Prioritized processing for urgent travel dates.",
        features: JSON.stringify(["Priority queue", "Same-day X-ray report", "Dedicated coordinator"]),
        pricing: "Call for Pricing",
        order: 1,
      },
      {
        title: "Family Add-on",
        description: "Additional screening for dependents when required by the employer.",
        features: JSON.stringify(["Pediatric-friendly slots", "Vaccination review", "Document checklist"]),
        pricing: "Call for Pricing",
        order: 2,
      },
    ];
    for (const p of pkgs) {
      await strapi.documents(PKG_UID).create({ data: p as any, status: "published" });
    }
  }

  if ((await count(strapi, GALLERY_UID)) === 0) {
    const imgs = [
      { url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=800&h=500&fit=crop", alt: "Reception area", order: 0 },
      { url: "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=800&h=500&fit=crop", alt: "Laboratory", order: 1 },
      { url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=500&fit=crop", alt: "Radiology suite", order: 2 },
    ];
    for (const g of imgs) {
      const fid = await uploadImageFromUrl(strapi, g.url, `gallery-${g.order}.jpg`, g.alt);
      await strapi.documents(GALLERY_UID).create({
        data: { image: fid, alt: g.alt, order: g.order } as any,
        status: "published",
      });
    }
  }

  if ((await count(strapi, CG_UID)) === 0) {
    const flagKsa = await uploadImageFromUrl(
      strapi,
      "https://flagcdn.com/w80/sa.png",
      "guideline-flag-ksa.png",
      "Saudi Arabia flag"
    );
    const flagUae = await uploadImageFromUrl(
      strapi,
      "https://flagcdn.com/w80/ae.png",
      "guideline-flag-uae.png",
      "UAE flag"
    );
    await strapi.documents(CG_UID).create({
      data: {
        name: "Saudi Arabia",
        countryId: "ksa",
        flag: flagKsa,
        processingTime: "2 to 4 working days",
        approvalNote: "100% WAFID Approved",
        expertTip: "Book early morning slots when possible for shorter queues.",
        mandatoryTests: "Physical exam, blood tests for communicable diseases, chest X-ray, and vaccinations as required.",
        rejectionCriteria: "Active TB, positive HIV, or other disqualifying conditions per current Saudi regulations.",
        specialRules: "Reports must be uploaded to the approved portal by an authorized medical center.",
        visaCategories: "General labor, skilled workers, domestic workers, and family residence.",
      } as any,
      status: "published",
    });
    await strapi.documents(CG_UID).create({
      data: {
        name: "United Arab Emirates",
        countryId: "uae",
        flag: flagUae,
        processingTime: "2 to 3 working days",
        approvalNote: "100% WAFID Approved",
        expertTip: "Confirm your destination emirate requirements before booking.",
        mandatoryTests: "Blood profile, chest X-ray, communicable disease screening, and physical examination.",
        rejectionCriteria: "Positive infectious disease markers or significant uncontrolled chronic illness.",
        specialRules: "Some employers require additional occupational checks.",
        visaCategories: "Employment, investor, domestic worker, and dependent visas.",
      } as any,
      status: "published",
    });
  }

  const homeSlideCopy = [
    {
      title: "GCC Approved Medical Center",
      text: "Trusted for comprehensive health screening, medical checkups, and overseas employment certification in Dhaka, Bangladesh.",
    },
    {
      title: "Advanced diagnostics",
      text: "Digital imaging and accredited laboratory testing to meet GCC medical standards.",
    },
    {
      title: "Patient-centered care",
      text: "Experienced staff guiding you through every step of screening and certification.",
    },
  ];
  const homeDeck = await uploadHeroSlideItems(strapi, "home", homeSlideCopy);
  await upsertHero(
    strapi,
    "home",
    "GCC Approved Medical Center",
    "Trusted for comprehensive health screening, medical checkups, and overseas employment certification in Dhaka, Bangladesh.",
    homeDeck,
    [
      { label: "Book Appointment", href: "/book", variant: "primary" },
      { label: "Check Report", href: "/reports", variant: "secondary" },
    ]
  );

  const homeHeroRows = await strapi.documents(HERO_UID).findMany({
    filters: { page: { $eq: "home" } },
    limit: 1,
  });
  const homeHeroDocId = (homeHeroRows[0] as { documentId?: string } | undefined)?.documentId;

  if ((await count(strapi, FAQ_UID)) === 0 && homeHeroDocId) {
    const faqs = [
      {
        question: "What documents should I bring?",
        answer: "Valid passport, photos, and your GAMCA slip. Additional documents may apply by country.",
        order: 0,
      },
      {
        question: "How long does reporting take?",
        answer: "Most results are available within 24–48 hours depending on the test panel.",
        order: 1,
      },
      {
        question: "Do you offer same-day appointments?",
        answer: "Subject to slot availability. Please call or book online for the next opening.",
        order: 2,
      },
    ];
    for (const f of faqs) {
      await strapi.documents(FAQ_UID).create({
        data: { ...f, sitePage: homeHeroDocId } as any,
        status: "published",
      });
    }
  }

  strapi.log.info(
    "[seed:home] Done. Check GET /api/stats, /testimonials, /service-packages, /gallery-images, /faqs?filters[sitePage][page][$eq]=home, /country-guidelines, /heroes?filters[page][$eq]=home"
  );
}

// ── Phase: services ────────────────────────────────────────────

const SERVICE_DEFS: Array<{
  slug: string;
  icon: string;
  title: string;
  category: "Examination" | "Imaging" | "Laboratory" | "Preventive";
  description: string;
  heroUrl: string;
  cardUrl: string;
  fullText: string;
  benefits: string[];
  tests: string[];
  pricing: { item: string; price: string; duration: string }[];
  timeline: { step: number; title: string; description: string }[];
  documents: { name: string; required: boolean }[];
}> = [
  {
    slug: "physical-examination",
    icon: "Stethoscope",
    title: "Physical Examination",
    category: "Examination",
    description:
      "Complete medical examination including visual acuity, system examination, and mental status assessment for GCC requirements.",
    heroUrl: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=1200&h=500&fit=crop",
    cardUrl: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=500&h=300&fit=crop",
    fullText:
      "Our Physical Examination service provides a thorough medical assessment meeting all GCC country requirements. Conducted by qualified medical officers.",
    benefits: [
      "Complete general medical examination by certified physicians",
      "Visual acuity testing — aided and unaided",
      "System examination — gastrointestinal, genitourinary, musculoskeletal",
      "Mental status examination",
      "GAMCA-approved reporting format",
    ],
    tests: ["Medical Examination: General", "Visual Acuity", "System Examination", "Mental Status Examination"],
    pricing: [
      { item: "Standard Physical Examination", price: "Call for Pricing", duration: "1–2 hours" },
      { item: "Express Examination", price: "Call for Pricing", duration: "45 min–1 hour" },
    ],
    timeline: [
      { step: 1, title: "Registration", description: "Present documents at reception and complete registration." },
      { step: 2, title: "Vision & Hearing", description: "Assessment by trained technician." },
      { step: 3, title: "Physical Examination", description: "Examination by medical officer." },
      { step: 4, title: "Report", description: "Findings documented in your medical file." },
    ],
    documents: [
      { name: "Valid Passport (Original + Copy)", required: true },
      { name: "2 Passport-size Photos", required: true },
      { name: "GAMCA Slip / Token Number", required: true },
    ],
  },
  {
    slug: "digital-radiology",
    icon: "ScanLine",
    title: "Digital Radiology",
    category: "Imaging",
    description: "Advanced digital chest X-ray using DRGEM system with radiation protection and quality imaging.",
    heroUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=1200&h=500&fit=crop",
    cardUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=500&h=300&fit=crop",
    fullText:
      "Our Digital Radiology department features the DRGEM GXR-40S digital X-ray system from Korea, providing high-quality chest X-ray imaging.",
    benefits: ["Digital X-ray with DR Machine", "Minimal radiation exposure", "High-resolution imaging", "Same-day report delivery"],
    tests: ["Chest X-ray (PA View)"],
    pricing: [{ item: "Chest X-ray", price: "Call for Pricing", duration: "30 minutes" }],
    timeline: [
      { step: 1, title: "Registration", description: "Check in at radiology." },
      { step: 2, title: "Imaging", description: "Chest X-ray performed by certified radiographer." },
      { step: 3, title: "Report", description: "Radiologist reviews images." },
    ],
    documents: [
      { name: "Valid Passport or National ID", required: true },
      { name: "GAMCA Slip", required: true },
    ],
  },
  {
    slug: "laboratory-tests",
    icon: "TestTubes",
    title: "Laboratory Tests",
    category: "Laboratory",
    description: "Comprehensive lab testing including biochemistry, immunology, hematology, serology, and clinical pathology.",
    heroUrl: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=1200&h=500&fit=crop",
    cardUrl: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=500&h=300&fit=crop",
    fullText:
      "Our state-of-the-art laboratory performs comprehensive testing across biochemistry, immunology, hematology, serology, and clinical pathology.",
    benefits: ["Automated analyzers", "Daily QC/Calibration", "Barcode-based sample tracking", "Results within 24 hours"],
    tests: ["Biochemistry", "Immunology", "Hematology", "Serology", "Clinical Pathology"],
    pricing: [
      { item: "Standard Lab Panel", price: "Call for Pricing", duration: "24 hours" },
      { item: "Full GCC Screening Panel", price: "Call for Pricing", duration: "24 hours" },
    ],
    timeline: [
      { step: 1, title: "Sample Collection", description: "Blood, urine, and stool samples collected." },
      { step: 2, title: "Lab Processing", description: "Samples analyzed using automated equipment." },
      { step: 3, title: "Result Delivery", description: "Reports available within 24 hours." },
    ],
    documents: [
      { name: "Valid Passport or NID", required: true },
      { name: "GAMCA Slip", required: true },
    ],
  },
  {
    slug: "vaccination",
    icon: "Syringe",
    title: "Vaccination",
    category: "Preventive",
    description: "Required vaccinations for overseas employment including MMR and Meningococcal vaccines.",
    heroUrl: "https://images.unsplash.com/photo-1615631648086-325025c9e51e?w=1200&h=500&fit=crop",
    cardUrl: "https://images.unsplash.com/photo-1615631648086-325025c9e51e?w=500&h=300&fit=crop",
    fullText: "Required vaccinations for overseas employment including MMR and Meningococcal vaccines administered by trained staff.",
    benefits: ["WHO-recommended cold chain", "Trained immunization staff", "Digital vaccination records"],
    tests: ["MMR", "Meningococcal ACWY", "Hepatitis B (if required)"],
    pricing: [{ item: "Vaccination consult", price: "Call for Pricing", duration: "30 minutes" }],
    timeline: [
      { step: 1, title: "Consent & Screening", description: "Medical history and eligibility check." },
      { step: 2, title: "Vaccination", description: "Vaccine administered per protocol." },
      { step: 3, title: "Observation", description: "Short post-vaccine observation period." },
    ],
    documents: [{ name: "Valid Passport", required: true }],
  },
];

async function seedServicesPhase(strapi: Core.Strapi) {
  strapi.log.info("[seed:services] Four services with images + services hero…");

  const existingSlug = await strapi.documents(SERVICE_UID).findMany({
    filters: { slug: { $eq: "physical-examination" } },
    limit: 1,
  });
  if (existingSlug.length > 0) {
    const existing = await strapi.documents(SERVICE_UID).findMany({ limit: 500 });
    let republished = 0;
    for (const row of existing as Array<{ documentId?: string }>) {
      if (!row.documentId) continue;
      try {
        await strapi.documents(SERVICE_UID).update({
          documentId: row.documentId,
          data: {} as any,
          status: "published",
        });
        republished++;
      } catch (e) {
        strapi.log.warn(`[seed:services] Could not republish existing service ${row.documentId}:`, e);
      }
    }
    strapi.log.info(
      `[seed:services] Services already exist (physical-examination found). Re-published ${republished} existing entries.`
    );
  } else {
    const docIds: Record<string, string> = {};
    for (const s of SERVICE_DEFS) {
      const heroId = await uploadImageFromUrl(strapi, s.heroUrl, `${s.slug}-hero.jpg`, s.title);
      const cardId = await uploadImageFromUrl(strapi, s.cardUrl, `${s.slug}-card.jpg`, s.title);
      const created = await strapi.documents(SERVICE_UID).create({
        data: {
          title: s.title,
          slug: s.slug,
          icon: s.icon,
          description: s.description,
          category: s.category,
          heroImage: heroId,
          cardImage: cardId,
          fullDescription: richtext(s.fullText),
          benefits: s.benefits.map((text) => ({ text })),
          tests: s.tests.map((text) => ({ text })),
          pricing: s.pricing,
          timeline: s.timeline,
          documents: s.documents,
        } as any,
        status: "published",
      });
      docIds[s.slug] = (created as { documentId: string }).documentId;
    }

    const rel: Record<string, string[]> = {
      "physical-examination": ["digital-radiology", "laboratory-tests", "vaccination"],
      "digital-radiology": ["physical-examination", "laboratory-tests", "vaccination"],
      "laboratory-tests": ["physical-examination", "digital-radiology", "vaccination"],
      vaccination: ["physical-examination", "digital-radiology", "laboratory-tests"],
    };

    for (const s of SERVICE_DEFS) {
      const connectIds = rel[s.slug].map((slug) => docIds[slug]).filter(Boolean);
      if (connectIds.length) {
        try {
          await strapi.documents(SERVICE_UID).update({
            documentId: docIds[s.slug],
            data: { relatedServices: { set: connectIds } } as any,
            status: "published",
          });
        } catch (e) {
          strapi.log.warn(`[seed:services] Could not set relatedServices for ${s.slug} (link in Admin if needed):`, e);
        }
      }
    }
    strapi.log.info("[seed:services] Created 4 services (relations best-effort).");
  }

  const svcTitle = "Our Services";
  const svcSub = "Comprehensive GCC-approved medical services for overseas employment and travel certification.";
  const svcDeck = await uploadHeroSlideItems(strapi, "services", repeatSlideCopy(SLIDE_POOL.length, svcTitle, svcSub));
  await upsertHero(strapi, "services", svcTitle, svcSub, svcDeck, [
    { label: "Book Appointment", href: "/book", variant: "primary" },
  ]);

  const existingSvcFaqs = await strapi.documents(FAQ_UID).findMany({
    filters: { sitePage: { page: { $eq: "services" } } },
    limit: 1,
  });
  const servicesHeroRows = await strapi.documents(HERO_UID).findMany({
    filters: { page: { $eq: "services" } },
    limit: 1,
  });
  const servicesHeroDocId = (servicesHeroRows[0] as { documentId?: string } | undefined)?.documentId;

  if (existingSvcFaqs.length === 0 && servicesHeroDocId) {
    const servicesFaqDefs = [
      {
        question: "What documents do I need for a GCC medical checkup?",
        answer:
          "You will need your valid passport (original and copy), 2 passport-size photos, and your GAMCA slip or token number. If you have previous medical reports, please bring those as well.",
        order: 0,
      },
      {
        question: "How long does the complete medical screening take?",
        answer:
          "The complete screening including physical examination, radiology, lab tests, and vaccination typically takes 2–3 hours. Reports are delivered within 24 hours.",
        order: 1,
      },
      {
        question: "Do I need to fast before the medical checkup?",
        answer:
          "Yes, we recommend 8–12 hours of fasting before your appointment for accurate blood test results. You may drink water during the fasting period.",
        order: 2,
      },
      {
        question: "What lab tests are included in the screening?",
        answer:
          "Our lab panel includes Biochemistry (R.B.S, L.F.T, Creatinine), Immunology, Hematology, Serology (HIV I&II, HBs Ag, Anti HCV, VDRL, TPHA if VDRL positive, Pregnancy), and Clinical Pathology (Urine and Stool analysis).",
        order: 3,
      },
      {
        question: "Which vaccinations are required for GCC countries?",
        answer:
          "MMR (Measles, Mumps, Rubella) in two doses and Meningococcal vaccination are required. Our team will advise on the specific requirements for your destination country.",
        order: 4,
      },
      {
        question: "Is your center approved by GAMCA?",
        answer:
          "Yes, Unicare Medical is fully approved by GAMCA (GCC Approved Medical Centers Association) and all GCC health ministries including Saudi Arabia, UAE, Kuwait, Qatar, Bahrain, and Oman.",
        order: 5,
      },
      {
        question: "Can I check my report online?",
        answer:
          "Yes, you can check your medical report status online through our Report Search portal accessible from the navigation menu. You'll need your Patient ID and registered phone number.",
        order: 6,
      },
    ];
    for (const f of servicesFaqDefs) {
      await strapi.documents(FAQ_UID).create({
        data: { ...f, sitePage: servicesHeroDocId } as any,
        status: "published",
      });
    }
    strapi.log.info("[seed:services] Seeded FAQs linked to Hero (page=services).");
  }

  strapi.log.info("[seed:services] Done. GET /api/services?populate=*");
}

// ── Phase: about ───────────────────────────────────────────────

async function enrichAboutMedia(strapi: Core.Strapi) {
  const docs = await strapi.documents(ABOUT_UID).findMany({ limit: 1 });
  if (docs.length === 0) return;
  const doc = docs[0] as { documentId: string; missionImage?: unknown; centerImage?: unknown };
  const mid = "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&h=400&fit=crop";
  const cid = "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&h=400&fit=crop";
  const patch: Record<string, number> = {};
  if (!hasMediaField(doc.missionImage)) {
    patch.missionImage = await uploadImageFromUrl(strapi, mid, "about-mission.jpg", "Mission");
  }
  if (!hasMediaField(doc.centerImage)) {
    patch.centerImage = await uploadImageFromUrl(strapi, cid, "about-center.jpg", "Our center");
  }
  if (Object.keys(patch).length) {
    await strapi.documents(ABOUT_UID).update({
      documentId: doc.documentId,
      data: patch as any,
      status: "published",
    });
    strapi.log.info("[seed:about] Attached mission/center images.");
  }

  const heroes = await strapi.documents(HERO_UID).findMany({ filters: { page: { $eq: "about" } }, limit: 1 });
  if (heroes.length > 0) {
    const hid = (heroes[0] as { documentId: string }).documentId;
    const h = heroes[0] as { title?: string; subtitle?: string };
    const t = String(h.title ?? "About Us");
    const sub = String(h.subtitle ?? "Delivering trusted, GCC-approved medical services in Dhaka.");
    const deck = await uploadHeroSlideItems(strapi, "about", repeatSlideCopy(SLIDE_POOL.length, t, sub));
    await strapi.documents(HERO_UID).update({
      documentId: hid,
      data: {
        slideItems: deck.map((s) => ({
          image: s.imageId,
          title: s.title,
          text: s.text,
          ctaButtons: [
            { label: "Book Appointment", href: "/book", variant: "primary" },
            { label: "Our Services", href: "/services", variant: "secondary" },
          ],
        })),
      } as any,
      status: "published",
    });
    strapi.log.info("[seed:about] Hero slideItems updated.");
  }
}

async function seedAboutPhase(strapi: Core.Strapi) {
  strapi.log.info("[seed:about] About page + hero media…");
  await runAboutSeed(strapi);
  await enrichAboutMedia(strapi);
  strapi.log.info("[seed:about] Done. GET /api/about-page?populate=*");
}

// ── Phase: contact ─────────────────────────────────────────────

async function seedContactPhase(strapi: Core.Strapi) {
  const t = "Contact Us";
  const sub = "We're here to help. Reach out for appointments, inquiries, or assistance.";
  const deck = await uploadHeroSlideItems(strapi, "contact", repeatSlideCopy(SLIDE_POOL.length, t, sub));
  await upsertHero(strapi, "contact", t, sub, deck, [{ label: "Book Appointment", href: "/book", variant: "primary" }]);
  strapi.log.info("[seed:contact] Done. GET /api/heroes?filters[page][$eq]=contact");
}

// ── Phase: fitness ─────────────────────────────────────────────

const FITNESS_GROUPS = [
  {
    category: "Infectious Diseases — Must Be Negative / Non-Reactive",
    description: "Candidates must test negative for the following infectious diseases.",
    items: JSON.stringify(["HIV / AIDS", "HBs Ag", "Anti-HCV", "Malaria & Microfilaria", "Leprosy", "Tuberculosis", "Syphilis (VDRL / TPHA)"]),
    order: 0,
  },
  {
    category: "Non-Infectious Conditions — Must Be Clear",
    description: "Candidates must not have the following non-infectious conditions.",
    items: JSON.stringify([
      "No Chronic Renal Failure",
      "No Chronic Hepatic Failure",
      "No Congestive Heart Failure",
      "No Uncontrolled Hypertension",
    ]),
    order: 1,
  },
  {
    category: "Physical Fitness Requirements",
    description: "Candidates must meet basic physical fitness standards.",
    items: JSON.stringify(["No physical deformities affecting work", "Adequate visual acuity", "Normal hearing", "Adequate musculoskeletal function"]),
    order: 2,
  },
];

async function seedFitnessPhase(strapi: Core.Strapi) {
  if ((await count(strapi, FITNESS_UID)) === 0) {
    for (const row of FITNESS_GROUPS) {
      await strapi.documents(FITNESS_UID).create({ data: row as any, status: "published" });
    }
  }
  const t = "Fitness Criteria";
  const sub = "Health requirements for overseas employment certification.";
  const deck = await uploadHeroSlideItems(strapi, "fitness", repeatSlideCopy(SLIDE_POOL.length, t, sub));
  await upsertHero(strapi, "fitness", t, sub, deck, [{ label: "Book Appointment", href: "/book", variant: "primary" }]);
  strapi.log.info("[seed:fitness] Done. GET /api/fitness-criteria?populate=*");
}

// ── Phase: equipment ───────────────────────────────────────────

async function seedEquipmentPhase(strapi: Core.Strapi) {
  if ((await count(strapi, EQUIP_UID)) === 0) {
    const rows = [
      {
        slNo: "01",
        name: "Digital X-ray with DR Machine (DRGEM-KOREA)",
        model: "GXR-40S",
        qty: "1 Set",
        origin: "Korea",
        status: "OPERATIONAL",
        img: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&h=400&fit=crop",
      },
      {
        slNo: "02",
        name: "Biochemistry Analyzer (Auto)",
        model: "Dimension EXL",
        qty: "1 Set",
        origin: "USA",
        status: "OPERATIONAL",
        img: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&h=400&fit=crop",
      },
      {
        slNo: "03",
        name: "Hematology Machine",
        model: "Mythic-18",
        qty: "1 Set",
        origin: "Japan",
        status: "OPERATIONAL",
        img: "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=600&h=400&fit=crop",
      },
    ];
    for (const r of rows) {
      const fid = await uploadImageFromUrl(strapi, r.img, `equipment-${r.slNo}.jpg`, r.name);
      await strapi.documents(EQUIP_UID).create({
        data: {
          slNo: r.slNo,
          name: r.name,
          model: r.model,
          qty: r.qty,
          origin: r.origin,
          status: r.status,
          image: fid,
        } as any,
        status: "published",
      });
    }
    for (const r of [
      { slNo: "04", name: "Immunology ELISA Full Set", model: "Evolis Twin Plus", qty: "1 Set", origin: "France", status: "OPERATIONAL" },
      { slNo: "05", name: "Semi Auto Urine Chemistry Analyzer", model: "Docureader 2", qty: "1 Set" },
    ]) {
      await strapi.documents(EQUIP_UID).create({ data: r as any, status: "published" });
    }
  }
  const t = "Medical Equipment";
  const sub = "State-of-the-art medical equipment ensuring precision, speed, and reliability in diagnostics.";
  const deck = await uploadHeroSlideItems(strapi, "equipment", repeatSlideCopy(SLIDE_POOL.length, t, sub));
  await upsertHero(strapi, "equipment", t, sub, deck, [{ label: "Book Appointment", href: "/book", variant: "primary" }]);
  strapi.log.info("[seed:equipment] Done. GET /api/equipment-items?populate=*");
}

/** Post categories (blog/news scopes) + default author for seeded articles/news. */
async function ensureBlogNewsTaxonomy(strapi: Core.Strapi): Promise<{ authorDocumentId?: string }> {
  if ((await count(strapi, POST_CATEGORY_UID)) === 0) {
    const newsSeeds = [
      { name: "Announcement", slug: "announcement", sortOrder: 0 },
      { name: "Equipment", slug: "equipment", sortOrder: 1 },
      { name: "Regulation", slug: "regulation", sortOrder: 2 },
      { name: "Notice", slug: "notice", sortOrder: 3 },
      { name: "Guide", slug: "guide-news", sortOrder: 4 },
    ];
    for (const s of newsSeeds) {
      await strapi.documents(POST_CATEGORY_UID).create({
        data: { name: s.name, slug: s.slug, scope: "news", sortOrder: s.sortOrder } as any,
        status: "published",
      });
    }
    const blogSeeds = [
      { name: "Guide", slug: "guide", sortOrder: 0 },
      { name: "Tips", slug: "tips", sortOrder: 1 },
      { name: "Education", slug: "education", sortOrder: 2 },
      { name: "Technology", slug: "technology", sortOrder: 3 },
    ];
    for (const s of blogSeeds) {
      await strapi.documents(POST_CATEGORY_UID).create({
        data: { name: s.name, slug: s.slug, scope: "blog", sortOrder: s.sortOrder } as any,
        status: "published",
      });
    }
    strapi.log.info("[seed:taxonomy] Created post categories (blog + news scopes).");
  }

  let authorDocumentId: string | undefined;
  if ((await count(strapi, AUTHOR_UID)) === 0) {
    const a = await strapi.documents(AUTHOR_UID).create({
      data: {
        name: "Unicare Editorial",
        slug: "unicare-editorial",
        bio: "Clinic communications and medical education team.",
      } as any,
      status: "published",
    });
    authorDocumentId = (a as { documentId?: string }).documentId;
    strapi.log.info("[seed:taxonomy] Created default author.");
  } else {
    const authors = await strapi.documents(AUTHOR_UID).findMany({ limit: 1 });
    authorDocumentId = (authors[0] as { documentId?: string })?.documentId;
  }

  const navs = await strapi.documents(NAV_UID).findMany({ limit: 200 });
  const hasBlog = (navs as Array<{ href?: string }>).some((n) => n.href === "/blog");
  if (!hasBlog) {
    await strapi.documents(NAV_UID).create({
      data: { label: "Blog", href: "/blog", order: 5 } as any,
      status: "published",
    });
    strapi.log.info("[seed:taxonomy] Added Blog navigation link.");
  }

  return { authorDocumentId };
}

function newsCategoryDocumentId(
  allCats: Array<{ name?: string; scope?: string; documentId?: string }>,
  label: string
): string | undefined {
  const row = allCats.find((c) => c.scope === "news" && c.name === label);
  return row?.documentId;
}

function blogCategoryDocumentId(
  allCats: Array<{ name?: string; scope?: string; documentId?: string }>,
  label: string
): string | undefined {
  const row = allCats.find((c) => c.scope === "blog" && c.name === label);
  return row?.documentId;
}

// ── Phase: news ────────────────────────────────────────────────

async function seedNewsPhase(strapi: Core.Strapi) {
  const { authorDocumentId } = await ensureBlogNewsTaxonomy(strapi);
  const allCats = (await strapi.documents(POST_CATEGORY_UID).findMany({ limit: 200 })) as Array<{
    name?: string;
    scope?: string;
    documentId?: string;
  }>;

  if ((await count(strapi, NEWS_UID)) === 0) {
    const posts = [
      {
        title: "GAMCA Online Appointment System Updated for 2026",
        slug: "gamca-online-appointment-system-update",
        excerpt: "The GCC Approved Medical Centers' Association has rolled out a new streamlined appointment booking portal effective April 2026.",
        date: "2026-04-10",
        category: "Announcement",
        img: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop",
      },
      {
        title: "Unicare Installs Latest Digital X-Ray System",
        slug: "new-digital-xray-machine-installed",
        excerpt: "We have upgraded our radiology department with a state-of-the-art digital X-ray system.",
        date: "2026-04-02",
        category: "Equipment",
        img: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&h=500&fit=crop",
      },
      {
        title: "Saudi Arabia Updates Visa Medical Requirements",
        slug: "saudi-visa-medical-requirements-2026",
        excerpt: "New medical test additions for Saudi work visa applicants starting May 2026.",
        date: "2026-03-25",
        category: "Regulation",
        img: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&h=500&fit=crop",
      },
    ];
    let i = 0;
    for (const p of posts) {
      const imgId = await uploadImageFromUrl(strapi, p.img, `${p.slug}.jpg`, p.title);
      const postCat = newsCategoryDocumentId(allCats, p.category);
      await strapi.documents(NEWS_UID).create({
        data: {
          title: p.title,
          slug: p.slug,
          excerpt: p.excerpt,
          date: p.date,
          ...(postCat ? { postCategory: postCat } : {}),
          ...(authorDocumentId ? { author: authorDocumentId } : {}),
          image: imgId,
          content: richtext(`${p.excerpt} Full article body placeholder.`),
          isFeatured: i === 0,
          commentsOpen: true,
        } as any,
        status: "published",
      });
      i += 1;
    }
  }
  const t = "News & Updates";
  const sub = "Stay informed with the latest announcements, regulatory changes, and clinic updates.";
  const deck = await uploadHeroSlideItems(strapi, "news", repeatSlideCopy(SLIDE_POOL.length, t, sub));
  await upsertHero(strapi, "news", t, sub, deck, [{ label: "Book Appointment", href: "/book", variant: "primary" }]);
  strapi.log.info("[seed:news] Done. GET /api/news-posts?populate=*");
}

// ── Phase: blog ─────────────────────────────────────────────────

async function seedBlogPhase(strapi: Core.Strapi) {
  const { authorDocumentId } = await ensureBlogNewsTaxonomy(strapi);
  const allCats = (await strapi.documents(POST_CATEGORY_UID).findMany({ limit: 200 })) as Array<{
    name?: string;
    scope?: string;
    documentId?: string;
  }>;

  if ((await count(strapi, ARTICLE_UID)) === 0) {
    const articles = [
      {
        title: "Complete Guide to GCC Medical Screening",
        slug: "gcc-medical-screening-guide",
        excerpt: "Everything you need to know about the medical screening process for overseas employment in GCC countries.",
        date: "2026-04-05",
        category: "Guide",
        img: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&h=500&fit=crop",
      },
      {
        title: "How to Prepare for Your Medical Checkup",
        slug: "preparing-for-medical-checkup",
        excerpt: "Tips and steps to follow before your medical examination.",
        date: "2026-03-20",
        category: "Tips",
        img: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800&h=500&fit=crop",
      },
      {
        title: "Understanding Your Lab Test Results",
        slug: "understanding-lab-results",
        excerpt: "A simplified breakdown of common lab tests included in GCC medical screening.",
        date: "2026-03-10",
        category: "Education",
        img: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&h=500&fit=crop",
      },
    ];
    let j = 0;
    for (const a of articles) {
      const imgId = await uploadImageFromUrl(strapi, a.img, `${a.slug}.jpg`, a.title);
      const postCat = blogCategoryDocumentId(allCats, a.category);
      await strapi.documents(ARTICLE_UID).create({
        data: {
          title: a.title,
          slug: a.slug,
          excerpt: a.excerpt,
          date: a.date,
          ...(postCat ? { postCategory: postCat } : {}),
          ...(authorDocumentId ? { author: authorDocumentId } : {}),
          image: imgId,
          content: richtext(`${a.excerpt} Detailed article content placeholder.`),
          isFeatured: j === 0,
          commentsOpen: true,
        } as any,
        status: "published",
      });
      j += 1;
    }
  }
  const t = "Health Resources";
  const sub = "Articles, guides, and tips to help you prepare for your medical screening.";
  const deck = await uploadHeroSlideItems(strapi, "blog", repeatSlideCopy(SLIDE_POOL.length, t, sub));
  await upsertHero(strapi, "blog", t, sub, deck, [{ label: "Book Appointment", href: "/book", variant: "primary" }]);
  strapi.log.info("[seed:blog] Done. GET /api/articles?populate=*");
}

// ── Orchestrator ─────────────────────────────────────────────────

const PHASE_ORDER = [
  "layout",
  "home",
  "services",
  "about",
  "contact",
  "fitness",
  "equipment",
  "news",
  "blog",
] as const;

type Phase = (typeof PHASE_ORDER)[number];

function parsePhase(strapi: Core.Strapi): Phase[] {
  const raw = (process.env.SEED_PHASE || "layout").trim().toLowerCase();
  if (raw === "all" || raw === "*") return [...PHASE_ORDER];
  if (PHASE_ORDER.includes(raw as Phase)) return [raw as Phase];
  strapi.log.warn(`[seed] Unknown SEED_PHASE="${raw}". Valid: ${PHASE_ORDER.join(", ")}, all. Defaulting to layout.`);
  return ["layout"];
}

export async function runPhasedContentSeed(strapi: Core.Strapi) {
  const phases = parsePhase(strapi);
  strapi.log.info(
    `[seed] SEED_PHASE=${process.env.SEED_PHASE || "layout"} → running: ${phases.join(" → ")} (set SEED_PHASE=all for everything)`
  );

  try {
    await ensureFaqSitePageLinks(strapi);
    for (const phase of phases) {
      strapi.log.info(`[seed] ---------- ${phase} ----------`);
      switch (phase) {
        case "layout":
          await seedLayoutPhase(strapi);
          break;
        case "home":
          await seedHomePhase(strapi);
          break;
        case "services":
          await seedServicesPhase(strapi);
          break;
        case "about":
          await seedAboutPhase(strapi);
          break;
        case "contact":
          await seedContactPhase(strapi);
          break;
        case "fitness":
          await seedFitnessPhase(strapi);
          break;
        case "equipment":
          await seedEquipmentPhase(strapi);
          break;
        case "news":
          await seedNewsPhase(strapi);
          break;
        case "blog":
          await seedBlogPhase(strapi);
          break;
        default:
          break;
      }
    }
    await ensureFaqSitePageLinks(strapi);
  } catch (err) {
    strapi.log.error("[seed] Phased content seed failed:", err);
  }
}
