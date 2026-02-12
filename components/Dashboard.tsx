"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import type {
  DashboardStats,
  DueCategory,
  LabelCounter,
  TrelloDashboardData,
  TrelloDesign,
} from "@/types/trello";

type QuickFilter = "all" | Exclude<DueCategory, "none"> | "undefined";

const formatter = new Intl.DateTimeFormat("es-ES", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatDate(value: string | null): string {
  if (!value) {
    return "Sin dato";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Fecha invalida";
  }

  return formatter.format(date);
}

function dueCategoryLabel(category: DueCategory): string {
  if (category === "overdue") {
    return "Caducado";
  }
  if (category === "upcoming") {
    return "Proximo";
  }
  if (category === "noDue") {
    return "Sin caducidad";
  }
  return "Vigente";
}

function dueCategoryClass(category: DueCategory): string {
  if (category === "overdue") {
    return "bg-red-100 text-red-800";
  }
  if (category === "upcoming") {
    return "bg-amber-100 text-amber-800";
  }
  if (category === "noDue") {
    return "bg-slate-100 text-slate-700";
  }
  return "bg-emerald-100 text-emerald-700";
}

function toSearchText(city: string, design: TrelloDesign): string {
  return [
    city,
    design.name,
    design.desc,
    design.listName,
    design.labels.map((label) => label.name).join(" "),
    design.customFields
      .map((field) => `${field.fieldName} ${String(field.value ?? "")}`)
      .join(" "),
    design.members.map((member) => `${member.fullName} ${member.username}`).join(" "),
    design.designers.join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function toDesignerSearchText(design: TrelloDesign): string {
  return [
    design.designers.join(" "),
    design.members.map((member) => `${member.fullName} ${member.username}`).join(" "),
  ]
    .join(" ")
    .toLowerCase();
}

function calculateStats(designs: TrelloDesign[]): DashboardStats {
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

function calculateLabelCounters(designs: TrelloDesign[]): LabelCounter[] {
  const counterByKey = new Map<string, LabelCounter>();

  for (const design of designs) {
    for (const label of design.labels) {
      const key = label.id || `${label.name}-${label.color ?? "none"}`;
      const current = counterByKey.get(key);
      if (current) {
        current.count += 1;
        continue;
      }

      counterByKey.set(key, {
        key,
        name: label.name?.trim() || "Sin nombre",
        color: label.color ?? null,
        count: 1,
      });
    }
  }

  return [...counterByKey.values()].sort((left, right) => {
    if (left.count !== right.count) {
      return right.count - left.count;
    }
    return left.name.localeCompare(right.name);
  });
}

function formatCustomFieldValue(value: string | number | boolean | null): string {
  if (value === null) {
    return "Sin valor";
  }
  if (typeof value === "boolean") {
    return value ? "Si" : "No";
  }
  return String(value);
}

function LabelCountersRow({
  counters,
  emptyMessage,
}: {
  counters: LabelCounter[];
  emptyMessage: string;
}) {
  if (!counters.length) {
    return <p className="text-xs text-slate-500">{emptyMessage}</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {counters.map((counter) => (
        <span
          key={counter.key}
          className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800"
        >
          {counter.name}: {counter.count}
        </span>
      ))}
    </div>
  );
}

function CoverAvatar({ design }: { design: TrelloDesign }) {
  if (!design.coverImageUrl) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-slate-200 bg-slate-100 text-[10px] text-slate-500">
        Sin portada
      </div>
    );
  }

  return (
    <Image
      src={design.coverImageUrl}
      alt={`Portada ${design.name}`}
      width={48}
      height={48}
      unoptimized
      className="h-12 w-12 rounded-md border border-slate-200 bg-slate-100 object-cover"
    />
  );
}

function InfoSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h4 className="mb-2 text-sm font-semibold text-slate-800">{title}</h4>
      <div className="text-sm text-slate-700">{children}</div>
    </section>
  );
}

