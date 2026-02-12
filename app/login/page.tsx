import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { sanitizeRedirectPath, SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth";

type SearchParamValue = string | string[] | undefined;

interface LoginPageProps {
  searchParams: Promise<Record<string, SearchParamValue>>;
}

function getSearchParamValue(value: SearchParamValue): string {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }
  return value ?? "";
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const cookieStore = await cookies();
  const currentToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (await verifySessionToken(currentToken)) {
    redirect("/");
  }

  const params = await searchParams;
  const hasError = getSearchParamValue(params.error) === "1";
  const from = sanitizeRedirectPath(getSearchParamValue(params.from));

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Acceso</h1>
        <p className="mt-1 text-sm text-slate-600">
          Inicia sesión para consultar el tablero de ciudades.
        </p>

        {hasError ? (
          <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            Usuario o contraseña incorrectos.
          </p>
        ) : null}

        <form action="/api/auth/login" method="post" className="mt-4 space-y-3">
          <input type="hidden" name="from" value={from} />

          <div>
            <label htmlFor="username" className="mb-1 block text-sm font-medium text-slate-700">
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 transition focus:border-slate-500 focus:ring-2"
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Clave
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-400 transition focus:border-slate-500 focus:ring-2"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
