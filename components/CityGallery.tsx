"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import type { TrelloDashboardData } from "@/types/trello";

export function CityGallery({ data }: { data: TrelloDashboardData }) {
  const [selectedCity, setSelectedCity] = useState<string>(data.cities[0]?.city ?? "");

  const cityOptions = useMemo(
    () => data.cities.map((city) => city.city).sort((left, right) => left.localeCompare(right)),
    [data.cities],
  );

  const selected = useMemo(
    () => data.cities.find((city) => city.city === selectedCity) ?? null,
    [data.cities, selectedCity],
  );

  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[280px_1fr] md:items-end">
          <div>
            <label htmlFor="citySelect" className="mb-1 block text-sm font-semibold text-slate-700">
              Ciudad
            </label>
            <select
              id="citySelect"
              value={selectedCity}
              onChange={(event) => setSelectedCity(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 transition focus:border-slate-500 focus:ring-2"
            >
              {cityOptions.map((cityName) => (
                <option key={cityName} value={cityName}>
                  {cityName}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
              Disenos: {selected?.designs.length ?? 0}
            </span>
            <span className="rounded-md bg-indigo-100 px-2 py-1 text-indigo-700">
              Indefinidos: {selected?.undefinedDesigns ?? 0}
            </span>
          </div>
        </div>
      </div>

      {!selected ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-700">
          No hay ciudad seleccionada.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {selected.designs.map((design) => (
            <article
              key={design.id}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <a
                href={design.url}
                target="_blank"
                rel="noreferrer"
                className="block focus:outline-none focus:ring-2 focus:ring-slate-500"
                title={design.name}
              >
                {design.coverImageUrl ? (
                  <Image
                    src={design.coverImageUrl}
                    alt={`Portada ${design.name}`}
                    width={640}
                    height={420}
                    unoptimized
                    className="h-52 w-full bg-slate-100 object-cover"
                  />
                ) : (
                  <div className="flex h-52 items-center justify-center bg-slate-100 text-xs text-slate-500">
                    Sin portada
                  </div>
                )}
              </a>

              <div className="space-y-1 p-3">
                <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{design.name}</h3>
                <p className="text-xs text-slate-500">
                  Disenador:{" "}
                  {design.designers.length ? design.designers.join(", ") : "Sin asignar"}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