export function Dashboard({ data }: { data: TrelloDashboardData }) {
  const [query, setQuery] = useState("");
  const [designerQuery, setDesignerQuery] = useState("");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const normalizedQuery = query.trim().toLowerCase();
  const normalizedDesignerQuery = designerQuery.trim().toLowerCase();

  const filtered = useMemo(() => {
    return data.cities
      .map((city) => {
        const designs = city.designs.filter((design) => {
          const filterMatch =
            quickFilter === "all"
              ? true
              : quickFilter === "undefined"
                ? design.isUndefined
                : design.dueCategory === quickFilter;

          const searchMatch =
            !normalizedQuery ||
            toSearchText(city.city, design).includes(normalizedQuery);

          const designerMatch =
            !normalizedDesignerQuery ||
            toDesignerSearchText(design).includes(normalizedDesignerQuery);

          return filterMatch && searchMatch && designerMatch;
        });

        return {
          city,
          designs,
          stats: calculateStats(designs),
          labelCounters: calculateLabelCounters(designs),
        };
      })
      .filter((city) => city.designs.length > 0);
  }, [data.cities, normalizedQuery, normalizedDesignerQuery, quickFilter]);

  const visibleStats = useMemo(() => {
    const allDesigns = filtered.flatMap((city) => city.designs);
    return calculateStats(allDesigns);
  }, [filtered]);

  const visibleLabelCounters = useMemo(() => {
    const allDesigns = filtered.flatMap((city) => city.designs);
    return calculateLabelCounters(allDesigns);
  }, [filtered]);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            type="search"
            placeholder="Buscar por ciudad, diseno, etiqueta, miembro o campo..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 transition focus:border-slate-500 focus:ring-2"
          />
          <input
            type="search"
            placeholder="Buscar por disenador..."
            value={designerQuery}
            onChange={(event) => setDesignerQuery(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 transition focus:border-slate-500 focus:ring-2"
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          {[
            { key: "all", label: "Todos" },
            { key: "overdue", label: "Caducados" },
            { key: "upcoming", label: `Proximos ${data.upcomingDays} dias` },
            { key: "noDue", label: "Sin caducidad" },
            { key: "undefined", label: "Indefinidos" },
          ].map((option) => {
            const isActive = quickFilter === option.key;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setQuickFilter(option.key as QuickFilter)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive
                    ? "bg-slate-800 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
            Total visible: {visibleStats.totalDesigns}
          </span>
          <span className="rounded-md bg-red-100 px-2 py-1 text-red-800">
            Caducados: {visibleStats.overdueDesigns}
          </span>
          <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">
            Proximos: {visibleStats.upcomingDesigns}
          </span>
          <span className="rounded-md bg-slate-200 px-2 py-1 text-slate-700">
            Sin caducidad: {visibleStats.noDueDesigns}
          </span>
          <span className="rounded-md bg-indigo-100 px-2 py-1 text-indigo-800">
            Indefinidos: {visibleStats.undefinedDesigns}
          </span>
        </div>

        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Etiquetas visibles
          </p>
          <LabelCountersRow
            counters={visibleLabelCounters}
            emptyMessage="No hay etiquetas en los disenos visibles."
          />
        </div>

        <div className="mt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Etiquetas totales del tablero
          </p>
          <LabelCountersRow
            counters={data.labelCounters}
            emptyMessage="No hay etiquetas en el tablero."
          />
        </div>
      </section>

      <section className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
            No hay resultados para la busqueda/filtro actual.
          </div>
        ) : null}

        {filtered.map(({ city, designs, stats, labelCounters }) => (
          <details
            key={city.city}
            className="rounded-xl border border-slate-200 bg-white [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-3 px-4 py-3">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {city.city}
                </h3>
                <p className="text-xs text-slate-500">Modo: {city.source}</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
                  Disenos: {stats.totalDesigns}
                </span>
                <span className="rounded-md bg-red-100 px-2 py-1 text-red-700">
                  Caducados: {stats.overdueDesigns}
                </span>
                <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-700">
                  Proximos: {stats.upcomingDesigns}
                </span>
                <span className="rounded-md bg-slate-200 px-2 py-1 text-slate-700">
                  Sin caducidad: {stats.noDueDesigns}
                </span>
                <span className="rounded-md bg-indigo-100 px-2 py-1 text-indigo-800">
                  Indefinidos: {stats.undefinedDesigns}
                </span>
              </div>
            </summary>

            <div className="border-t border-slate-200 p-3">
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Etiquetas en {city.city}
                </p>
                <LabelCountersRow
                  counters={labelCounters}
                  emptyMessage="No hay etiquetas en esta ciudad."
                />
              </div>

              <div className="space-y-3">
                {designs.map((design) => (
                  <details
                    key={design.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div className="flex min-w-0 items-center gap-3">
                        <CoverAvatar design={design} />
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-slate-900">
                            {design.name}
                          </h4>
                          <p className="text-xs text-slate-500">
                            Lista: {design.listName}
                          </p>
                          <p className="text-xs text-slate-500">
                            Disenador:{" "}
                            {design.designers.length
                              ? design.designers.join(", ")
                              : "Sin asignar"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {design.isUndefined ? (
                          <span className="rounded-md bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-800">
                            INDEFINIDO
                          </span>
                        ) : null}
                        <span
                          className={`rounded-md px-2 py-1 text-xs font-medium ${dueCategoryClass(design.dueCategory)}`}
                        >
                          {dueCategoryLabel(design.dueCategory)}
                        </span>
                      </div>
                    </summary>

                    <div className="grid gap-3 border-t border-slate-200 p-3 lg:grid-cols-2">
                      <InfoSection title="Detalles">
                        <dl className="space-y-1">
                          <div>
                            <dt className="font-semibold">ID</dt>
                            <dd className="break-all">{design.id}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Descripcion</dt>
                            <dd className="whitespace-pre-wrap">
                              {design.desc || "Sin descripcion"}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Ciudad</dt>
                            <dd>{design.city}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">ID Lista</dt>
                            <dd>{design.idList}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Disenadores</dt>
                            <dd>
                              {design.designers.length
                                ? design.designers.join(", ")
                                : "Sin asignar"}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold">ID Miembros</dt>
                            <dd className="break-all">
                              {design.idMembers.length
                                ? design.idMembers.join(", ")
                                : "Sin miembros"}
                            </dd>
                          </div>
                        </dl>
                      </InfoSection>

                      <InfoSection title="Caducidad">
                        <dl className="space-y-1">
                          <div>
                            <dt className="font-semibold">Vencimiento</dt>
                            <dd>{formatDate(design.due)}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Vencimiento completado</dt>
                            <dd>{design.dueComplete ? "Si" : "No"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Estado</dt>
                            <dd>{dueCategoryLabel(design.dueCategory)}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Indefinido</dt>
                            <dd>{design.isUndefined ? "Si" : "No"}</dd>
                          </div>
                        </dl>
                      </InfoSection>

                      <InfoSection title="Etiquetas">
                        {design.labels.length ? (
                          <ul className="flex flex-wrap gap-2">
                            {design.labels.map((label) => (
                              <li
                                key={label.id}
                                className="rounded-md bg-slate-200 px-2 py-1 text-xs"
                              >
                                {label.name || "Sin nombre"} ({label.color ?? "sin color"})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Sin etiquetas.</p>
                        )}
                      </InfoSection>

                      <InfoSection title="Campos">
                        {design.customFields.length ? (
                          <ul className="space-y-2">
                            {design.customFields.map((field) => (
                              <li key={field.fieldId} className="rounded-md bg-slate-100 p-2">
                                <p className="font-semibold">{field.fieldName}</p>
                                <p className="text-xs text-slate-500">{field.fieldType}</p>
                                <p>{formatCustomFieldValue(field.value)}</p>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Sin campos personalizados.</p>
                        )}
                      </InfoSection>

                      <InfoSection title="Adjuntos">
                        {design.attachments.length ? (
                          <ul className="space-y-1">
                            {design.attachments.map((attachment) => (
                              <li key={attachment.id}>
                                <a
                                  href={attachment.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sky-700 hover:text-sky-800 hover:underline"
                                >
                                  {attachment.name}
                                </a>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Sin adjuntos.</p>
                        )}
                      </InfoSection>

                      <InfoSection title="Checklists">
                        {design.checklists.length ? (
                          <ul className="space-y-2">
                            {design.checklists.map((checklist) => (
                              <li key={checklist.id} className="rounded-md bg-slate-100 p-2">
                                <p className="font-semibold">{checklist.name}</p>
                                {checklist.items.length ? (
                                  <ul className="mt-1 space-y-1">
                                    {checklist.items.map((item) => (
                                      <li key={item.id}>
                                        <p>
                                          [{item.state === "complete" ? "x" : " "}] {item.name}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                          Due: {formatDate(item.due)} | Miembro:{" "}
                                          {item.idMember ?? "N/A"}
                                        </p>
                                      </li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="text-xs text-slate-500">Sin items.</p>
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Sin checklists.</p>
                        )}
                      </InfoSection>

                      <InfoSection title="Miembros">
                        {design.members.length ? (
                          <ul className="space-y-1">
                            {design.members.map((member) => (
                              <li key={member.id}>
                                {member.fullName} ({member.username || "sin usuario"})
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p>Sin miembros asignados.</p>
                        )}
                      </InfoSection>

                      <InfoSection title="Enlaces">
                        <ul className="space-y-1">
                          <li>
                            <a
                              href={design.url}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-sky-700 hover:text-sky-800 hover:underline"
                            >
                              URL completa
                            </a>
                          </li>
                          <li>
                            <a
                              href={design.shortUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="break-all text-sky-700 hover:text-sky-800 hover:underline"
                            >
                              URL corta
                            </a>
                          </li>
                          {design.coverImageUrl ? (
                            <li>
                              <a
                                href={design.coverImageUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="break-all text-sky-700 hover:text-sky-800 hover:underline"
                              >
                                Portada
                              </a>
                            </li>
                          ) : null}
                        </ul>
                      </InfoSection>

                      <InfoSection title="Fechas">
                        <dl className="space-y-1">
                          <div>
                            <dt className="font-semibold">Creacion</dt>
                            <dd>{formatDate(design.createdAt)}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Fuente fecha creacion</dt>
                            <dd>{design.createdAtSource}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Ultima actividad</dt>
                            <dd>{formatDate(design.dateLastActivity)}</dd>
                          </div>
                        </dl>
                      </InfoSection>
                    </div>
                  </details>
                ))}
              </div>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
