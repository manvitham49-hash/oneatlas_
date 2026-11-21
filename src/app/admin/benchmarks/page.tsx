
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

// -------------------- TYPES --------------------

type Benchmark = {
  id: string;
  name: string;
  score: number;
  category: string | null;
  modelId: string;
  createdAt: string;

  model?: {
    id: string;
    name: string;
    slug: string;
    lab?: {
      name: string;
    } | null;
  };
};

type BenchmarkForm = {
  modelSlug: string;
  name: string;
  category: string;
  score: string;
};

type ApiResult<T> = {
  success: boolean;
  authenticated?: boolean;
  message?: string;
  data?: T;
};

const CATEGORIES = [
  "Reasoning",
  "Coding",
  "Mathematics",
  "Knowledge",
  "Multimodal",
  "Language",
  "Other",
  "Demonstration only",
];

const EMPTY_FORM: BenchmarkForm = {
  modelSlug: "",
  name: "",
  category: "",
  score: "",
};

// -------------------- MAIN COMPONENT --------------------

export default function BenchmarkAdminPage() {
  // Authentication
  const [adminKey, setAdminKey] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [logoutLoading, setLogoutLoading] = useState(false);

  // Benchmark data
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);

  // Form
  const [form, setForm] = useState<BenchmarkForm>(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Loading states
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Messages
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  // Search and filter
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  // -------------------- API RESPONSE HELPER --------------------

  async function readResponse<T>(response: Response): Promise<ApiResult<T>> {
    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "Something went wrong."
      );
    }

    return result as ApiResult<T>;
  }

  // -------------------- CHECK EXISTING SESSION --------------------

  const checkSession = useCallback(async () => {
    try {
      setCheckingSession(true);

      const response = await fetch("/api/admin/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });

      const result = await readResponse<never>(response);

      const loggedIn = result.authenticated === true;

      setAuthenticated(loggedIn);

      return loggedIn;
    } catch (error) {
      setAuthenticated(false);

      setSuccess(false);
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to check admin session."
      );

      return false;
    } finally {
      setCheckingSession(false);
    }
  }, []);

  // -------------------- LOGIN --------------------

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    if (!adminKey.trim()) {
      setSuccess(false);
      setMessage("Please enter your admin key.");
      return;
    }

    try {
      setLoginLoading(true);

      const response = await fetch("/api/admin/session", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          adminKey,
        }),
      });

      const result = await readResponse<never>(response);

      setAuthenticated(true);
      setAdminKey("");

      setSuccess(true);
      setMessage(result.message || "Login successful.");

      await loadBenchmarks();
    } catch (error) {
      setAuthenticated(false);
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to log in."
      );
    } finally {
      setLoginLoading(false);
    }
  }

  // -------------------- LOGOUT --------------------

  async function handleLogout() {
    try {
      setLogoutLoading(true);
      setMessage("");

      const response = await fetch("/api/admin/session", {
        method: "DELETE",
        credentials: "same-origin",
      });

      const result = await readResponse<never>(response);

      setAuthenticated(false);
      setBenchmarks([]);
      setAdminKey("");
      resetForm();

      setSuccess(true);
      setMessage(result.message || "Logged out successfully.");
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to log out."
      );
    } finally {
      setLogoutLoading(false);
    }
  }

  // -------------------- LOAD BENCHMARKS --------------------

  const loadBenchmarks = useCallback(async () => {
    try {
      setFetching(true);

      const response = await fetch(
        "/api/benchmarks?page=1&limit=100",
        {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        }
      );

      const result = await readResponse<Benchmark[]>(response);

      setBenchmarks(
        Array.isArray(result.data) ? result.data : []
      );
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to load benchmarks."
      );
    } finally {
      setFetching(false);
    }
  }, []);

  // -------------------- INITIAL SESSION CHECK --------------------

  useEffect(() => {
    let active = true;

    async function initialize() {
      try {
        const response = await fetch("/api/admin/session", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });

        const result = await readResponse<never>(response);

        if (!active) return;

        const loggedIn = result.authenticated === true;

        setAuthenticated(loggedIn);

        if (loggedIn) {
          await loadBenchmarks();
        }
      } catch {
        if (active) {
          setAuthenticated(false);
        }
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    initialize();

    return () => {
      active = false;
    };
  }, [loadBenchmarks]);

  // -------------------- FORM HELPERS --------------------

  function updateField(
    field: keyof BenchmarkForm,
    value: string
  ) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  // -------------------- ADD / UPDATE --------------------

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");

    if (!authenticated) {
      setSuccess(false);
      setMessage("Please log in before managing benchmarks.");
      return;
    }

    if (!form.modelSlug.trim() || !form.name.trim()) {
      setSuccess(false);
      setMessage("Model slug and benchmark name are required.");
      return;
    }

    if (
      form.score.trim() === "" ||
      !Number.isFinite(Number(form.score))
    ) {
      setSuccess(false);
      setMessage("Please enter a valid benchmark score.");
      return;
    }

    try {
      setLoading(true);

      const isEditing = Boolean(editingId);

      const response = await fetch("/api/benchmarks", {
        method: isEditing ? "PATCH" : "POST",

        credentials: "same-origin",

        headers: {
          "Content-Type": "application/json",
        },

        body: JSON.stringify({
          ...(isEditing ? { id: editingId } : {}),
          modelSlug: form.modelSlug.trim(),
          name: form.name.trim(),
          category: form.category,
          score: Number(form.score),
        }),
      });

      const result = await readResponse<Benchmark>(response);

      setSuccess(true);
      setMessage(
        result.message ||
          (isEditing
            ? "Benchmark updated successfully."
            : "Benchmark added successfully.")
      );

      resetForm();

      await loadBenchmarks();
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to save benchmark."
      );

      // If the session has expired, verify it again.
      if (error instanceof Error &&
          error.message.toLowerCase().includes("unauthorized")) {
        await checkSession();
      }
    } finally {
      setLoading(false);
    }
  }

  // -------------------- EDIT --------------------

  function handleEdit(benchmark: Benchmark) {
    setEditingId(benchmark.id);

    setForm({
      modelSlug: benchmark.model?.slug || "",
      name: benchmark.name,
      category: benchmark.category || "",
      score: String(benchmark.score),
    });

    setMessage("");
    setSuccess(false);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  // -------------------- DELETE --------------------

  async function handleDelete(benchmark: Benchmark) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${benchmark.name}" for "${benchmark.model?.name || "this model"}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingId(benchmark.id);
      setMessage("");

      const response = await fetch(
        `/api/benchmarks?id=${encodeURIComponent(benchmark.id)}`,
        {
          method: "DELETE",
          credentials: "same-origin",
        }
      );

      const result = await readResponse<Benchmark>(response);

      setSuccess(true);
      setMessage(result.message || "Benchmark deleted successfully.");

      if (editingId === benchmark.id) {
        resetForm();
      }

      await loadBenchmarks();
    } catch (error) {
      setSuccess(false);

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to delete benchmark."
      );

      if (error instanceof Error &&
          error.message.toLowerCase().includes("unauthorized")) {
        await checkSession();
      }
    } finally {
      setDeletingId(null);
    }
  }

  // -------------------- FILTER --------------------

  const filteredBenchmarks = useMemo(() => {
    return benchmarks.filter((benchmark) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        benchmark.name.toLowerCase().includes(searchText) ||
        (benchmark.model?.name || "")
          .toLowerCase()
          .includes(searchText) ||
        (benchmark.model?.slug || "")
          .toLowerCase()
          .includes(searchText);

      const matchesCategory =
        categoryFilter === "All" ||
        (benchmark.category || "Uncategorized") === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [benchmarks, search, categoryFilter]);

  // -------------------- SUMMARY --------------------

  const totalBenchmarks = benchmarks.length;

  const totalModels = new Set(
    benchmarks.map((benchmark) => benchmark.modelId)
  ).size;

  const demoBenchmarks = benchmarks.filter(
    (benchmark) =>
      benchmark.name.toUpperCase().startsWith("DEMO") ||
      benchmark.category === "Demonstration only"
  ).length;

  // -------------------- LOADING SCREEN --------------------

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-4 border-gray-700 border-t-blue-500" />

          <p className="text-gray-400">
            Checking admin session...
          </p>
        </div>
      </main>
    );
  }

  // -------------------- LOGIN SCREEN --------------------

  if (!authenticated) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gray-950 px-4 py-10 text-white">

        <div className="w-full max-w-md">

          <div className="mb-8 text-center">
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-blue-400">
              OneAtlas Admin
            </p>

            <h1 className="text-3xl font-bold">
              Admin Login
            </h1>

            <p className="mt-3 text-sm text-gray-400">
              Sign in to manage AI model benchmark records.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8"
          >

            <div>
              <label
                htmlFor="adminKey"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Admin Key
              </label>

              <input
                id="adminKey"
                type="password"
                required
                value={adminKey}
                onChange={(e) => setAdminKey(e.target.value)}
                placeholder="Enter your admin key"
                autoComplete="current-password"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            {message && (
              <div
                role="alert"
                className={`rounded-lg border p-3 text-sm ${
                  success
                    ? "border-green-800 bg-green-950/40 text-green-300"
                    : "border-red-800 bg-red-950/40 text-red-300"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loginLoading || !adminKey.trim()}
              className="w-full rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loginLoading ? "Signing in..." : "Login"}
            </button>

          </form>

          <p className="mt-5 text-center text-xs text-gray-500">
            Authorized administrators only.
          </p>

        </div>
      </main>
    );
  }

  // -------------------- ADMIN DASHBOARD --------------------

  return (
    <main className="min-h-screen bg-gray-950 px-4 py-10 text-white sm:px-6 lg:px-8">

      <div className="mx-auto max-w-7xl">

        {/* HEADER */}

        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-blue-400">
              OneAtlas Admin
            </p>

            <h1 className="text-3xl font-bold sm:text-4xl">
              Benchmark Management
            </h1>

            <p className="mt-3 text-gray-400">
              Manage AI model benchmark records.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={logoutLoading}
            className="rounded-lg border border-red-900 px-5 py-3 text-sm font-medium text-red-300 transition hover:bg-red-950 disabled:opacity-50"
          >
            {logoutLoading ? "Logging out..." : "Logout"}
          </button>

        </div>

        {/* SUMMARY CARDS */}

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm text-gray-400">
              Total Benchmarks
            </p>

            <h2 className="mt-2 text-3xl font-bold text-blue-400">
              {totalBenchmarks}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm text-gray-400">
              Models With Benchmarks
            </p>

            <h2 className="mt-2 text-3xl font-bold text-purple-400">
              {totalModels}
            </h2>
          </div>

          <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
            <p className="text-sm text-gray-400">
              Demonstration Records
            </p>

            <h2 className="mt-2 text-3xl font-bold text-amber-400">
              {demoBenchmarks}
            </h2>
          </div>

        </section>

        {/* ADD / EDIT FORM */}

        <section className="mb-10 rounded-2xl border border-gray-800 bg-gray-900 p-6 sm:p-8">

          <div className="mb-6">
            <h2 className="text-xl font-semibold">
              {editingId ? "Edit Benchmark" : "Add New Benchmark"}
            </h2>

            <p className="mt-1 text-sm text-gray-400">
              {editingId
                ? "Update the selected benchmark record."
                : "Enter the model and benchmark details."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* MODEL SLUG */}

            <div>
              <label
                htmlFor="modelSlug"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Model Slug
              </label>

              <input
                id="modelSlug"
                type="text"
                required
                value={form.modelSlug}
                onChange={(e) =>
                  updateField("modelSlug", e.target.value)
                }
                placeholder="anthropic/claude-opus-5.5"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* NAME */}

            <div>
              <label
                htmlFor="benchmarkName"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Benchmark Name
              </label>

              <input
                id="benchmarkName"
                type="text"
                required
                value={form.name}
                onChange={(e) =>
                  updateField("name", e.target.value)
                }
                placeholder="Example: MMLU"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* CATEGORY */}

            <div>
              <label
                htmlFor="category"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Benchmark Category
              </label>

              <select
                id="category"
                value={form.category}
                onChange={(e) =>
                  updateField("category", e.target.value)
                }
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              >
                <option value="">Select category</option>

                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* SCORE */}

            <div>
              <label
                htmlFor="score"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Benchmark Score
              </label>

              <input
                id="score"
                type="number"
                step="any"
                required
                value={form.score}
                onChange={(e) =>
                  updateField("score", e.target.value)
                }
                placeholder="Example: 85.5"
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            {/* MESSAGE */}

            {message && (
              <div
                role="alert"
                className={`rounded-lg border p-4 text-sm ${
                  success
                    ? "border-green-800 bg-green-950/40 text-green-300"
                    : "border-red-800 bg-red-950/40 text-red-300"
                }`}
              >
                {message}
              </div>
            )}

            {/* BUTTONS */}

            <div className="flex flex-wrap gap-3">

              <button
                type="submit"
                disabled={loading}
                className="flex-1 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Please wait..."
                  : editingId
                    ? "Update Benchmark"
                    : "Add Benchmark"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border border-gray-700 px-5 py-3 font-medium text-gray-300 transition hover:bg-gray-800"
                >
                  Cancel Edit
                </button>
              )}

            </div>

          </form>

        </section>

        {/* BENCHMARK RECORDS */}

        <section className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">

          <div className="border-b border-gray-800 p-6">

            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">

              <div>
                <h2 className="text-xl font-semibold">
                  Benchmark Records
                </h2>

                <p className="mt-1 text-sm text-gray-400">
                  View and manage saved PostgreSQL records.
                </p>
              </div>

              <button
                type="button"
                onClick={loadBenchmarks}
                disabled={fetching}
                className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium transition hover:bg-gray-800 disabled:opacity-50"
              >
                {fetching ? "Refreshing..." : "↻ Refresh"}
              </button>

            </div>

            {/* SEARCH AND FILTER */}

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">

              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search benchmark or model..."
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-blue-500"
              >
                <option value="All">All Categories</option>

                <option value="Uncategorized">
                  Uncategorized
                </option>

                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>

            </div>

          </div>

          <div className="border-b border-gray-800 px-6 py-3 text-sm text-gray-400">
            Showing {filteredBenchmarks.length} of {benchmarks.length} records
          </div>

          {/* LOADING */}

          {fetching && benchmarks.length === 0 && (
            <div className="p-10 text-center text-gray-400">
              Loading benchmark records...
            </div>
          )}

          {/* EMPTY */}

          {!fetching && filteredBenchmarks.length === 0 && (
            <div className="p-10 text-center">
              <h3 className="font-semibold text-gray-200">
                No Benchmark Records Found
              </h3>

              <p className="mt-2 text-sm text-gray-400">
                Try changing your search or category filter.
              </p>
            </div>
          )}

          {/* TABLE */}

          {filteredBenchmarks.length > 0 && (
            <div className="overflow-x-auto">

              <table className="w-full min-w-[850px] text-left">

                <thead className="bg-gray-800/70 text-sm text-gray-300">
                  <tr>
                    <th className="px-5 py-4">Benchmark</th>
                    <th className="px-5 py-4">Model</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4">Score</th>
                    <th className="px-5 py-4">Date Added</th>
                    <th className="px-5 py-4">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredBenchmarks.map((benchmark) => {
                    const isDemo =
                      benchmark.name.toUpperCase().startsWith("DEMO") ||
                      benchmark.category === "Demonstration only";

                    return (
                      <tr
                        key={benchmark.id}
                        className="border-t border-gray-800 transition hover:bg-gray-800/30"
                      >

                        <td className="px-5 py-4">
                          <p className="font-medium text-gray-100">
                            {benchmark.name}
                          </p>

                          {isDemo && (
                            <span className="mt-1 inline-block rounded-full border border-amber-800 bg-amber-950/40 px-2 py-0.5 text-xs text-amber-300">
                              Demo
                            </span>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm text-gray-200">
                            {benchmark.model?.name || "Unknown Model"}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {benchmark.model?.slug || "N/A"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-400">
                          {benchmark.category || "Uncategorized"}
                        </td>

                        <td className="px-5 py-4 font-semibold tabular-nums text-blue-300">
                          {benchmark.score}
                        </td>

                        <td className="px-5 py-4 text-sm text-gray-400">
                          {new Date(
                            benchmark.createdAt
                          ).toLocaleDateString()}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">

                            <button
                              type="button"
                              onClick={() => handleEdit(benchmark)}
                              className="rounded-lg border border-blue-800 px-3 py-2 text-xs font-medium text-blue-300 transition hover:bg-blue-950"
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDelete(benchmark)}
                              disabled={deletingId === benchmark.id}
                              className="rounded-lg border border-red-900 px-3 py-2 text-xs font-medium text-red-300 transition hover:bg-red-950 disabled:opacity-50"
                            >
                              {deletingId === benchmark.id
                                ? "Deleting..."
                                : "Delete"}
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>

              </table>

            </div>
          )}

        </section>

        {/* INFORMATION */}

        <section className="mt-6 rounded-xl border border-gray-800 bg-gray-900/60 p-5">

          <h2 className="font-semibold text-gray-200">
            Important Information
          </h2>

          <p className="mt-2 text-sm leading-6 text-gray-400">
            Enter benchmark scores only when you have a reliable source.
            Demonstration records are fictional and should be clearly
            identified. OneAtlas does not automatically verify benchmark
            results.
          </p>

        </section>

      </div>
    </main>
  );
}
