
"use client";

import { useEffect, useState, FormEvent } from "react";
import Link from "next/link";

interface Lab {
  id: string;
  name: string;
}

interface Provider {
  id: string;
  name: string;
}

interface Model {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  modelType: string | null;
  contextWindow: number;
  inputPrice: number;
  outputPrice: number;
  releaseDate: string | null;
  capabilities: string[];
  inputModalities: string[];
  outputModalities: string[];
  lab: Lab;
  providers: {
    provider: Provider;
    inputPrice: number;
    outputPrice: number;
  }[];
}

interface ApiResponse {
  success: boolean;
  data: Model[];
  pagination?: {
    page: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  message?: string;
}

const capabilities = ["text", "image", "audio", "video", "file"];

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [labs, setLabs] = useState<Lab[]>([]);
  const [providers, setProviders] = useState<Provider[]>([]);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [lab, setLab] = useState("");
  const [provider, setProvider] = useState("");
  const [capability, setCapability] = useState("");

  const [sortBy, setSortBy] = useState("createdAt");
  const [order, setOrder] = useState("desc");
  const [page, setPage] = useState(1);

  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Fetch labs and providers for filter dropdowns
  useEffect(() => {
    async function loadFilters() {
      try {
        const [labResponse, providerResponse] = await Promise.all([
          fetch("/api/labs"),
          fetch("/api/providers"),
        ]);

        const labResult = await labResponse.json();
        const providerResult = await providerResponse.json();

        if (labResult.success) {
          setLabs(labResult.data);
        }

        if (providerResult.success) {
          setProviders(providerResult.data);
        }
      } catch (err) {
        console.error("Filter loading error:", err);
      }
    }

    loadFilters();
  }, []);

  // Fetch models whenever filters or pagination change
  useEffect(() => {
    const controller = new AbortController();

    async function loadModels() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          page: String(page),
          limit: "9",
          sortBy,
          order,
        });

        if (search) params.set("search", search);
        if (lab) params.set("lab", lab);
        if (provider) params.set("provider", provider);
        if (capability) params.set("capability", capability);

