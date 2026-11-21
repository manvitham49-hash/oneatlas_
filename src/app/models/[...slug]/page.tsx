
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { ReactNode } from "react";

// ==============================
// TYPES
// ==============================

type Provider = {
  id?: string;
  inputPrice?: number;
  outputPrice?: number;
  provider: {
    name: string;
    website?: string | null;
  };
};

type Benchmark = Record<string, unknown>;

type Model = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  modelType: string | null;
  contextWindow: number;
  inputPrice: number;
  outputPrice: number;
  releaseDate: string | null;
  inputModalities: string[];
  outputModalities: string[];
  capabilities: string[];
  lab: {
    name: string;
    description?: string | null;
    website?: string | null;
  } | null;
  providers: Provider[];
  benchmarks: Benchmark[];
};

// ==============================
// HELPER FUNCTIONS
// ==============================

function formatPrice(price?: number) {
  if (price === undefined || price === null) return "N/A";
  if (price === 0) return "Free";

  return price.toFixed(8).replace(/\.?0+$/, "");
}

function formatContext(value?: number) {
  if (value === undefined || value === null) return "N/A";

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M tokens`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K tokens`;
  }

  return `${value} tokens`;
}

function formatDate(date: string | null) {
  if (!date) return "Not available";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Not available";
  }

  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getBenchmarkValue(value: unknown): string {
  if (value === null || value === undefined) return "N/A";

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

// ==============================
// LOADING COMPONENT
// ==============================

function LoadingScreen() {
  return (
    <main className="min-h-screen bg-[#080b16] p-10 text-white">
      <div className="mx-auto max-w-6xl animate-pulse">
        <div className="mb-6 h-10 w-1/2 rounded bg-white/10" />

        <div className="mb-10 h-5 w-3/4 rounded bg-white/10" />

        <div className="grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-36 rounded-2xl bg-white/10"
            />
          ))}
        </div>
      </div>
    </main>
  );
}

// ==============================
// MAIN CONTENT COMPONENT
// ==============================

