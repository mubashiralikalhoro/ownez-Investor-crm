"use client";

import { useEffect } from "react";
import { setLastViewed } from "./last-viewed-bar";
import type { PipelineStage } from "@/lib/types";

interface SetLastViewedProps {
  id: string;
  fullName: string;
  pipelineStage: PipelineStage | null;
  organizationName: string | null;
}

export function SetLastViewed({
  id,
  fullName,
  pipelineStage,
  organizationName,
}: SetLastViewedProps) {
  useEffect(() => {
    setLastViewed({ id, fullName, pipelineStage, organizationName });
  }, [id, fullName, pipelineStage, organizationName]);

  return null;
}
