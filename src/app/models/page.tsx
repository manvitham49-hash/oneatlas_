
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Provider = {
  provider: {
    name: string;
  };
  inputPrice: number | string;
  outputPrice: number | string;
};

type Model = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  modelType: string | null;
  contextWindow: number;
  inputPrice: number | string;
  outputPrice: number | string;
  releaseDate: string | null;
  inputModalities: string[];
  outputModalities: string[];
  capabilities: string[];
  lab: {
    name: string;
  } | null;
  providers: Provider[];
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
};

type ApiResponse = {
  success: boolean;
  data: Model[];
  pagination: Pagination;
  message?: string;
};

const PAGE_SIZE = 12;

const SORT_OPTIONS = [
  { label: "Newest first", value: "releaseDate", order: "desc" },
  { label: "Oldest first", value: "releaseDate", order: "asc" },
  { label: "Lowest input price", value: "inputPrice", order: "asc" },
  { label: "Highest input price", value: "inputPrice", order: "desc" },
  { label: "Largest context window", value: "contextWindow", order: "desc" },
  { label: "Recently added", value: "createdAt", order: "desc" },
];

const EMPTY_PAGINATION: Pagination = {
  page: 1,
  limit: PAGE_SIZE,
  total: 0,
  totalPages: 0,
  hasNextPage: false,
  hasPreviousPage: false,
};

// ========================================
// CLEAN MODEL NAME
// ========================================

// Removes "(batch)" only from the displayed name.
// Does not modify the database name or model slug.

