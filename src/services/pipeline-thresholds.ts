/**
 * Pipeline-stage idle-threshold service (server-only).
 *
 * The DB (`PipelineStageThreshold`) is the source of truth for how many days
 * of inactivity trigger the "stale" flag per stage. Defaults come from
 * `PIPELINE_STAGES` in `src/lib/constants.ts` and are seeded on first read.
 *
 * This service also mirrors the DB into the client-safe
 * `src/lib/thresholds-cache.ts` so `computeIsStale` can stay synchronous
 * without importing Prisma (which would poison the client bundle).
 */

import { prisma } from "@/lib/prisma";
import { PIPELINE_STAGES } from "@/lib/constants";
import {
  primeThresholdCache,
  setStageThresholdInCache,
} from "@/lib/thresholds-cache";
import type { PipelineStage } from "@/lib/types";

export type ThresholdRow = {
  stage:         PipelineStage;
  label:         string;
  idleThreshold: number | null;
};

const STAGE_KEYS = new Set<string>(PIPELINE_STAGES.map((s) => s.key));

async function seedIfEmpty(): Promise<void> {
  const count = await prisma.pipelineStageThreshold.count();
  if (count > 0) return;
  await prisma.pipelineStageThreshold.createMany({
    data: PIPELINE_STAGES.map((s) => ({
      stage:         s.key,
      idleThreshold: s.idleThreshold,
    })),
  });
}

/**
 * Returns one row per stage, in canonical `PIPELINE_STAGES` order, merging
 * DB-persisted values with labels from constants. Seeds the table on first
 * call and warms the shared cache as a side effect.
 */
export async function listThresholds(): Promise<ThresholdRow[]> {
  await seedIfEmpty();
  const rows = await prisma.pipelineStageThreshold.findMany();
  primeThresholdCache(
    rows.map((r) => ({ stage: r.stage, idleThreshold: r.idleThreshold ?? null })),
  );

  const byStage = new Map(rows.map((r) => [r.stage, r.idleThreshold]));
  return PIPELINE_STAGES.map((s) => ({
    stage:         s.key,
    label:         s.label,
    idleThreshold: byStage.has(s.key) ? (byStage.get(s.key) ?? null) : s.idleThreshold,
  }));
}

/** Upsert a single stage's threshold. Updates the shared cache on success. */
export async function updateThreshold(
  stage: PipelineStage,
  idleThreshold: number | null,
): Promise<ThresholdRow> {
  if (!STAGE_KEYS.has(stage)) {
    throw new Error(`Unknown pipeline stage: ${stage}`);
  }
  const row = await prisma.pipelineStageThreshold.upsert({
    where:  { stage },
    create: { stage, idleThreshold },
    update: { idleThreshold },
  });
  setStageThresholdInCache(stage, row.idleThreshold ?? null);

  const meta = PIPELINE_STAGES.find((s) => s.key === stage);
  return {
    stage,
    label:         meta?.label ?? stage,
    idleThreshold: row.idleThreshold ?? null,
  };
}
