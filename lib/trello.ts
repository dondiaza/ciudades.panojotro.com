import "server-only";

import { unstable_cache } from "next/cache";

import { env } from "@/lib/env";
import type {
  CityResolutionMode,
  DashboardStats,
  DueCategory,
  LabelCounter,
  TrelloCustomFieldScalar,
  TrelloCustomFieldValue,
  TrelloDashboardData,
  TrelloDesign,
  TrelloLabel,
} from "@/types/trello";

const TRELLO_BASE_URL = "https://api.trello.com/1";
export const TRELLO_DASHBOARD_TAG = "trello-dashboard";

const WORKFLOW_HINTS = [
  "backlog",
  "todo",
  "to do",
  "doing",
  "done",
  "review",
  "qa",
  "pendiente",
  "en progreso",
  "hecho",
  "bloqueado",
];

const UNDEFINED_LABEL_HINTS = [
  "indefinido",
  "indefinida",
  "undefined",
  "sin definir",
];

const DESIGNER_FIELD_HINTS = [
  "disenador",
  "designer",
  "autor",
  "author",
  "artista",
  "illustrator",
];

class TrelloApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "TrelloApiError";
    this.status = status;
  }
}

interface TrelloListRaw {
  id: string;
  name: string;
  closed: boolean;
  pos: number;
}

interface TrelloCustomFieldOptionRaw {
  id: string;
  value?: {
    text?: string;
  };
}

interface TrelloCustomFieldRaw {
  id: string;
  name: string;
  type: string;
  options?: TrelloCustomFieldOptionRaw[];
}

interface TrelloCustomFieldItemRaw {
  idCustomField: string;
  idValue?: string;
  value?: Record<string, string>;
}

interface TrelloMemberRaw {
  id: string;
  fullName: string;
  username: string;
}

interface TrelloAttachmentRaw {
  id: string;
  name: string;
  url: string;
  mimeType?: string | null;
}

interface TrelloCheckItemRaw {
  id: string;
  name: string;
  state: "complete" | "incomplete";
  due: string | null;
  dueComplete: boolean;
  idMember?: string;
  pos: number;
}

interface TrelloChecklistRaw {
  id: string;
  name: string;
  checkItems: TrelloCheckItemRaw[];
}