function ModelDetailsContent() {
  const params = useParams<{ slug: string[] }>();
  const router = useRouter();

  const slugParam = params.slug;

  const slug = Array.isArray(slugParam)
    ? slugParam.join("/")
    : slugParam || "";

  const [model, setModel] = useState<Model | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ==============================
  // FETCH MODEL DETAILS
  // ==============================

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError("Invalid model URL.");
      return;
    }

    const controller = new AbortController();

    async function fetchModel() {
      try {
        setLoading(true);
        setError("");

        const encodedSlug = slug
          .split("/")
          .map(encodeURIComponent)
          .join("/");

        const response = await fetch(
          `/api/models/${encodedSlug}`,
          {
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(
            result.message || "Unable to load model details."
          );
        }

        setModel(result.data);
      } catch (err) {
        if (
          err instanceof Error &&
          err.name !== "AbortError"
        ) {
          setError(err.message);
          setModel(null);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchModel();

    return () => controller.abort();
  }, [slug]);

  // ==============================
  // LOADING STATE
  // ==============================

  if (loading) {
    return <LoadingScreen />;
  }

  // ==============================
  // ERROR STATE
  // ==============================

  if (error || !model) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#080b16] px-5 text-white">
        <div className="max-w-lg rounded-2xl border border-red-500/30 bg-[#11182b] p-8 text-center">

          <h1 className="text-2xl font-bold text-red-400">
            Model Not Found
          </h1>

          <p className="mt-4 text-slate-400">
            {error || "This AI model could not be found."}
          </p>

          <button
            onClick={() => router.push("/models")}
            className="mt-6 rounded-xl bg-purple-600 px-6 py-3 font-semibold transition hover:bg-purple-500"
          >
            Back to Models
          </button>

        </div>
      </main>
    );
  }

  // ==============================
  // MODEL DETAILS PAGE
  // ==============================

  return (
    <main className="min-h-screen bg-[#080b16] text-white">

      {/* Background effects */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-96 w-96 rounded-full bg-purple-600/10 blur-[120px]" />

        <div className="absolute right-0 top-96 h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8">

        {/* Back button */}

        <button
          onClick={() => router.push("/models")}
          className="mb-10 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300 transition hover:border-purple-500 hover:text-white"
        >
          ← Back to Models
        </button>

        {/* Model heading */}

        <section className="mb-10">

          <div className="mb-5 inline-flex rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
            ✦ OneAtlas Model Details
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl">
              {model.name}
            </h1>

            <span className="rounded-lg bg-cyan-500/10 px-3 py-2 text-xs text-cyan-300">
              {model.modelType || "AI Model"}
            </span>

          </div>

          <p className="mt-5 max-w-4xl text-base leading-8 text-slate-400">
            {model.description ||
              "No description available for this model."}
          </p>

          <div className="mt-6 flex flex-wrap gap-3">

            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-purple-300">
              Laboratory: {model.lab?.name || "Unknown"}
            </span>

            <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
              Released: {formatDate(model.releaseDate)}
            </span>

          </div>

        </section>

        {/* Statistics */}

        <section className="mb-10 grid gap-5 md:grid-cols-3">

          <StatCard
            title="Context Window"
            value={formatContext(model.contextWindow)}
            color="text-cyan-300"
            icon="◈"
          />

          <StatCard
            title="Input Price"
            value={formatPrice(model.inputPrice)}
            color="text-emerald-400"
            icon="↓"
          />

          <StatCard
            title="Output Price"
            value={formatPrice(model.outputPrice)}
            color="text-blue-400"
            icon="↑"
          />

        </section>

        {/* Laboratory information */}

        <Section title="AI Laboratory Information">

          <h3 className="text-xl font-bold text-purple-300">
            {model.lab?.name || "Unknown Laboratory"}
          </h3>

          <p className="mt-3 leading-7 text-slate-400">
            {model.lab?.description ||
              "No laboratory description available."}
          </p>

          {model.lab?.website && (
            <a
              href={model.lab.website}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-block text-sm text-cyan-400 hover:underline"
            >
              Visit Laboratory Website →
            </a>
          )}

        </Section>

        {/* Capabilities */}

        <Section title="Model Capabilities">

          <div className="flex flex-wrap gap-3">

            {model.capabilities?.length > 0 ? (
              model.capabilities.map((item) => (
                <Tag key={item} color="purple">
                  {item}
                </Tag>
              ))
            ) : (
              <p className="text-slate-500">
                No capabilities specified.
              </p>
            )}

          </div>

        </Section>

        {/* Modalities */}

        <section className="mb-8 grid gap-5 md:grid-cols-2">

          <Section title="Input Modalities">

            <div className="flex flex-wrap gap-3">

              {model.inputModalities?.length > 0 ? (
                model.inputModalities.map((item) => (
                  <Tag key={item} color="cyan">
                    {item}
                  </Tag>
                ))
              ) : (
                <p className="text-slate-500">
                  Not specified
                </p>
              )}

            </div>

          </Section>

          <Section title="Output Modalities">

            <div className="flex flex-wrap gap-3">

              {model.outputModalities?.length > 0 ? (
                model.outputModalities.map((item) => (
                  <Tag key={item} color="blue">
                    {item}
                  </Tag>
                ))
              ) : (
                <p className="text-slate-500">
                  Not specified
                </p>
              )}

            </div>

          </Section>

        </section>

        {/* Providers */}

        <Section title="Available Providers">

          {model.providers?.length > 0 ? (

            <div className="grid gap-4 md:grid-cols-2">

              {model.providers.map((item, index) => (

                <div
                  key={item.id || `${item.provider.name}-${index}`}
                  className="rounded-xl border border-white/10 bg-black/20 p-5 transition hover:border-blue-500/40"
                >

                  <h3 className="text-lg font-bold text-blue-300">
                    {item.provider.name}
                  </h3>

                  <div className="mt-4 grid grid-cols-2 gap-3">

                    <div>
                      <p className="text-xs text-slate-500">
                        Input Price
                      </p>

                      <p className="mt-1 font-semibold text-emerald-400">
                        {formatPrice(item.inputPrice)}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500">
                        Output Price
                      </p>

                      <p className="mt-1 font-semibold text-cyan-300">
                        {formatPrice(item.outputPrice)}
                      </p>
                    </div>

                  </div>

                  {item.provider.website && (
                    <a
                      href={item.provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-4 inline-block text-sm text-purple-400 hover:underline"
                    >
                      Provider Website →
                    </a>
                  )}

                </div>

              ))}

            </div>

          ) : (
            <p className="text-slate-500">
              No providers listed.
            </p>
          )}

        </Section>

        {/* Benchmarks */}

        <Section title="Model Benchmarks">

          {model.benchmarks?.length > 0 ? (

            <div className="overflow-x-auto">

              <table className="w-full text-left text-sm">

                <thead>
                  <tr className="border-b border-white/10 text-slate-400">
                    <th className="px-4 py-4">Metric</th>
                    <th className="px-4 py-4">Value</th>
                  </tr>
                </thead>

                <tbody>

                  {model.benchmarks.map((benchmark, index) => (

                    Object.entries(benchmark)
                      .filter(
                        ([key]) =>
                          ![
                            "id",
                            "modelId",
                            "createdAt",
                            "updatedAt",
                          ].includes(key)
                      )
                      .map(([key, value]) => (

                        <tr
                          key={`${index}-${key}`}
                          className="border-b border-white/5"
                        >

                          <td className="px-4 py-4 text-slate-300">
                            {key}
                          </td>

                          <td className="px-4 py-4 text-cyan-300">
                            {getBenchmarkValue(value)}
                          </td>

                        </tr>

                      ))

                  ))}

                </tbody>

              </table>

            </div>

          ) : (

            <p className="text-slate-500">
              Benchmark information is not available yet.
            </p>

          )}

        </Section>

        {/* Footer */}

        <footer className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} OneAtlas. Discover the intelligence behind AI.
        </footer>

      </div>

    </main>
  );
}

