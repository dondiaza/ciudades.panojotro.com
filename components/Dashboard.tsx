"use client";

import { useMemo, useState } from "react";

import type {
  DashboardStats,
  DueCategory,
  TrelloDashboardData,
  TrelloDesign,
} from "@/types/trello";

type QuickFilter = "all" | Exclude<DueCategory, "none">;

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
    return "Fecha inválida";
  }

  return formatter.format(date);
}

function dueCategoryLabel(category: DueCategory): string {
  if (category === "overdue") {
    return "Caducado";
  }
  if (category === "upcoming") {
    return "Próximo";
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
    design.members.map((member) => member.fullName).join(" "),
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
      return accumulator;
    },
    {
      totalDesigns: 0,
      overdueDesigns: 0,
      upcomingDesigns: 0,
      noDueDesigns: 0,
    },
  );
}

function formatCustomFieldValue(value: string | number | boolean | null): string {
  if (value === null) {
    return "Sin valor";
  }
  if (typeof value === "boolean") {
    return value ? "Sí" : "No";
  }
  return String(value);
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
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");

  const normalizedQuery = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    return data.cities
      .map((city) => {
        const designs = city.designs.filter((design) => {
          const filterMatch =
            quickFilter === "all" || design.dueCategory === quickFilter;
          const searchMatch =
            !normalizedQuery ||
            toSearchText(city.city, design).includes(normalizedQuery);
          return filterMatch && searchMatch;
        });

        return {
          city,
          designs,
          stats: calculateStats(designs),
        };
      })
      .filter((city) => city.designs.length > 0);
  }, [data.cities, normalizedQuery, quickFilter]);

  const visibleStats = useMemo(() => {
    const allDesigns = filtered.flatMap((city) => city.designs);
    return calculateStats(allDesigns);
  }, [filtered]);

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            type="search"
            placeholder="Buscar por ciudad, diseño, miembro, etiqueta o campo..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 transition focus:border-slate-500 focus:ring-2"
          />
          <div className="flex flex-wrap gap-2">
            {[
              { key: "all", label: "Todos" },
              { key: "overdue", label: "Caducados" },
              { key: "upcoming", label: `Próximos ${data.upcomingDays} días` },
              { key: "noDue", label: "Sin caducidad" },
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
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
            Total visible: {visibleStats.totalDesigns}
          </span>
          <span className="rounded-md bg-red-100 px-2 py-1 text-red-800">
            Caducados: {visibleStats.overdueDesigns}
          </span>
          <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-800">
            Próximos: {visibleStats.upcomingDesigns}
          </span>
          <span className="rounded-md bg-slate-200 px-2 py-1 text-slate-700">
            Sin caducidad: {visibleStats.noDueDesigns}
          </span>
        </div>
      </section>

      <section className="space-y-3">
        {filtered.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
            No hay resultados para la búsqueda/filtro actual.
          </div>
        ) : null}

        {filtered.map(({ city, designs, stats }) => (
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
                  Diseños: {stats.totalDesigns}
                </span>
                <span className="rounded-md bg-red-100 px-2 py-1 text-red-700">
                  Caducados: {stats.overdueDesigns}
                </span>
                <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-700">
                  Próximos: {stats.upcomingDesigns}
                </span>
                <span className="rounded-md bg-slate-200 px-2 py-1 text-slate-700">
                  Sin caducidad: {stats.noDueDesigns}
                </span>
              </div>
            </summary>

            <div className="border-t border-slate-200 p-3">
              <div className="space-y-3">
                {designs.map((design) => (
                  <details
                    key={design.id}
                    className="rounded-lg border border-slate-200 bg-slate-50 [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-900">
                          {design.name}
                        </h4>
                        <p className="text-xs text-slate-500">
                          Lista: {design.listName}
                        </p>
                      </div>
                      <span
                        className={`rounded-md px-2 py-1 text-xs font-medium ${dueCategoryClass(design.dueCategory)}`}
                      >
                        {dueCategoryLabel(design.dueCategory)}
                      </span>
                    </summary>

                    <div className="grid gap-3 border-t border-slate-200 p-3 lg:grid-cols-2">
                      <InfoSection title="Detalles">
                        <dl className="space-y-1">
                          <div>
                            <dt className="font-semibold">ID</dt>
                            <dd className="break-all">{design.id}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Descripción</dt>
                            <dd className="whitespace-pre-wrap">
                              {design.desc || "Sin descripción"}
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
                            <dd>{design.dueComplete ? "Sí" : "No"}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Estado</dt>
                            <dd>{dueCategoryLabel(design.dueCategory)}</dd>
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
                        </ul>
                      </InfoSection>

                      <InfoSection title="Fechas">
                        <dl className="space-y-1">
                          <div>
                            <dt className="font-semibold">Creación</dt>
                            <dd>{formatDate(design.createdAt)}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Fuente fecha creación</dt>
                            <dd>{design.createdAtSource}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">Última actividad</dt>
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
