import Link from "next/link";

import { CityGallery } from "@/components/CityGallery";
import { RefreshButton } from "@/components/RefreshButton";
import { getTrelloDashboardData } from "@/lib/trello";

export const dynamic = "force-dynamic";

export default async function GalleryPage() {
  const result = await getTrelloDashboardData()
    .then((data) => ({ data, error: null as string | null }))
    .catch((error) => ({
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar informacion del tablero.",
    }));

  if (result.error || !result.data) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-900">Error al cargar Trello</h1>
          <p className="mt-2 text-sm text-red-800">{result.error}</p>
          <p className="mt-3 text-sm text-red-700">
            Revisa variables de entorno, permisos del token y limite de API.
          </p>
        </div>
      </main>
    );
  }

  const data = result.data;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-slate-900">Galeria de Portadas</h1>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
              Total disenos: {data.totals.totalDesigns}
            </span>
            <span className="rounded-md bg-indigo-100 px-2 py-1 text-indigo-700">
              Indefinidos: {data.totals.undefinedDesigns}
            </span>
          </div>
          <nav className="flex flex-wrap gap-2 text-sm">
            <Link
              href="/"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-700 transition hover:bg-slate-100"
            >
              Vista tablero
            </Link>
            <span className="rounded-md bg-slate-800 px-3 py-1.5 font-semibold text-white">
              Vista galeria
            </span>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <RefreshButton />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cerrar sesion
            </button>
          </form>
        </div>
      </header>

      <CityGallery data={data} />
    </main>
  );
}
