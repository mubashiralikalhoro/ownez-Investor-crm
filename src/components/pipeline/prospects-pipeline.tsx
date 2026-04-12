"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, AlertCircle, RefreshCw, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { PipelineTable } from "./pipeline-table";
import { PipelineTableSkeleton } from "./pipeline-skeleton";
import type { ZohoProspect, ZohoPaginationInfo } from "@/types";

const PAGE_SIZE = 200;
const SEARCH_DEBOUNCE_MS = 400;

async function tryRefresh(): Promise<boolean> {
  return (await fetch("/api/auth/zoho/refresh", { method: "POST", credentials: "same-origin" })).ok;
}

type FilterOptions = {
  stages: string[];
  sources: string[];
  owners: { id: string; name: string }[];
};

export function ProspectsPipeline() {
  const router = useRouter();

  // ─── Filter / sort / search state ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [page, setPage] = useState(1);

  // ─── Data state ────────────────────────────────────────────────────────────
  const [prospects, setProspects] = useState<ZohoProspect[]>([]);
  const [info, setInfo] = useState<ZohoPaginationInfo | null>(null);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ stages: [], sources: [], owners: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ─── Debounce search input ─────────────────────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Don't fire an API call for a single character — Zoho requires ≥ 2.
      if (search.trim().length === 1) return;
      setDebouncedSearch(search);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  // ─── Load lead sources + owners on mount ────────────────────────────────────
  const [dbSources, setDbSources] = useState<string[]>([]);
  const [dbOwners, setDbOwners]   = useState<{ id: string; name: string }[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const [srcRes, ownRes] = await Promise.all([
          fetch("/api/lead-sources", { credentials: "same-origin", signal: controller.signal }),
          fetch("/api/users",        { credentials: "same-origin", signal: controller.signal }),
        ]);
        if (srcRes.ok) {
          const json = (await srcRes.json()) as { data?: { key: string; active: boolean }[] };
          setDbSources((json.data ?? []).filter((s) => s.active).map((s) => s.key));
        }
        if (ownRes.ok) {
          const json = (await ownRes.json()) as { data?: { id: string; name: string }[] };
          setDbOwners(json.data ?? []);
        }
      } catch {
        /* ignore — fall back to deriving from rows */
      }
    })();
    return () => controller.abort();
  }, []);

  // ─── Fetch ─────────────────────────────────────────────────────────────────
  const fetchProspects = useCallback(
    async (targetPage: number, isRetry = false) => {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(targetPage), page_size: String(PAGE_SIZE), exclude_funded: "true" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (stageFilter)     params.set("stage",  stageFilter);
      if (sourceFilter)    params.set("source", sourceFilter);
      if (ownerFilter)     params.set("owner_id", ownerFilter);

      try {
        const res = await fetch(`/api/prospects?${params.toString()}`, {
          credentials: "same-origin",
        });

        if (res.status === 401 && !isRetry) {
          const refreshed = await tryRefresh();
          if (refreshed) return fetchProspects(targetPage, true);
          router.replace("/login?next=/pipeline");
          return;
        }

        const data = (await res.json()) as {
          error?: string;
          data?: ZohoProspect[];
          info?: ZohoPaginationInfo;
        };

        if (!res.ok) {
          setError(data.error ?? "Failed to load prospects.");
          return;
        }

        const rows = data.data ?? [];
        setProspects(rows);
        setInfo(data.info ?? null);

        // Build filter option lists from the initial (unfiltered) load.
        const isFirstUnfilteredLoad =
          targetPage === 1 &&
          !debouncedSearch &&
          !stageFilter &&
          !sourceFilter &&
          !ownerFilter;

        if (isFirstUnfilteredLoad && rows.length > 0) {
          const stages = [...new Set(rows.map((p) => p.Pipeline_Stage).filter(Boolean))].sort() as string[];
          const sources = dbSources.length > 0
            ? dbSources
            : ([...new Set(rows.map((p) => p.Lead_Source).filter(Boolean))] as string[])
                .filter((s) => !/^test\b/i.test(s))
                .sort();
          const owners = dbOwners.length > 0
            ? dbOwners
            : [...new Map(rows.map((p) => [p.Owner.id, p.Owner.name])).entries()]
                .map(([id, name]) => ({ id, name }))
                .sort((a, b) => a.name.localeCompare(b.name));
          setFilterOptions({ stages, sources, owners });
        }
      } catch {
        setError("Network error — could not reach the server.");
      } finally {
        setLoading(false);
      }
    },
    [router, debouncedSearch, stageFilter, sourceFilter, ownerFilter, dbSources, dbOwners]
  );

  // When the DB lists land (async after the first fetch), merge them into
  // filter options without reloading all the rows.
  useEffect(() => {
    if (dbSources.length === 0 && dbOwners.length === 0) return;
    setFilterOptions((prev) => ({
      ...prev,
      ...(dbSources.length > 0 ? { sources: dbSources } : {}),
      ...(dbOwners.length > 0  ? { owners:  dbOwners }  : {}),
    }));
  }, [dbSources, dbOwners]);

  // Re-fetch whenever any filter/sort/page changes.
  useEffect(() => {
    void fetchProspects(page);
  }, [fetchProspects, page]);

  // Reset to page 1 when filters change.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, stageFilter, sourceFilter, ownerFilter]);

  function clearFilters() {
    setSearch("");
    setDebouncedSearch("");
    setStageFilter("");
    setSourceFilter("");
    setOwnerFilter("");
    setPage(1);
  }

  const hasFilters = search || stageFilter || sourceFilter || ownerFilter;
  const totalPages = info ? Math.ceil(info.count / PAGE_SIZE) : 1;

  // ─── Error state ───────────────────────────────────────────────────────────
  if (error && prospects.length === 0) {
    return (
      <div className="flex min-h-[320px] flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2 rounded-lg border border-alert-red/25 bg-alert-red-light px-4 py-3 text-sm text-alert-red">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </div>
        <button
          onClick={() => fetchProspects(page)}
          className="flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-medium text-muted-foreground hover:border-gold hover:text-gold transition-colors"
        >
          <RefreshCw size={12} />
          Retry
        </button>
      </div>
    );
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-4">
      {/* Search + Filters bar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects…"
            className="h-8 rounded-md border bg-card pl-8 pr-8 text-xs focus:outline-none focus:ring-1 focus:ring-gold w-52"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-navy"
            >
              <X size={12} />
            </button>
          )}
        </div>

        {/* Stage */}
        <select
          value={stageFilter}
          onChange={(e) => setStageFilter(e.target.value)}
          className="h-8 rounded-md border bg-card px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold"
        >
          <option value="">All Stages</option>
          {filterOptions.stages.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Source */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="h-8 rounded-md border bg-card px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold"
        >
          <option value="">All Sources</option>
          {filterOptions.sources.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {/* Owner */}
        {filterOptions.owners.length > 1 && (
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-8 rounded-md border bg-card px-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-gold"
          >
            <option value="">All Owners</option>
            {filterOptions.owners.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        )}

        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-[10px] font-medium text-muted-foreground hover:bg-muted/80 transition-colors"
          >
            <X size={10} />
            Clear
          </button>
        )}

        {/* Record count */}
        <span className="ml-auto text-xs text-muted-foreground">
          {info ? (
            loading ? "Refreshing…" : `${info.count} record${info.count !== 1 ? "s" : ""}`
          ) : null}
        </span>

        {/* Inline loading indicator */}
        {loading && (
          <Loader2 size={14} className="animate-spin text-gold" />
        )}
      </div>

      {/* Table */}
      {loading ? (
        <PipelineTableSkeleton />
      ) : (
        <PipelineTable prospects={prospects} />
      )}

      {/* Pagination */}
      {info && info.count > 0 && (
        <div className="flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
          <span>
            Showing{" "}
            <span className="font-medium text-navy">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, info.count)}
            </span>{" "}
            of <span className="font-medium text-navy">{info.count}</span>
          </span>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => p - 1)}
              disabled={page <= 1 || loading}
              className="flex h-7 w-7 items-center justify-center rounded border hover:border-gold hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              const p = i + 1;
              return (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  disabled={loading}
                  className={`flex h-7 min-w-7 items-center justify-center rounded border px-2 text-xs transition-colors disabled:cursor-not-allowed ${
                    p === page
                      ? "border-gold bg-gold/10 font-semibold text-gold"
                      : "hover:border-gold hover:text-gold"
                  }`}
                >
                  {p}
                </button>
              );
            })}

            {totalPages > 5 && (
              <span className="px-1">…</span>
            )}

            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={!info.more_records || loading}
              className="flex h-7 w-7 items-center justify-center rounded border hover:border-gold hover:text-gold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
