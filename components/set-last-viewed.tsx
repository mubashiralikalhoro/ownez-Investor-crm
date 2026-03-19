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

export function SetLastViewed(props: SetLastViewedProps) {
  useEffect(() => {
    setLastViewed(props);
  }, [props.id, props.fullName, props.pipelineStage, props.organizationName]);

  return null;
}
