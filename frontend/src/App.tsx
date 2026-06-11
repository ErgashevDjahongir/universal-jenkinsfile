import { useEffect, useState } from "react";
import { api } from "./api/client";
import { uz } from "./i18n/uz";

interface HealthResponse {
  status: string;
  database: string;
  timestamp: string;
}

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<HealthResponse>("/health")
      .then((res) => setHealth(res.data))
      .catch(() => setError(uz.common.connectionError));
  }, []);

  return (
    <main className="flex min-h-full items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-slate-900">E-TEST</h1>
        <p className="mt-1 text-sm text-slate-500">{uz.app.tagline}</p>

        <div className="mt-6 rounded-lg bg-slate-50 p-4 text-sm">
          <span className="font-medium text-slate-700">
            {uz.app.backendStatus}:
          </span>{" "}
          {error ? (
            <span className="text-red-600">{error}</span>
          ) : health ? (
            <span className="text-emerald-600">
              {health.status} · DB: {health.database}
            </span>
          ) : (
            <span className="text-slate-400">{uz.common.loading}</span>
          )}
        </div>
      </div>
    </main>
  );
}

export default App;
