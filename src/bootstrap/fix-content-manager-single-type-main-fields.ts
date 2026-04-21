import type { Core } from "@strapi/strapi";

/**
 * Strapi persists Content Manager `settings.mainField` in core-store. Older configs
 * can keep `documentId` as mainField because sync treats it as sortable and never
 * replaces it with `entryTitle`. Schema `default` does not backfill existing rows,
 * so `entryTitle` can stay empty and the admin header falls back to the document id.
 */
const SINGLE_TYPE_UIDS = [
  "api::booking-page.booking-page",
  "api::services-page.services-page",
  "api::fitness-page.fitness-page",
] as const;

const MAIN_FIELD = "entryTitle";

const DEFAULT_ENTRY_TITLE: Record<(typeof SINGLE_TYPE_UIDS)[number], string> = {
  "api::booking-page.booking-page": "Booking Page",
  "api::services-page.services-page": "Services Page",
  "api::fitness-page.fitness-page": "Fitness Page",
};

type DocRow = { documentId?: string; entryTitle?: string | null };

function entryTitleIsEmpty(value: unknown) {
  return value == null || String(value).trim() === "";
}

async function backfillEntryTitleIfEmpty(strapi: Core.Strapi, uid: (typeof SINGLE_TYPE_UIDS)[number]) {
  const defaultTitle = DEFAULT_ENTRY_TITLE[uid];
  if (!strapi.contentTypes[uid]?.attributes?.[MAIN_FIELD]) return;

  for (const status of ["draft", "published"] as const) {
    let docs: DocRow[];
    try {
      docs = (await strapi.documents(uid).findMany({ status, limit: 10 })) as DocRow[];
    } catch {
      continue;
    }
    for (const doc of docs) {
      if (!doc.documentId || !entryTitleIsEmpty(doc.entryTitle)) continue;
      await strapi.documents(uid).update({
        documentId: doc.documentId,
        data: { [MAIN_FIELD]: defaultTitle },
        status,
      });
      strapi.log.info(
        `[content-manager] ${uid} (${status}): filled empty ${MAIN_FIELD} → "${defaultTitle}"`,
      );
    }
  }
}

export async function fixContentManagerSingleTypeMainFields(strapi: Core.Strapi) {
  const cm = strapi.plugin("content-manager").service("content-types");

  for (const uid of SINGLE_TYPE_UIDS) {
    await backfillEntryTitleIfEmpty(strapi, uid);

    const contentType = strapi.contentTypes[uid];
    if (!contentType?.attributes?.[MAIN_FIELD]) continue;

    const conf = await cm.findConfiguration(contentType);
    const settings = conf.settings ?? {};

    let defaultSortBy = settings.defaultSortBy;
    if (
      defaultSortBy === "documentId" ||
      defaultSortBy === "id" ||
      defaultSortBy == null ||
      defaultSortBy === ""
    ) {
      defaultSortBy = MAIN_FIELD;
    }

    if (settings.mainField === MAIN_FIELD && settings.defaultSortBy === defaultSortBy) {
      continue;
    }

    await cm.updateConfiguration(contentType, {
      ...conf,
      settings: {
        ...settings,
        mainField: MAIN_FIELD,
        defaultSortBy,
      },
    });

    strapi.log.info(
      `[content-manager] ${uid}: mainField "${String(settings.mainField)}" → "${MAIN_FIELD}", defaultSortBy → "${String(defaultSortBy)}"`,
    );
  }
}