interface TrelloCardRaw {
  id: string;
  name: string;
  desc: string;
  shortUrl: string;
  url: string;
  idAttachmentCover?: string | null;
  idList: string;
  labels: TrelloLabel[];
  idMembers: string[];
  members?: TrelloMemberRaw[];
  due: string | null;
  dueComplete: boolean;
  attachments?: TrelloAttachmentRaw[];
  checklists?: TrelloChecklistRaw[];
  customFieldItems?: TrelloCustomFieldItemRaw[];
  dateLastActivity: string | null;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toIsoOrNull(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

function inferCreationDateFromCardId(cardId: string): string | null {
  const unixSeconds = Number.parseInt(cardId.slice(0, 8), 16);
  if (!Number.isFinite(unixSeconds)) {
    return null;
  }

  return new Date(unixSeconds * 1000).toISOString();
}

function getDueCategory(
  due: string | null,
  dueComplete: boolean,
  upcomingDays: number,
): DueCategory {
  if (!due) {
    return "noDue";
  }

  const dueTime = new Date(due).getTime();
  if (Number.isNaN(dueTime)) {
    return "none";
  }

  if (!dueComplete && dueTime < Date.now()) {
    return "overdue";
  }

  const upcomingWindow = Date.now() + upcomingDays * 24 * 60 * 60 * 1000;
  if (!dueComplete && dueTime >= Date.now() && dueTime <= upcomingWindow) {
    return "upcoming";
  }

  return "none";
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function normalizeToken(value: string): string {
  return normalizeName(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function isUndefinedLabel(label: TrelloLabel): boolean {
  const normalized = normalizeToken(label.name);
  return UNDEFINED_LABEL_HINTS.some((hint) => normalized.includes(hint));
}

function looksImageAttachment(attachment: TrelloAttachmentRaw): boolean {
  if (attachment.mimeType?.startsWith("image/")) {
    return true;
  }

  const candidate = `${attachment.name} ${attachment.url}`.toLowerCase();
  return /\.(png|jpe?g|gif|webp|avif|bmp|svg)(?:\?|$)/i.test(candidate);
}

function pickCoverImageUrl(card: TrelloCardRaw): string | null {
  const attachments = card.attachments ?? [];
  if (card.idAttachmentCover) {
    const coverAttachment = attachments.find(
      (attachment) => attachment.id === card.idAttachmentCover,
    );
    if (coverAttachment && looksImageAttachment(coverAttachment)) {
      return coverAttachment.url;
    }
  }

  const firstImage = attachments.find((attachment) => looksImageAttachment(attachment));
  return firstImage?.url ?? null;
}

function uniqueNonEmpty(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function looksWorkflowList(listName: string): boolean {
  const normalized = normalizeName(listName);
  return WORKFLOW_HINTS.some((hint) => normalized.includes(hint));
}

function pickCityField(
  customFields: TrelloCustomFieldRaw[],
): TrelloCustomFieldRaw | undefined {
  const configuredName = normalizeName(env.CITY_FIELD_NAME);
  const exactMatch = customFields.find(
    (field) => normalizeName(field.name) === configuredName,
  );
  if (exactMatch) {
    return exactMatch;
  }

  return customFields.find((field) => {
    const normalized = normalizeName(field.name);
    return normalized.includes("ciudad") || normalized.includes("city");
  });
}

function pickCityMode(
  lists: TrelloListRaw[],
  cards: TrelloCardRaw[],
  cityField: TrelloCustomFieldRaw | undefined,
): CityResolutionMode {
  const hasNamedLabels = cards.some((card) =>
    card.labels.some((label) => normalizeName(label.name).length > 0),
  );

  const hasCityFieldValues =
    cityField &&
    cards.some((card) =>
      (card.customFieldItems ?? []).some(
        (item) => item.idCustomField === cityField.id,
      ),
    );

  if (env.CITY_MODE === "list") {
    if (!lists.length) {
      throw new Error("CITY_MODE=list configurado pero el tablero no tiene listas.");
    }
    return "list";
  }

  if (env.CITY_MODE === "customField") {
    if (!cityField) {
      throw new Error(
        `CITY_MODE=customField configurado pero no existe el campo "${env.CITY_FIELD_NAME}".`,
      );
    }
    return "customField";
  }

  if (env.CITY_MODE === "label") {
    if (!hasNamedLabels) {
      throw new Error(
        "CITY_MODE=label configurado pero no hay etiquetas con nombre en las cards.",
      );
    }
    return "label";
  }

  const hasLists = lists.length > 0;
  const workflowLikeLists = lists.filter((list) => looksWorkflowList(list.name)).length;
  const mostlyWorkflow = hasLists && workflowLikeLists >= Math.ceil(lists.length / 2);

  if (hasLists && !mostlyWorkflow) {
    return "list";
  }

  if (hasCityFieldValues) {
    return "customField";
  }

  if (hasNamedLabels) {
    return "label";
  }

  if (hasLists) {
    return "list";
  }

  if (cityField) {
    return "customField";
  }

  throw new Error(
    "No se pudo determinar el modo de ciudad automáticamente. Configura CITY_MODE en ENV.",
  );
}

function getCustomFieldScalarValue(
  field: TrelloCustomFieldRaw | undefined,
  item: TrelloCustomFieldItemRaw,
): TrelloCustomFieldScalar {
  if (field?.type === "list") {
    const option = field.options?.find((currentOption) => currentOption.id === item.idValue);
    return option?.value?.text ?? item.idValue ?? null;
  }

  const rawValue = item.value ?? {};
  const text = rawValue.text;
  const number = rawValue.number;
  const date = rawValue.date;
  const checked = rawValue.checked;

  if (typeof text === "string") {
    return text;
  }

  if (typeof number === "string") {
    const parsed = Number(number);
    return Number.isFinite(parsed) ? parsed : number;
  }

  if (typeof date === "string") {
    return date;
  }

  if (typeof checked === "string") {
    return checked === "true";
  }

  return null;
}

function normalizeCustomFields(
  items: TrelloCustomFieldItemRaw[],
  fieldMap: Map<string, TrelloCustomFieldRaw>,
): TrelloCustomFieldValue[] {
  return items.map((item) => {
    const field = fieldMap.get(item.idCustomField);
    return {
      fieldId: item.idCustomField,
      fieldName: field?.name ?? item.idCustomField,
      fieldType: field?.type ?? "unknown",
      value: getCustomFieldScalarValue(field, item),
      rawValue: item.value ?? item.idValue ?? null,
    };
  });
}

function extractDesigners(
  members: TrelloMemberRaw[],
  customFields: TrelloCustomFieldValue[],
): string[] {
  const memberNames = members
    .map((member) => member.fullName || member.username)
    .filter((value) => value && value.trim().length > 0);

  const customFieldDesigners = customFields
    .filter((field) => {
      const normalizedName = normalizeToken(field.fieldName);
      return DESIGNER_FIELD_HINTS.some((hint) => normalizedName.includes(hint));
    })
    .map((field) => field.value)
    .flatMap((value) => {
      if (typeof value === "string") {
        return value
          .split(/[;,/|]/g)
          .map((part) => part.trim())
          .filter((part) => part.length > 0);
      }
      if (typeof value === "number" || typeof value === "boolean") {
        return [String(value)];
      }
      return [];
    });

  return uniqueNonEmpty([...memberNames, ...customFieldDesigners]);
}

function resolveCityFromCard(
  card: TrelloCardRaw,
  mode: CityResolutionMode,
  listById: Map<string, TrelloListRaw>,
  customFields: TrelloCustomFieldValue[],
  cityFieldId: string | undefined,
): string {
  if (mode === "list") {
    return listById.get(card.idList)?.name ?? "Sin ciudad";
  }

  if (mode === "customField") {
    const cityFieldValue = customFields.find((field) => field.fieldId === cityFieldId)?.value;
    if (typeof cityFieldValue === "string" && cityFieldValue.trim().length > 0) {
      return cityFieldValue.trim();
    }
    if (typeof cityFieldValue === "number" || typeof cityFieldValue === "boolean") {
      return String(cityFieldValue);
    }
    return "Sin ciudad";
  }

  const namedLabel = card.labels.find((label) => normalizeName(label.name).length > 0);
  if (namedLabel) {
    return namedLabel.name.trim();
  }

  return "Sin ciudad";
}

async function trelloFetch<T>(
  path: string,
  query: Record<string, string>,
): Promise<T> {
  const params = new URLSearchParams({
    key: env.TRELLO_KEY,
    token: env.TRELLO_TOKEN,
    ...query,
  });

  const url = `${TRELLO_BASE_URL}${path}?${params.toString()}`;
  let backoffMs = 400;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      method: "GET",
      cache: "no-store",
      headers: {
        Accept: "application/json",
      },
    });

    if (response.status === 429) {
      if (attempt === 2) {
        throw new TrelloApiError(
          "Trello ha respondido con rate limit (429) tras varios intentos.",
          response.status,
        );
      }

      const retryAfter = Number(response.headers.get("retry-after"));
      const waitMs = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : backoffMs;
      await wait(waitMs);
      backoffMs *= 2;
      continue;
    }

    if (response.status >= 500 && attempt < 2) {
      await wait(backoffMs);
      backoffMs *= 2;
      continue;
    }

    if (!response.ok) {
      const errorText = (await response.text()).slice(0, 500);
      throw new TrelloApiError(
        `Error al consultar Trello (${response.status}). ${errorText}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  }

  throw new TrelloApiError("Error inesperado consultando Trello.", 500);
}

function computeStats(designs: TrelloDesign[]): DashboardStats {
  return designs.reduce<DashboardStats>(
    (accumulator, design) => {
      accumulator.totalDesigns += 1;
      if (design.dueCategory === "overdue") {
        accumulator.overdueDesigns += 1;
      }
      if (design.dueCategory === "upcoming") {
        accumulator.upcomingDesigns += 1;
      }
      if (design.dueCategory === "noDue") {
        accumulator.noDueDesigns += 1;
      }
      if (design.isUndefined) {
        accumulator.undefinedDesigns += 1;
      }
      return accumulator;
    },
    {
      totalDesigns: 0,
      overdueDesigns: 0,
      upcomingDesigns: 0,
      noDueDesigns: 0,
      undefinedDesigns: 0,
    },
  );
}

function computeLabelCounters(designs: TrelloDesign[]): LabelCounter[] {
  const counters = new Map<string, LabelCounter>();

  for (const design of designs) {
    for (const label of design.labels) {
      const key = label.id || `${normalizeToken(label.name)}|${label.color ?? "none"}`;
      const current = counters.get(key);
      if (current) {
        current.count += 1;
        continue;
      }

      counters.set(key, {
        key,
        name: label.name?.trim() || "Sin nombre",
        color: label.color ?? null,
        count: 1,
      });
    }
  }

  return [...counters.values()].sort((left, right) => {
    if (left.count !== right.count) {
      return right.count - left.count;
    }
    return left.name.localeCompare(right.name);
  });
}

async function fetchDashboardData(): Promise<TrelloDashboardData> {
  const [lists, rawCustomFields, cards] = await Promise.all([
    trelloFetch<TrelloListRaw[]>(`/boards/${env.TRELLO_BOARD_ID}/lists`, {
      fields: "id,name,closed,pos",
      filter: "open",
    }),
    trelloFetch<TrelloCustomFieldRaw[]>(`/boards/${env.TRELLO_BOARD_ID}/customFields`, {
      fields: "id,name,type,options",
    }),
    trelloFetch<TrelloCardRaw[]>(`/boards/${env.TRELLO_BOARD_ID}/cards`, {
      filter: "open",
      fields:
        "id,name,desc,shortUrl,url,idList,idAttachmentCover,labels,idMembers,due,dueComplete,dateLastActivity",
      members: "true",
      member_fields: "fullName,username",
      attachments: "true",
      attachment_fields: "id,name,url,mimeType",
      checklists: "all",
      checklist_fields: "id,name",
      checkItem_fields: "id,name,state,due,dueComplete,pos,idMember",
      customFieldItems: "true",
    }),
  ]);

  const cityField = pickCityField(rawCustomFields);
  const cityMode = pickCityMode(lists, cards, cityField);

  const listById = new Map<string, TrelloListRaw>(
    lists.map((list) => [list.id, list]),
  );
  const customFieldById = new Map<string, TrelloCustomFieldRaw>(
    rawCustomFields.map((field) => [field.id, field]),
  );

  const designs = cards.map<TrelloDesign>((card) => {
    const customFields = normalizeCustomFields(
      card.customFieldItems ?? [],
      customFieldById,
    );
    const city = resolveCityFromCard(
      card,
      cityMode,
      listById,
      customFields,
      cityField?.id,
    );

    const createdAt = inferCreationDateFromCardId(card.id);
    const members =
      (card.members ?? []).map((member) => ({
        id: member.id,
        fullName: member.fullName,
        username: member.username,
      })) ?? [];
    const isUndefined = (card.labels ?? []).some((label) => isUndefinedLabel(label));

    return {
      id: card.id,
      name: card.name,
      desc: card.desc ?? "",
      shortUrl: card.shortUrl,
      url: card.url,
      coverImageUrl: pickCoverImageUrl(card),
      idList: card.idList,
      listName: listById.get(card.idList)?.name ?? "Sin lista",
      city,
      citySource: cityMode,
      due: toIsoOrNull(card.due),
      dueComplete: Boolean(card.dueComplete),
      dueCategory: getDueCategory(card.due, Boolean(card.dueComplete), env.UPCOMING_DAYS),
      isUndefined,
      labels: card.labels ?? [],
      designers: extractDesigners(card.members ?? [], customFields),
      idMembers: card.idMembers ?? [],
      members,
      attachments: (card.attachments ?? []).map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        url: attachment.url,
      })),
      checklists: (card.checklists ?? []).map((checklist) => ({
        id: checklist.id,
        name: checklist.name,
        items: [...(checklist.checkItems ?? [])]
          .sort((left, right) => left.pos - right.pos)
          .map((item) => ({
            id: item.id,
            name: item.name,
            state: item.state,
            due: toIsoOrNull(item.due),
            dueComplete: Boolean(item.dueComplete),
            idMember: item.idMember ?? null,
            pos: item.pos,
          })),
      })),
      customFields,
      dateLastActivity: toIsoOrNull(card.dateLastActivity),
      createdAt,
      createdAtSource: createdAt ? "cardId" : "unknown",
    };
  });

  const groupedByCity = new Map<string, TrelloDesign[]>();
  for (const design of designs) {
    const currentDesigns = groupedByCity.get(design.city) ?? [];
    currentDesigns.push(design);
    groupedByCity.set(design.city, currentDesigns);
  }

  const cities = [...groupedByCity.entries()]
    .map(([city, cityDesigns]) => {
      const orderedDesigns = [...cityDesigns].sort((left, right) => {
        const leftDue = left.due ? new Date(left.due).getTime() : Number.POSITIVE_INFINITY;
        const rightDue = right.due ? new Date(right.due).getTime() : Number.POSITIVE_INFINITY;

        if (leftDue !== rightDue) {
          return leftDue - rightDue;
        }

        return left.name.localeCompare(right.name);
      });

      return {
        city,
        source: cityMode,
        designs: orderedDesigns,
        labelCounters: computeLabelCounters(orderedDesigns),
        ...computeStats(orderedDesigns),
      };
    })
    .sort((left, right) => left.city.localeCompare(right.city));

  const totals = computeStats(designs);
  const labelCounters = computeLabelCounters(designs);

  return {
    boardId: env.TRELLO_BOARD_ID,
    fetchedAt: new Date().toISOString(),
    cityModeResolved: cityMode,
    cityFieldName: cityField?.name ?? env.CITY_FIELD_NAME,
    upcomingDays: env.UPCOMING_DAYS,
    totals,
    labelCounters,
    cities,
  };
}

const getCachedDashboardData = unstable_cache(
  fetchDashboardData,
  [
    "trello-dashboard",
    env.TRELLO_BOARD_ID,
    env.CITY_MODE,
    env.CITY_FIELD_NAME,
    String(env.UPCOMING_DAYS),
  ],
  {
    revalidate: env.TRELLO_REVALIDATE_SECONDS,
    tags: [TRELLO_DASHBOARD_TAG],
  },
);

export async function getTrelloDashboardData(): Promise<TrelloDashboardData> {
  return getCachedDashboardData();
}