// ==============================
// STATISTICS CARD
// ==============================

function StatCard({
  title,
  value,
  color,
  icon,
}: {
  title: string;
  value: string;
  color: string;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#11182b]/90 p-6 transition hover:-translate-y-1 hover:border-purple-500/40">

      <div className={`mb-4 text-2xl ${color}`}>
        {icon}
      </div>

      <p className="text-2xl font-bold">
        {value}
      </p>

      <p className="mt-2 text-sm text-slate-400">
        {title}
      </p>

    </div>
  );
}

// ==============================
// REUSABLE SECTION
// ==============================

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="mb-8 rounded-2xl border border-white/10 bg-[#11182b]/80 p-6 sm:p-8">

      <h2 className="mb-6 text-xl font-bold">
        {title}
      </h2>

      {children}

    </section>
  );
}

// ==============================
// REUSABLE TAGS
// ==============================

function Tag({
  children,
  color,
}: {
  children: ReactNode;
  color: "purple" | "cyan" | "blue";
}) {
  const colors = {
    purple:
      "border-purple-500/20 bg-purple-500/10 text-purple-300",

    cyan:
      "border-cyan-500/20 bg-cyan-500/10 text-cyan-300",

    blue:
      "border-blue-500/20 bg-blue-500/10 text-blue-300",
  };

  return (
    <span
      className={`rounded-full border px-4 py-2 text-sm ${colors[color]}`}
    >
      {children}
    </span>
  );
}

// ==============================
// PAGE WITH SUSPENSE
// ==============================

export default function ModelDetailsPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <ModelDetailsContent />
    </Suspense>
  );
}
