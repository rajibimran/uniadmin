/**
 * One-off scaffold: creates schema.json + routes/controllers/services for Strapi content APIs.
 * Run: node scripts/generate-content-apis.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..", "src", "api");

const routeTpl = (uid) => `import { factories } from "@strapi/strapi";

export default factories.createCoreRouter("${uid}" as any);
`;

const ctrlTpl = (uid) => `import { factories } from "@strapi/strapi";

export default factories.createCoreController("${uid}" as any);
`;

const svcTpl = (uid) => `import { factories } from "@strapi/strapi";

export default factories.createCoreService("${uid}" as any);
`;

const apis = [
  {
    folder: "navigation",
    uid: "api::navigation.navigation",
    singular: "navigation",
    plural: "navigations",
    collection: "navigations",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "navigations",
      info: {
        singularName: "navigation",
        pluralName: "navigations",
        displayName: "Navigation",
        description: "Main menu items",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        label: { type: "string", required: true },
        href: { type: "string", required: true },
        order: { type: "integer", "default": 0 },
        parent: {
          type: "relation",
          relation: "manyToOne",
          target: "api::navigation.navigation",
          inversedBy: "children",
        },
        children: {
          type: "relation",
          relation: "oneToMany",
          target: "api::navigation.navigation",
          mappedBy: "parent",
        },
      },
    },
  },
  {
    folder: "news-post",
    uid: "api::news-post.news-post",
    singular: "news-post",
    plural: "news-posts",
    collection: "news_posts",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "news_posts",
      info: {
        singularName: "news-post",
        pluralName: "news-posts",
        displayName: "News Post",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        title: { type: "string", required: true },
        slug: { type: "uid", targetField: "title", required: true },
        excerpt: { type: "text", required: true },
        content: { type: "richtext", required: false },
        image: { type: "media", multiple: false, required: false, allowedTypes: ["images"] },
        date: { type: "date", required: true },
        category: {
          type: "enumeration",
          enum: ["Announcement", "Equipment", "Regulation", "Notice", "Guide"],
          required: true,
        },
      },
    },
  },
  {
    folder: "article",
    uid: "api::article.article",
    singular: "article",
    plural: "articles",
    collection: "articles",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "articles",
      info: {
        singularName: "article",
        pluralName: "articles",
        displayName: "Blog Article",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        title: { type: "string", required: true },
        slug: { type: "uid", targetField: "title", required: true },
        excerpt: { type: "text", required: true },
        content: { type: "richtext", required: false },
        image: { type: "media", multiple: false, required: false, allowedTypes: ["images"] },
        date: { type: "date", required: true },
        category: {
          type: "enumeration",
          enum: ["Guide", "Tips", "Education", "Technology"],
          required: true,
        },
      },
    },
  },
  {
    folder: "country-guideline",
    uid: "api::country-guideline.country-guideline",
    singular: "country-guideline",
    plural: "country-guidelines",
    collection: "country_guidelines",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "country_guidelines",
      info: {
        singularName: "country-guideline",
        pluralName: "country-guidelines",
        displayName: "Country Guideline",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        name: { type: "string", required: true },
        countryId: { type: "string", required: true },
        flag: {
          type: "media",
          multiple: false,
          required: true,
          allowedTypes: ["images"],
        },
        processingTime: { type: "string", required: true },
        approvalNote: { type: "string", required: true },
        expertTip: { type: "text", required: true },
        mandatoryTests: { type: "text", required: true },
        rejectionCriteria: { type: "text", required: true },
        specialRules: { type: "text", required: true },
        visaCategories: { type: "text", required: true },
      },
    },
  },
  {
    folder: "gcc-country",
    uid: "api::gcc-country.gcc-country",
    singular: "gcc-country",
    plural: "gcc-countries",
    collection: "gcc_countries",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "gcc_countries",
      info: {
        singularName: "gcc-country",
        pluralName: "gcc-countries",
        displayName: "GCC Country",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        name: { type: "string", required: true },
        flag: {
          type: "media",
          multiple: false,
          required: true,
          allowedTypes: ["images"],
        },
        order: { type: "integer", "default": 0 },
      },
    },
  },
  {
    folder: "equipment-item",
    uid: "api::equipment-item.equipment-item",
    singular: "equipment-item",
    plural: "equipment-items",
    collection: "equipment_items",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "equipment_items",
      info: {
        singularName: "equipment-item",
        pluralName: "equipment-items",
        displayName: "Equipment Item",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        slNo: { type: "string", required: true },
        name: { type: "string", required: true },
        model: { type: "string", required: true },
        qty: { type: "string", required: true },
        origin: { type: "string", required: false },
        status: { type: "string", required: false },
        image: { type: "media", multiple: false, required: false, allowedTypes: ["images"] },
      },
    },
  },
  {
    folder: "fitness-criterion",
    uid: "api::fitness-criterion.fitness-criterion",
    singular: "fitness-criterion",
    plural: "fitness-criteria",
    collection: "fitness_criteria",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "fitness_criteria",
      info: {
        singularName: "fitness-criterion",
        pluralName: "fitness-criteria",
        displayName: "Fitness Criteria",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        category: { type: "string", required: true },
        description: { type: "text", required: true },
        items: { type: "json", required: true },
      },
    },
  },
  {
    folder: "stat",
    uid: "api::stat.stat",
    singular: "stat",
    plural: "stats",
    collection: "stats",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "stats",
      info: { singularName: "stat", pluralName: "stats", displayName: "Stat" },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        label: { type: "string", required: true },
        value: { type: "integer", required: true },
        suffix: { type: "string", required: true },
        order: { type: "integer", "default": 0 },
      },
    },
  },
  {
    folder: "testimonial",
    uid: "api::testimonial.testimonial",
    singular: "testimonial",
    plural: "testimonials",
    collection: "testimonials",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "testimonials",
      info: { singularName: "testimonial", pluralName: "testimonials", displayName: "Testimonial" },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        name: { type: "string", required: true },
        photo: { type: "media", multiple: false, required: false, allowedTypes: ["images"] },
        rating: { type: "integer", required: true, min: 1, max: 5 },
        quote: { type: "text", required: true },
        order: { type: "integer", "default": 0 },
      },
    },
  },
  {
    folder: "service-package",
    uid: "api::service-package.service-package",
    singular: "service-package",
    plural: "service-packages",
    collection: "service_packages",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "service_packages",
      info: {
        singularName: "service-package",
        pluralName: "service-packages",
        displayName: "Service Package",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        title: { type: "string", required: true },
        description: { type: "text", required: true },
        features: { type: "json", required: true },
        pricing: { type: "string", required: true },
        order: { type: "integer", "default": 0 },
      },
    },
  },
  {
    folder: "faq",
    uid: "api::faq.faq",
    singular: "faq",
    plural: "faqs",
    collection: "faqs",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "faqs",
      info: { singularName: "faq", pluralName: "faqs", displayName: "FAQ" },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        question: { type: "string", required: true },
        answer: { type: "text", required: true },
        order: { type: "integer", "default": 0 },
      },
    },
  },
  {
    folder: "certification",
    uid: "api::certification.certification",
    singular: "certification",
    plural: "certifications",
    collection: "certifications",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "certifications",
      info: { singularName: "certification", pluralName: "certifications", displayName: "Certification" },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        name: { type: "string", required: true },
        logo: { type: "media", multiple: false, required: false, allowedTypes: ["images"] },
        order: { type: "integer", "default": 0 },
      },
    },
  },
  {
    folder: "footer-quick-link",
    uid: "api::footer-quick-link.footer-quick-link",
    singular: "footer-quick-link",
    plural: "footer-quick-links",
    collection: "footer_quick_links",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "footer_quick_links",
      info: {
        singularName: "footer-quick-link",
        pluralName: "footer-quick-links",
        displayName: "Footer Quick Link",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        label: { type: "string", required: true },
        href: { type: "string", required: true },
        order: { type: "integer", "default": 0 },
      },
    },
  },
  {
    folder: "footer-service-link",
    uid: "api::footer-service-link.footer-service-link",
    singular: "footer-service-link",
    plural: "footer-service-links",
    collection: "footer_service_links",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "footer_service_links",
      info: {
        singularName: "footer-service-link",
        pluralName: "footer-service-links",
        displayName: "Footer Service Link",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        label: { type: "string", required: true },
        href: { type: "string", required: true },
        order: { type: "integer", "default": 0 },
      },
    },
  },
  {
    folder: "gallery-image",
    uid: "api::gallery-image.gallery-image",
    singular: "gallery-image",
    plural: "gallery-images",
    collection: "gallery_images",
    kind: "collectionType",
    schema: {
      kind: "collectionType",
      collectionName: "gallery_images",
      info: {
        singularName: "gallery-image",
        pluralName: "gallery-images",
        displayName: "Gallery Image",
      },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        image: { type: "media", multiple: false, required: true, allowedTypes: ["images"] },
        alt: { type: "string", required: true },
        order: { type: "integer", "default": 0 },
      },
    },
  },
];

for (const def of apis) {
  const base = path.join(root, def.folder);
  const ct = path.join(base, "content-types", def.singular);
  fs.mkdirSync(ct, { recursive: true });
  fs.mkdirSync(path.join(base, "routes"), { recursive: true });
  fs.mkdirSync(path.join(base, "controllers"), { recursive: true });
  fs.mkdirSync(path.join(base, "services"), { recursive: true });

  fs.writeFileSync(path.join(ct, "schema.json"), JSON.stringify(def.schema, null, 2));
  fs.writeFileSync(path.join(base, "routes", `${def.singular}.ts`), routeTpl(def.uid));
  fs.writeFileSync(path.join(base, "controllers", `${def.singular}.ts`), ctrlTpl(def.uid));
  fs.writeFileSync(path.join(base, "services", `${def.singular}.ts`), svcTpl(def.uid));
}

console.log("Wrote", apis.length, "APIs under", root);