        const response = await fetch(
          `/api/models?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Unable to load AI models.");
        }

        const result: ApiResponse = await response.json();

        if (!result.success) {
          throw new Error(result.message || "Something went wrong.");
        }

        setModels(result.data || []);
        setTotal(result.pagination?.total || 0);
        setTotalPages(result.pagination?.totalPages || 1);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load models."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadModels();

    return () => controller.abort();
  }, [page, search, lab, provider, capability, sortBy, order]);

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function clearFilters() {
    setSearchInput("");
    setSearch("");
    setLab("");
    setProvider("");
    setCapability("");
    setSortBy("createdAt");
    setOrder("desc");
    setPage(1);
  }

  function formatPrice(price: number) {
    if (price === 0) return "Free";
    if (price < 0.0001) return price.toExponential(2);
    return price.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  }

  function formatContext(value: number) {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }

    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }

    return value.toLocaleString();
  }

  return (
    <main className="min-h-screen bg-[#080b16] text-white">

      {/* Background decoration */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/3 h-96 w-96 rounded-full bg-purple-600/10 blur-[130px]" />
        <div className="absolute right-0 top-1/2 h-96 w-96 rounded-full bg-cyan-500/10 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8">

        {/* Page heading */}
        <div className="mb-10 animate-fade-up">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
            ✦ AI Intelligence Database
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Explore AI{" "}
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Models
            </span>
          </h1>

          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-400">
            Discover, search and compare AI models from leading
            research laboratories and providers around the world.
          </p>
        </div>

        {/* Statistics */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Total AI Models", value: total, icon: "✦" },
            { label: "Research Labs", value: labs.length, icon: "◇" },
            { label: "Model Providers", value: providers.length, icon: "⬡" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-[#11172a]/80 p-5 transition duration-300 hover:-translate-y-1 hover:border-purple-500/40"
            >
              <p className="text-sm text-slate-400">
                {item.icon} {item.label}
              </p>
              <p className="mt-3 text-3xl font-bold">
                {item.value}
              </p>
            </div>
          ))}
        </div>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-[#11172a] p-3 sm:flex-row"
        >
          <div className="flex flex-1 items-center gap-3 px-3">
            <span className="text-xl text-slate-400">⌕</span>

            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search models, labs or technologies..."
              className="w-full bg-transparent py-3 text-white outline-none placeholder:text-slate-500"
            />
          </div>

          <button
            type="submit"
            className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-500 px-8 py-3 font-semibold transition hover:scale-[1.02] hover:shadow-lg hover:shadow-purple-500/20"
          >
            Search Models →
          </button>
        </form>

        {/* Filters */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-[#11172a]/80 p-5">

          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">
              Advanced Filters
            </h2>

            <button
              onClick={clearFilters}
              type="button"
              className="text-sm text-purple-400 transition hover:text-purple-300"
            >
              ↻ Clear all filters
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                AI Laboratory
              </label>
              <select
                value={lab}
                onChange={(e) => {
                  setLab(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#080e20] p-3 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="">All Labs</option>
                {labs.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Provider
              </label>
              <select
                value={provider}
                onChange={(e) => {
                  setProvider(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#080e20] p-3 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="">All Providers</option>
                {providers.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Capability
              </label>
              <select
                value={capability}
                onChange={(e) => {
                  setCapability(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#080e20] p-3 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="">All Capabilities</option>
                {capabilities.map((item) => (
                  <option key={item} value={item}>
                    {item.charAt(0).toUpperCase() + item.slice(1)}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-400">
                Sort Models
              </label>
              <select
                value={`${sortBy}-${order}`}
                onChange={(e) => {
                  const [field, direction] = e.target.value.split("-");
                  setSortBy(field);
                  setOrder(direction);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#080e20] p-3 text-sm text-white outline-none focus:border-purple-500"
              >
                <option value="createdAt-desc">Newest Added</option>
                <option value="inputPrice-asc">Lowest Input Price</option>
                <option value="inputPrice-desc">Highest Input Price</option>
                <option value="outputPrice-asc">Lowest Output Price</option>
                <option value="outputPrice-desc">Highest Output Price</option>
                <option value="contextWindow-desc">Largest Context Window</option>
                <option value="releaseDate-desc">Latest Release Date</option>
              </select>
            </div>

          </div>
        </div>

        {/* Results heading */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold">
              AI Model Directory
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              {loading ? "Loading models..." : `Showing ${models.length} of ${total} models`}
            </p>
          </div>

          <div className="rounded-lg border border-white/10 bg-[#11172a] px-4 py-2 text-sm text-slate-300">
            Page {page} of {totalPages}
          </div>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((item) => (
              <div
                key={item}
                className="h-72 animate-pulse rounded-2xl border border-white/10 bg-[#11172a]"
              />
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <p className="text-lg font-semibold text-red-300">
              Unable to load models
            </p>
            <p className="mt-2 text-sm text-slate-400">{error}</p>
            <button
              onClick={() => setPage((current) => current)}
              className="mt-4 rounded-lg bg-red-500/20 px-5 py-2 text-sm text-red-200 hover:bg-red-500/30"
            >
              Try again
            </button>
          </div>
        )}

        {/* Model cards */}
        {!loading && !error && models.length > 0 && (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">

            {models.map((model, index) => (
              <article
                key={model.id}
                style={{ animationDelay: `${index * 70}ms` }}
                className="group animate-fade-up overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#151d33] to-[#0e1425] p-6 transition-all duration-300 hover:-translate-y-2 hover:border-purple-500/50 hover:shadow-xl hover:shadow-purple-950/30"
              >

                <div className="mb-5 flex items-center justify-between">
                  <span className="rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300">
                    {model.lab?.name || "Unknown Lab"}
                  </span>

                  <span className="text-xl text-purple-400 transition group-hover:rotate-90">
                    ✧
                  </span>
                </div>

                <h3 className="text-xl font-bold leading-snug transition group-hover:text-purple-300">
                  {model.name}
                </h3>

                <p className="mt-3 min-h-16 text-sm leading-6 text-slate-400">
                  {model.description || "No description available for this model."}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {model.capabilities?.slice(0, 4).map((item) => (
                    <span
                      key={item}
                      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-slate-300"
                    >
                      {item}
                    </span>
                  ))}
                </div>

                <div className="my-5 grid grid-cols-2 gap-3 border-y border-white/10 py-4">
                  <div>
                    <p className="text-xs text-slate-500">Input Price</p>
                    <p className="mt-1 font-semibold text-cyan-300">
                      ${formatPrice(model.inputPrice)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Output Price</p>
                    <p className="mt-1 font-semibold text-cyan-300">
                      ${formatPrice(model.outputPrice)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Context Window</p>
                    <p className="mt-1 font-semibold">
                      {formatContext(model.contextWindow)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-500">Providers</p>
                    <p className="mt-1 font-semibold">
                      {model.providers?.length || 0}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-slate-500">
                    {model.modelType || "AI Model"}
                  </span>

                  <Link
                    href={`/models/${model.slug}`}
                    className="rounded-lg bg-gradient-to-r from-purple-600 to-blue-500 px-4 py-2 text-sm font-semibold transition hover:scale-105"
                  >
                    View Details →
                  </Link>
                </div>

              </article>
            ))}

          </div>
        )}

        {/* Empty state */}
        {!loading && !error && models.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-[#11172a] px-6 py-16 text-center">
            <div className="text-5xl">⌕</div>
            <h3 className="mt-4 text-xl font-bold">
              No models found
            </h3>
            <p className="mt-2 text-sm text-slate-400">
              Try changing your search or filters.
            </p>
            <button
              onClick={clearFilters}
              className="mt-5 rounded-lg bg-purple-600 px-5 py-3 font-semibold hover:bg-purple-500"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {!loading && !error && totalPages > 1 && (
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">

            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-xl border border-white/10 bg-[#11172a] px-5 py-3 text-sm transition hover:border-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              ← Previous
            </button>

            <span className="rounded-xl bg-purple-600/20 px-5 py-3 text-sm font-semibold text-purple-300">
              {page} / {totalPages}
            </span>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-white/10 bg-[#11172a] px-5 py-3 text-sm transition hover:border-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Next →
            </button>

          </div>
        )}

        {/* Footer */}
        <div className="mt-16 border-t border-white/10 pt-8 text-center text-sm text-slate-500">
          OneAtlas · AI Intelligence Platform
        </div>

      </div>
    </main>
  );
}
