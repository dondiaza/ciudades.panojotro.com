import { Dashboard } from "@/components/Dashboard";
import { RefreshButton } from "@/components/RefreshButton";
import { getTrelloDashboardData } from "@/lib/trello";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const result = await getTrelloDashboardData()
    .then((data) => ({ data, error: null as string | null }))
    .catch((error) => ({
      data: null,
      error:
        error instanceof Error
          ? error.message
          : "No se pudo cargar información del tablero.",
    }));

  if (result.error || !result.data) {
    return (
      <main className="mx-auto min-h-screen max-w-4xl px-4 py-8">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6">
          <h1 className="text-xl font-bold text-red-900">Error al cargar Trello</h1>
          <p className="mt-2 text-sm text-red-800">{result.error}</p>
          <p className="mt-3 text-sm text-red-700">
            Revisa variables de entorno, permisos del token y límite de API.
          </p>
        </div>
      </main>
    );
  }

  const data = result.data;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-slate-900">Ciudades - Trello</h1>
          <p className="text-sm text-slate-600">
            Tablero: <span className="font-mono">{data.boardId}</span> | Modo ciudad:{" "}
            <span className="font-semibold">{data.cityModeResolved}</span> | Campo ciudad:{" "}
            <span className="font-semibold">{data.cityFieldName}</span>
          </p>
          <p className="text-xs text-slate-500">
            Última sincronización: {new Date(data.fetchedAt).toLocaleString("es-ES")}
          </p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="rounded-md bg-slate-100 px-2 py-1 text-slate-700">
              Total diseños: {data.totals.totalDesigns}
            </span>
            <span className="rounded-md bg-red-100 px-2 py-1 text-red-700">
              Caducados: {data.totals.overdueDesigns}
            </span>
            <span className="rounded-md bg-amber-100 px-2 py-1 text-amber-700">
              Próximos {data.upcomingDays} días: {data.totals.upcomingDesigns}
            </span>
            <span className="rounded-md bg-slate-200 px-2 py-1 text-slate-700">
              Sin caducidad: {data.totals.noDueDesigns}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <RefreshButton />
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            >
              Cerrar sesión
            </button>
          </form>
        </div>
      </header>

      <Dashboard data={data} />
    </main>
  );
}
