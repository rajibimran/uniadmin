import type { Core } from "@strapi/strapi";
import { uploadImageFromUrl } from "./upload-from-url";

const ABOUT_UID = "api::about-page.about-page" as any;
const HERO_UID = "api::hero.hero" as any;

const MISSION_TEXT =
  "At Unicare Medical, our mission is to provide accurate, efficient, and compassionate medical screening services that meet international standards. We are committed to helping individuals achieve their dreams of overseas employment through reliable health certification, while maintaining the highest levels of patient care and clinical excellence.";

const CENTER_TEXT =
  "Our diagnostic center is supervised by a team of highly qualified specialist doctors ensuring that every medical report is verified with professional clinical oversight. Our medical panel includes Medical Officers (Male & Female), Radiologists, and Consultant Pathologists — all dedicated to maintaining the highest standards of medical practice.";

const GALLERY_SOURCES = [
  { url: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&h=400&fit=crop", alt: "Reception area" },
  { url: "https://images.unsplash.com/photo-1581595220892-b0739db3ba8c?w=600&h=600&fit=crop", alt: "Laboratory equipment" },
  { url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&h=400&fit=crop", alt: "X-ray room" },
  { url: "https://images.unsplash.com/photo-1631815588090-d4bfec5b1ccb?w=600&h=600&fit=crop", alt: "Examination room" },
  { url: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&h=400&fit=crop", alt: "Sample collection area" },
  { url: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=600&h=400&fit=crop", alt: "Patient waiting area" },
];

const VALUES_SOURCES = [
  {
    title: "Precision",
    desc: "Automated systems minimize human error in chemical and biological analysis.",
    alt: "Precision diagnostics",
    url: "https://images.unsplash.com/photo-1582719471384-894fbb16e074?w=400&h=250&fit=crop",
  },
  {
    title: "Speed",
    desc: "High-throughput analyzers allow us to process thousands of samples daily.",
    alt: "Fast processing",
    url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=400&h=250&fit=crop",
  },
  {
    title: "Reliability",
    desc: "Daily QC/Calibration and regular maintenance for consistency.",
    alt: "Reliable results",
    url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=400&h=250&fit=crop",
  },
];

async function seedAboutPage(strapi: Core.Strapi) {
  const docs = await strapi.documents(ABOUT_UID).findMany({});
  if (docs.length > 0) return;

  const gallery: { image: number; alt: string }[] = [];
  let i = 0;
  for (const g of GALLERY_SOURCES) {
    const fid = await uploadImageFromUrl(strapi, g.url, `about-gallery-${i++}.jpg`, g.alt);
    gallery.push({ image: fid, alt: g.alt });
  }

  const values: { title: string; desc: string; alt: string; img: number }[] = [];
  i = 0;
  for (const v of VALUES_SOURCES) {
    const fid = await uploadImageFromUrl(strapi, v.url, `about-value-${i++}.jpg`, v.alt);
    values.push({ title: v.title, desc: v.desc, alt: v.alt, img: fid });
  }

  await strapi.documents(ABOUT_UID).create({
    data: {
      missionTitle: "Our Mission",
      missionText: MISSION_TEXT,
      centerTitle: "Our Center",
      centerText: CENTER_TEXT,
      valuesSectionTitle: "Why Choose Us",
      facilityGalleryTitle: "Facilities & Gallery",
      facilityGallerySubtitle:
        "Our center is designed to provide a clean, organized, and patient-friendly environment.",
      virtualTourYoutubeUrl: "",
      values,
      gallery,
    } as any,
    status: "published",
  });

  strapi.log.info("[bootstrap] Seeded published About Page entry.");
}

async function seedAboutHero(strapi: Core.Strapi) {
  const existing = await strapi.documents(HERO_UID).findMany({
    filters: { page: { $eq: "about" } },
  });
  if (existing.length > 0) return;

  await strapi.documents(HERO_UID).create({
    data: {
      page: "about",
      title: "About Us",
      subtitle: "Delivering trusted, GCC-approved medical services in Dhaka.",
    } as any,
    status: "published",
  });

  strapi.log.info("[bootstrap] Seeded published Hero entry for page \"about\".");
}

export async function runAboutSeed(strapi: Core.Strapi) {
  try {
    await seedAboutPage(strapi);
    await seedAboutHero(strapi);
  } catch (err) {
    strapi.log.warn("[bootstrap] About seed skipped or failed:", err);
  }
}
