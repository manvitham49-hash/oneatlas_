
"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useRouter, useSearchParams } from "next/navigation";

// -------------------- TYPES --------------------

type Provider = {
  provider?: {
    id?: string;
    name: string;
  };
};

type Benchmark = {
  id: string;
  name: string;
  score: number;
  category: string | null;
  modelId: string;
  createdAt: string;
};

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

  lab?: {
    name: string;
  };

  providers?: Provider[];
  benchmarks?: Benchmark[];
};

type BenchmarkRow = {
  name: string;
  category: string | null;
  first?: Benchmark;
  second?: Benchmark;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  message?: string;
};

// -------------------- HELPER FUNCTIONS --------------------

function formatModelName(name: string | null | undefined) {
  if (!name) return "Unknown Model";

  return name
    .replace(/\s*\(batch\)\s*/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function formatPrice(price: number | undefined) {
  if (price === undefined || price === null) return "N/A";

  return `$${price.toFixed(4)}`;
}

function formatContextWindow(value: number | undefined) {
  if (!value) return "N/A";

  return value.toLocaleString() + " tokens";
}

function formatDate(value: string | null | undefined) {
  if (!value) return "N/A";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "N/A";

  return date.toLocaleDateString();
}

function formatScore(score: number | undefined) {
  if (score === undefined || score === null) return "—";

  return score.toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function getApiData<T>(result: ApiResponse<T> | T): T {
  if (
    result &&
    typeof result === "object" &&
    "data" in result &&
    (result as ApiResponse<T>).data !== undefined
  ) {
    return (result as ApiResponse<T>).data as T;
  }

  return result as T;
}

function getLatestBenchmarks(benchmarks: Benchmark[] = []) {
  const latest = new Map<string, Benchmark>();

  benchmarks.forEach((benchmark) => {
    const existing = latest.get(benchmark.name);

    if (
      !existing ||
      new Date(benchmark.createdAt).getTime() >
        new Date(existing.createdAt).getTime()
    ) {
      latest.set(benchmark.name, benchmark);
    }
  });

  return Array.from(latest.values());
}

function getProviders(model: Model) {
  return (
    model.providers
      ?.map((item) => item.provider?.name)
      .filter((name): name is string => Boolean(name)) ?? []
  );
}

// -------------------- MAIN COMPARISON CONTENT --------------------

function ComparePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [models, setModels] = useState<Model[]>([]);

  const [firstSlug, setFirstSlug] = useState("");
  const [secondSlug, setSecondSlug] = useState("");

  const [firstModel, setFirstModel] = useState<Model | null>(null);
  const [secondModel, setSecondModel] = useState<Model | null>(null);

  const [modelsLoading, setModelsLoading] = useState(true);
  const [comparisonLoading, setComparisonLoading] = useState(false);

  const [error, setError] = useState("");

  // Benchmark category filter
  const [selectedCategory, setSelectedCategory] = useState("All");

  // -------------------- LOAD MODELS --------------------

  useEffect(() => {
    async function loadModels() {
      try {
        setModelsLoading(true);

        const response = await fetch("/api/models?page=1&limit=100");

        if (!response.ok) {
          throw new Error("Unable to load models.");
        }

        const result = await response.json();

        const data = getApiData<Model[]>(result);

        setModels(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong."
        );
      } finally {
        setModelsLoading(false);
      }
    }

    loadModels();
  }, []);

  // -------------------- READ URL PARAMETERS --------------------

  useEffect(() => {
    setFirstSlug(searchParams.get("first") || "");
    setSecondSlug(searchParams.get("second") || "");
  }, [searchParams]);

  // -------------------- FETCH MODEL BY SLUG --------------------

  const fetchModel = useCallback(async (slug: string) => {
    const path = slug
      .split("/")
      .map((part) => encodeURIComponent(part))
      .join("/");

    const response = await fetch(`/api/models/${path}`);

    if (!response.ok) {
      throw new Error(`Could not load model: ${slug}`);
    }

    const result = await response.json();

    const model = getApiData<Model>(result);

    if (!model || !model.id) {
      throw new Error(`Model not found: ${slug}`);
    }

    return model;
  }, []);

  // -------------------- LOAD SELECTED MODELS --------------------

  useEffect(() => {
    let cancelled = false;

    async function loadComparison() {
      if (!firstSlug || !secondSlug) {
        setFirstModel(null);
        setSecondModel(null);
        setComparisonLoading(false);
        return;
      }

      if (firstSlug === secondSlug) {
        setFirstModel(null);
        setSecondModel(null);
        setComparisonLoading(false);
        setError("Please select two different models.");
        return;
      }

      try {
        setComparisonLoading(true);
        setError("");

        const [first, second] = await Promise.all([
          fetchModel(firstSlug),
          fetchModel(secondSlug),
        ]);

        if (!cancelled) {
          setFirstModel(first);
          setSecondModel(second);
        }
      } catch (err) {
        if (!cancelled) {
          setFirstModel(null);
          setSecondModel(null);

          setError(
            err instanceof Error
              ? err.message
              : "Unable to compare these models."
          );
        }
      } finally {
        if (!cancelled) {
          setComparisonLoading(false);
        }
      }
    }

    loadComparison();

    return () => {
      cancelled = true;
    };
  }, [firstSlug, secondSlug, fetchModel]);

  // -------------------- UPDATE URL AND SELECTION --------------------

  function updateComparison(first: string, second: string) {
    setError("");

    setFirstSlug(first);
    setSecondSlug(second);

    const params = new URLSearchParams();

    if (first) params.set("first", first);
    if (second) params.set("second", second);

    const query = params.toString();

    router.replace(
      query
        ? `/models/compare?${query}`
        : "/models/compare",
      { scroll: false }
    );
  }

  function handleFirstChange(value: string) {
    if (value && value === secondSlug) {
      setError("Please select two different models.");
      return;
    }

    updateComparison(value, secondSlug);
  }

  function handleSecondChange(value: string) {
    if (value && value === firstSlug) {
      setError("Please select two different models.");
      return;
    }

    updateComparison(firstSlug, value);
  }

  // -------------------- SWAP MODELS --------------------

  function swapModels() {
    updateComparison(secondSlug, firstSlug);
  }

  // -------------------- CLEAR COMPARISON --------------------

  function clearComparison() {
    updateComparison("", "");

    setFirstModel(null);
    setSecondModel(null);
    setSelectedCategory("All");
  }

  // -------------------- BENCHMARK COMPARISON --------------------

  const benchmarkRows = useMemo(() => {
    const benchmarkMap = new Map<string, BenchmarkRow>();

    const firstBenchmarks = getLatestBenchmarks(
      firstModel?.benchmarks
    );

    const secondBenchmarks = getLatestBenchmarks(
      secondModel?.benchmarks
    );

    firstBenchmarks.forEach((benchmark) => {
      benchmarkMap.set(benchmark.name, {
        name: benchmark.name,
        category: benchmark.category,
        first: benchmark,
      });
    });

    secondBenchmarks.forEach((benchmark) => {
      const existing = benchmarkMap.get(benchmark.name);

      if (existing) {
        existing.second = benchmark;

        if (!existing.category && benchmark.category) {
          existing.category = benchmark.category;
        }
      } else {
        benchmarkMap.set(benchmark.name, {
          name: benchmark.name,
          category: benchmark.category,
          second: benchmark,
        });
      }
    });

    return Array.from(benchmarkMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }, [firstModel, secondModel]);

  // -------------------- BENCHMARK CATEGORIES --------------------

  const benchmarkCategories = useMemo(() => {
    const categories = new Set<string>();

    benchmarkRows.forEach((row) => {
      categories.add(row.category || "Uncategorized");
    });

    return ["All", ...Array.from(categories).sort()];
  }, [benchmarkRows]);

  // -------------------- FILTER BENCHMARKS --------------------

  const filteredBenchmarkRows = useMemo(() => {
    if (selectedCategory === "All") {
      return benchmarkRows;
    }

    return benchmarkRows.filter(
      (row) =>
        (row.category || "Uncategorized") === selectedCategory
    );
  }, [benchmarkRows, selectedCategory]);

  // -------------------- DISPLAY HELPERS --------------------

  function renderList(items: string[] | undefined) {
    if (!items || items.length === 0) return "N/A";

    return items.join(", ");
  }

  // -------------------- MODEL SPECIFICATIONS --------------------

  const comparisonDetails = [
    {
      label: "Model Type",
      first: firstModel?.modelType || "N/A",
      second: secondModel?.modelType || "N/A",
    },
    {
      label: "Lab",
      first: firstModel?.lab?.name || "N/A",
      second: secondModel?.lab?.name || "N/A",
    },
    {
      label: "Context Window",
      first: formatContextWindow(firstModel?.contextWindow),
      second: formatContextWindow(secondModel?.contextWindow),
    },
    {
      label: "Input Price",
      first: formatPrice(firstModel?.inputPrice),
      second: formatPrice(secondModel?.inputPrice),
    },
    {
      label: "Output Price",
      first: formatPrice(firstModel?.outputPrice),
      second: formatPrice(secondModel?.outputPrice),
    },
    {
      label: "Release Date",
      first: formatDate(firstModel?.releaseDate),
      second: formatDate(secondModel?.releaseDate),
    },
    {
      label: "Input Modalities",
      first: renderList(firstModel?.inputModalities),
      second: renderList(secondModel?.inputModalities),
    },
    {
      label: "Output Modalities",
      first: renderList(firstModel?.outputModalities),
      second: renderList(secondModel?.outputModalities),
    },
    {
      label: "Capabilities",
      first: renderList(firstModel?.capabilities),
      second: renderList(secondModel?.capabilities),
    },
    {
      label: "Providers",
      first: firstModel
        ? renderList(getProviders(firstModel))
        : "N/A",
      second: secondModel
        ? renderList(getProviders(secondModel))
        : "N/A",
    },
    {
      label: "Description",
      first: firstModel?.description || "No description available.",
      second: secondModel?.description || "No description available.",
    },
    {
      label: "Benchmark Records",
      first: String(firstModel?.benchmarks?.length ?? 0),
      second: String(secondModel?.benchmarks?.length ?? 0),
    },
  ];

  // -------------------- PAGE UI --------------------

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-white sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl">

        {/* PAGE HEADING */}

        <div className="mb-10 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
            OneAtlas
          </p>

          <h1 className="text-3xl font-bold sm:text-4xl">
            Compare AI Models
          </h1>

          <p className="mx-auto mt-3 max-w-2xl text-gray-400">
            Compare AI models side by side, including their
            specifications, pricing, capabilities and benchmark scores.
          </p>
        </div>

        {/* MODEL SELECTORS */}

        <section className="mb-8 rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:p-7">

          <h2 className="mb-5 text-xl font-semibold">
            Select Models
          </h2>

          {modelsLoading ? (
            <p className="text-gray-400">
              Loading available models...
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {/* FIRST MODEL */}

              <div>
                <label
                  htmlFor="firstModel"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  First Model
                </label>

                <select
                  id="firstModel"
                  value={firstSlug}
                  onChange={(e) =>
                    handleFirstChange(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select first model</option>

                  {models.map((model) => (
                    <option key={model.id} value={model.slug}>
                      {formatModelName(model.name)}
                    </option>
                  ))}
                </select>
              </div>

              {/* SECOND MODEL */}

              <div>
                <label
                  htmlFor="secondModel"
                  className="mb-2 block text-sm font-medium text-gray-300"
                >
                  Second Model
                </label>

                <select
                  id="secondModel"
                  value={secondSlug}
                  onChange={(e) =>
                    handleSecondChange(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="">Select second model</option>

                  {models.map((model) => (
                    <option
                      key={model.id}
                      value={model.slug}
                      disabled={model.slug === firstSlug}
                    >
                      {formatModelName(model.name)}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          )}

          {/* ACTION BUTTONS */}

          <div className="mt-6 flex flex-wrap gap-3">

            <button
              onClick={swapModels}
              disabled={!firstSlug || !secondSlug}
              className="rounded-lg border border-gray-700 px-5 py-2.5 text-sm font-medium transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              ⇄ Swap Models
            </button>

            <button
              onClick={clearComparison}
              disabled={!firstSlug && !secondSlug}
              className="rounded-lg border border-red-900 px-5 py-2.5 text-sm font-medium text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear Selection
            </button>

          </div>
        </section>

        {/* ERROR MESSAGE */}

        {error && (
          <div className="mb-6 rounded-lg border border-red-800 bg-red-950/40 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* LOADING */}

        {comparisonLoading && (
          <div className="rounded-xl border border-gray-800 bg-gray-900 p-10 text-center text-gray-400">
            Loading model comparison...
          </div>
        )}

        {/* EMPTY STATE */}

        {!comparisonLoading &&
          (!firstModel || !secondModel) && (
            <div className="rounded-2xl border border-dashed border-gray-700 bg-gray-900/50 px-5 py-14 text-center">

              <h2 className="text-xl font-semibold">
                Choose Two AI Models
              </h2>

              <p className="mt-2 text-gray-400">
                Select two different models above to see their
                specifications and benchmark scores.
              </p>

            </div>
          )}

        {/* COMPARISON CONTENT */}

        {!comparisonLoading && firstModel && secondModel && (

          <div className="space-y-8">

            {/* MODEL HEADINGS */}

            <section className="grid grid-cols-1 gap-5 md:grid-cols-2">

              {[firstModel, secondModel].map((model, index) => (
                <div
                  key={model.id}
                  className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
                >

                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-blue-400">
                    {index === 0 ? "First Model" : "Second Model"}
                  </p>

                  <h2 className="text-2xl font-bold">
                    {formatModelName(model.name)}
                  </h2>

                  <p className="mt-2 text-sm text-gray-400">
                    {model.lab?.name || "Unknown Lab"}
                  </p>

                  <p className="mt-4 text-sm leading-6 text-gray-300">
                    {model.description || "No description available."}
                  </p>

                </div>
              ))}

            </section>

            {/* MODEL SPECIFICATIONS */}

            <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">

              <div className="border-b border-gray-800 p-5">
                <h2 className="text-xl font-semibold">
                  Model Specifications
                </h2>
              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[650px] text-left">

                  <thead className="bg-gray-800/70 text-sm text-gray-300">
                    <tr>
                      <th className="w-1/4 px-5 py-4">
                        Feature
                      </th>

                      <th className="w-[37.5%] px-5 py-4">
                        {formatModelName(firstModel.name)}
                      </th>

                      <th className="w-[37.5%] px-5 py-4">
                        {formatModelName(secondModel.name)}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {comparisonDetails.map((item) => (
                      <tr
                        key={item.label}
                        className="border-t border-gray-800 align-top"
                      >
                        <td className="px-5 py-4 text-sm font-medium text-gray-300">
                          {item.label}
                        </td>

                        <td className="break-words px-5 py-4 text-sm text-gray-400">
                          {item.first}
                        </td>

                        <td className="break-words px-5 py-4 text-sm text-gray-400">
                          {item.second}
                        </td>
                      </tr>
                    ))}
                  </tbody>

                </table>
              </div>
            </section>

            {/* BENCHMARK SCORE COMPARISON */}

            <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">

              {/* SECTION HEADER */}

              <div className="border-b border-gray-800 p-5">

                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

                  <div>
                    <h2 className="text-xl font-semibold">
                      Benchmark Score Comparison
                    </h2>

                    <p className="mt-2 text-sm text-gray-400">
                      Compare recorded benchmark scores visually
                      across your selected AI models.
                    </p>
                  </div>

                  {/* CATEGORY FILTER */}

                  <div className="sm:min-w-[220px]">

                    <label
                      htmlFor="benchmarkCategory"
                      className="mb-2 block text-xs font-medium text-gray-400"
                    >
                      Filter by Category
                    </label>

                    <select
                      id="benchmarkCategory"
                      value={selectedCategory}
                      onChange={(e) =>
                        setSelectedCategory(e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5 text-sm text-white outline-none focus:border-blue-500"
                    >
                      {benchmarkCategories.map((category) => (
                        <option key={category} value={category}>
                          {category === "All"
                            ? "All Categories"
                            : category}
                        </option>
                      ))}
                    </select>

                  </div>
                </div>

                {/* MODEL LEGEND */}

                <div className="mt-5 flex flex-wrap gap-5 text-sm">

                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-blue-500" />

                    <span className="text-gray-300">
                      {formatModelName(firstModel.name)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full bg-purple-500" />

                    <span className="text-gray-300">
                      {formatModelName(secondModel.name)}
                    </span>
                  </div>

                </div>
              </div>

              {/* BENCHMARK ROWS */}

              {filteredBenchmarkRows.length === 0 ? (

                <div className="p-10 text-center">

                  <h3 className="font-semibold text-gray-200">
                    No Benchmarks Found
                  </h3>

                  <p className="mt-2 text-sm text-gray-400">
                    No benchmark records are available in this category.
                  </p>

                </div>

              ) : (

                <div className="divide-y divide-gray-800">

                  {filteredBenchmarkRows.map((row) => {

                    const firstScore = row.first?.score;
                    const secondScore = row.second?.score;

                    const hasFirst = firstScore !== undefined;
                    const hasSecond = secondScore !== undefined;

                    const hasBoth = hasFirst && hasSecond;

                    const difference = hasBoth
                      ? Math.abs(firstScore - secondScore)
                      : null;

                    // Relative bar scaling within this benchmark row.
                    const maxScore = Math.max(
                      Math.abs(firstScore ?? 0),
                      Math.abs(secondScore ?? 0),
                      0.0001
                    );

                    const firstWidth = hasFirst
                      ? (Math.abs(firstScore) / maxScore) * 100
                      : 0;

                    const secondWidth = hasSecond
                      ? (Math.abs(secondScore) / maxScore) * 100
                      : 0;

                    const isDemo =
                      row.name.toUpperCase().startsWith("DEMO") ||
                      row.category === "Demonstration only";

                    return (

                      <div
                        key={row.name}
                        className="p-5 transition hover:bg-gray-800/20 sm:p-6"
                      >

                        {/* BENCHMARK NAME */}

                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

                          <div>
                            <h3 className="font-semibold text-gray-100">
                              {row.name}
                            </h3>

                            <p className="mt-1 text-xs text-gray-500">
                              {row.category || "Uncategorized"}
                            </p>
                          </div>

                          {isDemo && (
                            <span className="rounded-full border border-amber-700/50 bg-amber-950/40 px-3 py-1 text-xs font-medium text-amber-300">
                              Demo Data
                            </span>
                          )}

                        </div>

                        {/* FIRST MODEL SCORE */}

                        <div className="mb-5">

                          <div className="mb-2 flex items-center justify-between gap-3">

                            <span className="text-sm text-blue-300">
                              {formatModelName(firstModel.name)}
                            </span>

                            <span className="font-semibold tabular-nums text-blue-300">
                              {formatScore(firstScore)}
                            </span>

                          </div>

                          <div
                            className="h-3 overflow-hidden rounded-full bg-gray-800"
                            role="progressbar"
                            aria-label={`${formatModelName(firstModel.name)} score for ${row.name}`}
                            aria-valuemin={0}
                            aria-valuenow={hasFirst ? firstWidth : 0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full rounded-full bg-blue-500 transition-all duration-500"
                              style={{
                                width: `${firstWidth}%`,
                              }}
                            />
                          </div>

                        </div>

                        {/* SECOND MODEL SCORE */}

                        <div className="mb-5">

                          <div className="mb-2 flex items-center justify-between gap-3">

                            <span className="text-sm text-purple-300">
                              {formatModelName(secondModel.name)}
                            </span>

                            <span className="font-semibold tabular-nums text-purple-300">
                              {formatScore(secondScore)}
                            </span>

                          </div>

                          <div
                            className="h-3 overflow-hidden rounded-full bg-gray-800"
                            role="progressbar"
                            aria-label={`${formatModelName(secondModel.name)} score for ${row.name}`}
                            aria-valuemin={0}
                            aria-valuenow={hasSecond ? secondWidth : 0}
                            aria-valuemax={100}
                          >
                            <div
                              className="h-full rounded-full bg-purple-500 transition-all duration-500"
                              style={{
                                width: `${secondWidth}%`,
                              }}
                            />
                          </div>

                        </div>

                        {/* SCORE DIFFERENCE */}

                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-800 pt-4">

                          <span className="text-sm text-gray-400">
                            Absolute Score Difference
                          </span>

                          <span className="rounded-lg bg-gray-800 px-3 py-1.5 text-sm font-semibold tabular-nums text-white">
                            {difference !== null
                              ? formatScore(difference)
                              : "N/A"}
                          </span>

                        </div>

                      </div>
                    );
                  })}

                </div>
              )}

              {/* DISCLAIMER */}

              <div className="border-t border-gray-800 p-5 text-xs leading-6 text-gray-500">

                Score bars are scaled relative to the compared
                values within each benchmark. They are not percentages.

                A higher numerical score does not necessarily mean
                better performance. Benchmark scoring direction
                and scales vary.

                Demonstration data is fictional and must not be
                treated as verified evaluation results.

              </div>

            </section>

          </div>
        )}

      </div>
    </main>
  );
}

// -------------------- PAGE WITH SUSPENSE --------------------

export default function ComparePage() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
          <p className="text-gray-400">
            Loading model comparison...
          </p>
        </main>
      }
    >
      <ComparePageContent />
    </Suspense>
  );
}
