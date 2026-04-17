/**
 * Client-safe cache of pipeline stage idle thresholds.
 *
 * The cache is pre-seeded from `PIPELINE_STAGES` in `./constants` so sync
 * callers (notably `computeIsStale`) get a valid value even before the
 * server has loaded the DB-backed overrides.
 *
 * The server-only `src/services/pipeline-thresholds.ts` service mutates
 * this cache after seeding from / writing to the `PipelineStageThreshold`
 * Prisma table. Keeping the cache in its own module (importable by both
 * client and server code) means `stale.ts` can stay free of a Prisma
 * import and still reflect admin edits on the server path.
 */

import { PIPELINE_STAGES } from "./constants";
import type { PipelineStage } from "./types";

const cache: Map<PipelineStage, number | null> = new Map(
  PIPELINE_STAGES.map((s) => [s.key, s.idleThreshold]),
);

export function getStageThresholdFromCache(stage: PipelineStage): number | null {
  return cache.has(stage) ? (cache.get(stage) ?? null) : null;
}

export function setStageThresholdInCache(
  stage: PipelineStage,
  idleThreshold: number | null,
): void {
  cache.set(stage, idleThreshold);
}

export function primeThresholdCache(
  rows: { stage: string; idleThreshold: number | null }[],
): void {
  for (const r of rows) {
    cache.set(r.stage as PipelineStage, r.idleThreshold ?? null);
  }
}