function formatModelName(name: string | null | undefined) {
  if (!name) return "Unknown Model";

  return name
    .replace(/\s*\(batch\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ========================================
// HELPER FUNCTIONS
// ========================================

function formatPrice(price: number | string | null | undefined) {
  const value = Number(price);

  if (!Number.isFinite(value)) return "N/A";
  if (value === 0) return "Free";
  if (Math.abs(value) < 0.0001) return value.toExponential(2);

  return value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
}

function formatContext(value: number | null | undefined) {
  if (!value || value <= 0) return "N/A";

  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)}K`;
  }

  return value.toLocaleString();
}

function getSlugUrl(slug: string) {
  return `/models/${slug
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

// ========================================
// STATISTICS CARD
// ========================================

function StatCard({
  label,
  value,
  icon,
  color,
  delay,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
  delay: number;
}) {
  return (
    <div
      className="group rounded-2xl border border-white/[0.08] bg-[#11182b]/80 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-purple-500/40 animate-fade-up"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`mb-4 text-2xl ${color}`}>{icon}</div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm text-slate-400">{label}</p>
    </div>
  );
}

// ========================================
// FILTER INPUT
// ========================================

function FilterInput({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </label>

      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-white/10 bg-[#080e1d] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-purple-500"
      />
    </div>
  );
}

// ========================================
// MODEL SKELETON
// ========================================

function ModelSkeleton() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#11182b] p-6">
      <div className="h-7 w-28 animate-pulse rounded bg-white/10" />
      <div className="mt-6 h-7 w-3/4 animate-pulse rounded bg-white/10" />
      <div className="mt-4 h-4 animate-pulse rounded bg-white/5" />
      <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-white/5" />
      <div className="mt-8 h-20 animate-pulse rounded-xl bg-white/5" />
      <div className="mt-6 h-12 animate-pulse rounded-xl bg-white/10" />
    </div>
  );
}

// ========================================
// MAIN MODELS PAGE
// ========================================

export default function ModelsPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [lab, setLab] = useState("");
  const [provider, setProvider] = useState("");
  const [capability, setCapability] = useState("");

  const [sortIndex, setSortIndex] = useState("0");
  const [page, setPage] = useState(1);
  const [refreshKey, setRefreshKey] = useState(0);
  const [year, setYear] = useState(2026);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Comparison selection
  const [selectedModels, setSelectedModels] = useState<Model[]>([]);

  const [pagination, setPagination] =
    useState<Pagination>(EMPTY_PAGINATION);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  // ========================================
  // FETCH MODELS
  // ========================================

  useEffect(() => {
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        setError("");

        const selectedSort =
          SORT_OPTIONS[Number(sortIndex)] ?? SORT_OPTIONS[0];

        const params = new URLSearchParams({
          page: page.toString(),
          limit: PAGE_SIZE.toString(),
          sortBy: selectedSort.value,
          order: selectedSort.order,
        });

        if (search.trim()) params.set("search", search.trim());
        if (lab.trim()) params.set("lab", lab.trim());
        if (provider.trim()) params.set("provider", provider.trim());

        if (capability.trim()) {
          params.set("capability", capability.trim());
        }

        const response = await fetch(
          `/api/models?${params.toString()}`,
          {
            method: "GET",
            headers: { Accept: "application/json" },
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error(
            `Unable to load models. Server returned ${response.status}.`
          );
        }

        const result: ApiResponse = await response.json();

        if (!result.success) {
          throw new Error(
            result.message || "Unable to fetch AI models."
          );
        }

        if (controller.signal.aborted) return;

        setModels(Array.isArray(result.data) ? result.data : []);
        setPagination(result.pagination ?? EMPTY_PAGINATION);
      } catch (err) {
        if (
          err instanceof Error &&
          err.name !== "AbortError"
        ) {
          setError(err.message);
          setModels([]);
          setPagination(EMPTY_PAGINATION);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, 350);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [
    search,
    lab,
    provider,
    capability,
    page,
    sortIndex,
    refreshKey,
  ]);

  // ========================================
  // COMPARISON SELECTION LOGIC
  // ========================================

  const toggleCompare = useCallback((model: Model) => {
    setSelectedModels((current) => {
      const alreadySelected = current.some(
        (item) => item.id === model.id
      );

      if (alreadySelected) {
        return current.filter((item) => item.id !== model.id);
      }

      if (current.length >= 2) {
        return current;
      }

      return [...current, model];
    });
  }, []);

  const clearComparison = useCallback(() => {
    setSelectedModels([]);
  }, []);

  const isSelected = (modelId: string) =>
    selectedModels.some((item) => item.id === modelId);

  const compareModels = () => {
    if (selectedModels.length !== 2) return;

    const params = new URLSearchParams({
      first: selectedModels[0].slug,
      second: selectedModels[1].slug,
    });

    window.location.href = `/models/compare?${params.toString()}`;
  };

  // ========================================
  // FILTER LOGIC
  // ========================================

  const hasFilters = Boolean(
    search.trim() ||
      lab.trim() ||
      provider.trim() ||
      capability.trim()
  );

  const activeFilterCount = useMemo(
    () =>
      [search, lab, provider, capability].filter(
        (value) => value.trim().length > 0
      ).length,
    [search, lab, provider, capability]
  );

  const clearFilters = useCallback(() => {
    setSearch("");
    setLab("");
    setProvider("");
    setCapability("");
    setSortIndex("0");
    setPage(1);
  }, []);

  const retry = () => {
    setRefreshKey((current) => current + 1);
  };

  const goToPage = (nextPage: number) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ========================================
  // PAGE UI
  // ========================================

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b16] text-white">

      {/* Background effects */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/4 h-[450px] w-[450px] rounded-full bg-purple-600/10 blur-[140px]" />
        <div className="absolute top-[600px] -right-40 h-[450px] w-[450px] rounded-full bg-blue-500/10 blur-[140px]" />
        <div className="absolute bottom-0 left-0 h-[350px] w-[350px] rounded-full bg-cyan-500/5 blur-[130px]" />
      </div>

      <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:py-16">

        {/* Hero */}

        <section className="mb-12 animate-fade-up">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm text-purple-300">
            <span className="animate-pulse">✦</span>
            OneAtlas Discovery
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
            Explore AI{" "}
            <span className="bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Models.
            </span>
          </h1>

          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-400 sm:text-lg">
            Discover, compare and explore AI models from leading
            research laboratories and providers around the world.
            Find the perfect intelligence for your next big idea.
          </p>

          <div className="mt-7 flex flex-wrap gap-3 text-xs text-slate-400">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
              ✦ AI Model Discovery
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
              ◈ Smart Comparison
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2">
              ↗ Real-time Data
            </span>
          </div>
        </section>

        {/* Statistics */}

        <section className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Matching AI Models"
            value={pagination.total.toLocaleString()}
            icon="✦"
            color="text-purple-400"
            delay={100}
          />

          <StatCard
            label="Models displayed"
            value={models.length.toString()}
            icon="◈"
            color="text-cyan-400"
            delay={200}
          />

          <StatCard
            label="Current page"
            value={`${page} / ${Math.max(1, pagination.totalPages)}`}
            icon="↗"
            color="text-emerald-400"
            delay={300}
          />
        </section>

        {/* Search */}

        <section className="mb-6 rounded-2xl border border-white/10 bg-[#11182b]/90 p-5 shadow-xl backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-white">
                Find Your AI Model
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Search by model name, laboratory or description
              </p>
            </div>
            <span className="text-2xl text-purple-400">⌕</span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#080e1d] px-4 focus-within:border-purple-500">
              <span className="text-2xl text-purple-400">⌕</span>

              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search models, descriptions, slugs..."
                aria-label="Search AI models"
                className="w-full bg-transparent py-4 text-sm text-white outline-none placeholder:text-slate-500"
              />

              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={() => setPage(1)}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-8 py-4 font-semibold transition hover:scale-[1.02] active:scale-95"
            >
              Search Models →
            </button>
          </div>
        </section>

        {/* Filters */}

        <section className="mb-10 rounded-2xl border border-white/10 bg-[#11182b]/80 p-5 backdrop-blur-xl">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-white">
                ⚙ Filters & Preferences
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Refine your model discovery
              </p>
            </div>

            <div className="flex items-center gap-3">
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-purple-500/15 px-3 py-1 text-xs text-purple-300">
                  {activeFilterCount} active
                </span>
              )}

              <button
                type="button"
                onClick={clearFilters}
                className="text-sm text-purple-400 hover:text-purple-300"
              >
                Clear all ↺
              </button>

              <button
                type="button"
                onClick={() =>
                  setMobileFiltersOpen((current) => !current)
                }
                className="rounded-lg border border-white/10 px-3 py-2 text-xs text-slate-300 lg:hidden"
              >
                {mobileFiltersOpen ? "Hide ▲" : "Show ▼"}
              </button>
            </div>
          </div>

          <div
            className={`mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 ${
              mobileFiltersOpen ? "" : "hidden lg:grid"
            }`}
          >
            <FilterInput
              label="AI Laboratory"
              placeholder="e.g. Google"
              value={lab}
              onChange={(value) => {
                setLab(value);
                setPage(1);
              }}
            />

            <FilterInput
              label="Provider"
              placeholder="e.g. OpenRouter"
              value={provider}
              onChange={(value) => {
                setProvider(value);
                setPage(1);
              }}
            />

            <FilterInput
              label="Capability"
              placeholder="e.g. reasoning"
              value={capability}
              onChange={(value) => {
                setCapability(value);
                setPage(1);
              }}
            />

            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Sort models
              </label>

              <select
                value={sortIndex}
                onChange={(e) => {
                  setSortIndex(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#080e1d] px-3 py-3 text-sm text-white outline-none focus:border-purple-500"
              >
                {SORT_OPTIONS.map((option, index) => (
                  <option key={option.label} value={index.toString()}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {hasFilters && (
            <div className="mt-5 flex flex-wrap gap-2 border-t border-white/5 pt-4">
              <span className="mr-2 text-xs text-slate-500">
                Active filters:
              </span>

              {search.trim() && (
                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
                  Search: {search}
                </span>
              )}

              {lab.trim() && (
                <span className="rounded-full bg-blue-500/10 px-3 py-1 text-xs text-blue-300">
                  Lab: {lab}
                </span>
              )}

              {provider.trim() && (
                <span className="rounded-full bg-cyan-500/10 px-3 py-1 text-xs text-cyan-300">
                  Provider: {provider}
                </span>
              )}

              {capability.trim() && (
                <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">
                  Capability: {capability}
                </span>
              )}
            </div>
          )}
        </section>

        {/* Comparison selection panel */}

        <section className="mb-10 rounded-2xl border border-purple-500/30 bg-gradient-to-br from-[#17152f] to-[#11182b] p-6 shadow-xl shadow-purple-900/10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl text-purple-400">⇄</span>
                <h2 className="text-xl font-bold">
                  Compare AI Models
                </h2>
              </div>

              <p className="mt-2 text-sm text-slate-400">
                Select two models to compare their features,
                pricing and performance.
              </p>
            </div>

            <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-2 text-sm font-semibold text-purple-300">
              {selectedModels.length} / 2 Selected
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[0, 1].map((index) => (
              <div
                key={index}
                className="flex min-h-16 items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-4"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/15 text-purple-300">
                  {index + 1}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-xs text-slate-500">
                    MODEL {index + 1}
                  </p>

                  {/* UPDATED: clean selected model name */}

                  <p className="truncate font-semibold text-white">
                    {selectedModels[index]
                      ? formatModelName(selectedModels[index].name)
                      : "No model selected"}
                  </p>
                </div>

                {selectedModels[index] && (
                  <button
                    type="button"
                    onClick={() =>
                      toggleCompare(selectedModels[index])
                    }
                    aria-label={`Remove ${formatModelName(
                      selectedModels[index].name
                    )}`}
                    className="rounded-lg px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={compareModels}
              disabled={selectedModels.length !== 2}
              className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Compare Selected Models →
            </button>

            <button
              type="button"
              onClick={clearComparison}
              disabled={selectedModels.length === 0}
              className="rounded-xl border border-white/10 px-6 py-3 text-sm text-slate-300 transition hover:border-red-500/50 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear Selection
            </button>
          </div>

          {selectedModels.length === 1 && (
            <p className="mt-3 text-xs text-purple-300">
              Select one more model to start comparing.
            </p>
          )}

          {selectedModels.length === 2 && (
            <p className="mt-3 text-xs text-emerald-400">
              Both models selected! You can compare them now.
            </p>
          )}
        </section>

        {/* Results heading */}

        <section className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold sm:text-3xl">
              Discover Models
            </h2>

            <p className="mt-2 text-sm text-slate-400">
              {loading
                ? "Finding AI models..."
                : `${pagination.total.toLocaleString()} matching models found`}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span
              className={`h-2 w-2 rounded-full ${
                loading ? "animate-pulse bg-yellow-400" : "bg-emerald-400"
              }`}
            />
            {loading ? "Updating results" : "Data loaded"}
          </div>
        </section>

        {/* Loading */}

        {loading && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <ModelSkeleton key={index} />
            ))}
          </section>
        )}

        {/* Error */}

        {!loading && error && (
          <section className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
            <div className="mb-4 text-4xl">⚠</div>

            <h3 className="mb-3 text-xl font-semibold text-red-300">
              Unable to load models
            </h3>

            <p className="mb-6 text-sm text-slate-400">
              {error}
            </p>

            <button
              type="button"
              onClick={retry}
              className="rounded-xl bg-red-500/20 px-6 py-3 text-sm font-semibold text-red-200 hover:bg-red-500/30"
            >
              ↻ Try Again
            </button>
          </section>
        )}

        {/* Empty */}

        {!loading && !error && models.length === 0 && (
          <section className="rounded-2xl border border-white/10 bg-[#11182b] px-6 py-20 text-center">
            <div className="mb-5 text-6xl text-purple-400">⌕</div>

            <h3 className="text-2xl font-bold">
              No models found
            </h3>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-400">
              We couldn't find any AI models matching your search.
              Try different keywords or remove some filters.
            </p>

            <button
              type="button"
              onClick={clearFilters}
              className="mt-7 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-7 py-3 font-semibold hover:scale-105"
            >
              Clear All Filters
            </button>
          </section>
        )}

        {/* Model cards */}

        {!loading && !error && models.length > 0 && (
          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {models.map((model, index) => {
              const selected = isSelected(model.id);
              const selectionFull = selectedModels.length >= 2;

              // UPDATED: clean display name for every card.

              const displayName = formatModelName(model.name);

              return (
                <article
                  key={model.id}
                  className={`group relative flex animate-fade-up flex-col overflow-hidden rounded-2xl border bg-gradient-to-br from-[#151e33] to-[#0e1425] p-6 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-purple-900/20 ${
                    selected
                      ? "border-purple-500 shadow-lg shadow-purple-900/20"
                      : "border-white/[0.08] hover:border-purple-500/50"
                  }`}
                  style={{
                    animationDelay: `${index * 70}ms`,
                  }}
                >
                  {/* Header */}

                  <div className="relative mb-5 flex items-start justify-between gap-3">
                    <span className="max-w-[75%] truncate rounded-lg border border-purple-500/20 bg-purple-500/10 px-3 py-1.5 text-xs font-semibold text-purple-300">
                      {model.lab?.name || "Unknown Lab"}
                    </span>

                    <span className="text-xl text-purple-400 transition group-hover:rotate-45">
                      ✦
                    </span>
                  </div>

                  {/* UPDATED MODEL NAME */}

                  <h3 className="relative text-xl font-bold leading-snug transition-colors group-hover:text-purple-300">
                    {displayName}
                  </h3>

                  {/* Description */}

                  <p className="relative mt-3 line-clamp-3 min-h-[72px] text-sm leading-6 text-slate-400">
                    {model.description ||
                      "No description available for this model."}
                  </p>

                  {/* Type */}

                  <div className="relative mt-4">
                    <span className="rounded-md border border-white/5 bg-white/[0.04] px-3 py-1 text-xs text-slate-300">
                      {model.modelType || "General purpose"}
                    </span>
                  </div>

                  {/* Context */}

                  <div className="relative my-5 rounded-xl border border-white/5 bg-black/20 p-4">
                    <p className="text-xs text-slate-500">
                      Context Window
                    </p>

                    <p className="mt-2 text-3xl font-bold text-cyan-300">
                      {formatContext(model.contextWindow)}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Tokens
                    </p>
                  </div>

                  {/* Pricing */}

                  <div className="relative mb-6 grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <p className="text-xs text-slate-500">
                        Input Price
                      </p>

                      <p className="mt-2 break-all text-sm font-bold text-emerald-400">
                        {formatPrice(model.inputPrice)}
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                      <p className="text-xs text-slate-500">
                        Output Price
                      </p>

                      <p className="mt-2 break-all text-sm font-bold text-blue-400">
                        {formatPrice(model.outputPrice)}
                      </p>
                    </div>
                  </div>

                  {/* Capabilities */}

                  <div className="relative mb-5">
                    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Capabilities
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(model.capabilities ?? []).slice(0, 4).map((item) => (
                        <span
                          key={item}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-slate-300"
                        >
                          {item}
                        </span>
                      ))}

                      {(model.capabilities ?? []).length > 4 && (
                        <span className="text-xs text-purple-400">
                          +{model.capabilities.length - 4} more
                        </span>
                      )}

                      {(model.capabilities ?? []).length === 0 && (
                        <span className="text-xs text-slate-500">
                          Not specified
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Modalities */}

                  <div className="relative mb-5">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Input / Output
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(model.inputModalities ?? []).slice(0, 3).map((item) => (
                        <span
                          key={`in-${item}`}
                          className="rounded-md bg-cyan-500/10 px-2 py-1 text-xs text-cyan-300"
                        >
                          {item}
                        </span>
                      ))}

                      {(model.outputModalities ?? []).slice(0, 3).map((item) => (
                        <span
                          key={`out-${item}`}
                          className="rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-300"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Providers */}

                  <div className="relative mb-6">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Providers
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {(model.providers ?? []).slice(0, 3).map((item, i) => (
                        <span
                          key={`${item.provider.name}-${i}`}
                          className="rounded-md bg-blue-500/10 px-2 py-1 text-xs text-blue-300"
                        >
                          {item.provider.name}
                        </span>
                      ))}

                      {(model.providers ?? []).length === 0 && (
                        <span className="text-xs text-slate-500">
                          No providers listed
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Release date */}

                  {model.releaseDate && (
                    <div className="relative mb-5 text-xs text-slate-500">
                      Release date:{" "}
                      <span className="text-slate-300">
                        {new Date(model.releaseDate).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            timeZone: "UTC",
                          }
                        )}
                      </span>
                    </div>
                  )}

                  {/* Model details */}

                  <Link
                    href={getSlugUrl(model.slug)}
                    className="relative mt-auto flex items-center justify-center gap-2 rounded-xl border border-purple-500/30 bg-purple-500/10 px-4 py-3 text-sm font-semibold text-purple-300 transition hover:border-purple-500 hover:bg-gradient-to-r hover:from-purple-600 hover:to-blue-600 hover:text-white"
                  >
                    Explore Model Details →
                  </Link>

                  {/* Compare button */}

                  <button
                    type="button"
                    onClick={() => toggleCompare(model)}
                    disabled={!selected && selectionFull}
                    className={`relative mt-3 flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-300 ${
                      selected
                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-red-500/10 hover:text-red-300"
                        : selectionFull
                        ? "cursor-not-allowed border-white/5 bg-white/5 text-slate-600"
                        : "border-blue-500/30 bg-blue-500/10 text-blue-300 hover:border-blue-500 hover:bg-blue-600 hover:text-white"
                    }`}
                  >
                    {selected
                      ? "✓ Added to Compare · Remove"
                      : selectionFull
                      ? "Maximum 2 Models Selected"
                      : "+ Add to Compare"}
                  </button>

                  {selected && (
                    <span className="absolute right-4 top-16 rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-bold text-emerald-300">
                      SELECTED
                    </span>
                  )}
                </article>
              );
            })}
          </section>
        )}

        {/* Pagination */}

        {!loading && !error && pagination.totalPages > 0 && (
          <section className="mt-12 flex flex-wrap items-center justify-between gap-5 rounded-2xl border border-white/10 bg-[#11182b]/90 p-5">
            <div>
              <p className="text-sm text-slate-400">
                Showing page{" "}
                <span className="font-bold text-white">{page}</span>{" "}
                of{" "}
                <span className="font-bold text-white">
                  {pagination.totalPages}
                </span>
              </p>

              <p className="mt-1 text-xs text-slate-500">
                {pagination.total.toLocaleString()} total matching models
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={!pagination.hasPreviousPage}
                onClick={() => goToPage(page - 1)}
                className="rounded-xl border border-white/10 px-5 py-3 text-sm transition hover:border-purple-500 disabled:cursor-not-allowed disabled:opacity-30"
              >
                ← Previous
              </button>

              <button
                type="button"
                disabled={!pagination.hasNextPage}
                onClick={() => goToPage(page + 1)}
                className="rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-5 py-3 text-sm font-semibold transition hover:scale-105 disabled:cursor-not-allowed disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </section>
        )}

        {/* Footer */}

        <footer className="mt-20 border-t border-white/10 pt-8 text-center">
          <div className="mb-3 text-lg font-extrabold">
            <span className="text-purple-400">One</span>
            <span className="text-white">Atlas.</span>
          </div>

          <p className="text-sm text-slate-500">
            Discover the intelligence behind AI.
          </p>

          <p className="mt-3 text-xs text-slate-600">
            © {year} OneAtlas. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
}
