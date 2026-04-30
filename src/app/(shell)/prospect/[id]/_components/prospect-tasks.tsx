"use client";

import { useState } from "react";
import {
  ChevronDown, ChevronRight, CheckSquare, CheckCircle2, CircleDot,
  Clock, User,
} from "lucide-react";
import { formatDate } from "@/lib/format";
import type { ZohoTask } from "@/types";

// ─── 9. Tasks ─────────────────────────────────────────────────────────────────

const TASK_STATUS_OPEN = new Set(["Not Started", "In Progress", "Waiting on input", "Deferred"]);

export function taskPriorityColor(priority: string | null) {
  if (priority === "High") return "text-alert-red";
  if (priority === "Normal") return "text-gold";
  return "text-muted-foreground";
}

export function ProspectTasksSection({ tasks }: { tasks: ZohoTask[] }) {
  const [expanded, setExpanded] = useState(true);
  const [showClosed, setShowClosed] = useState(false);
  const openTasks = tasks.filter(t => TASK_STATUS_OPEN.has(t.Status ?? ""));
  const closedTasks = tasks.filter(t => !TASK_STATUS_OPEN.has(t.Status ?? ""));
  const visibleTasks = showClosed ? closedTasks : openTasks;

  return (
    <div>
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 w-full text-left group">
        {expanded ? <ChevronDown size={14} className="text-muted-foreground shrink-0" /> : <ChevronRight size={14} className="text-muted-foreground shrink-0" />}
        <CheckSquare size={14} className="text-navy shrink-0" />
        <h3 className="text-sm font-semibold text-navy">Activities</h3>
        <span className="ml-auto text-[10px] text-muted-foreground">{openTasks.length} open · {closedTasks.length} closed</span>
      </button>
      {expanded && (
        <div className="mt-3 pl-5 space-y-3">
          <div className="flex gap-2">
            <button onClick={() => setShowClosed(false)} className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${!showClosed ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:border-navy/40"}`}>Open ({openTasks.length})</button>
            <button onClick={() => setShowClosed(true)} className={`text-[11px] px-2.5 py-1 rounded-full border transition-colors ${showClosed ? "bg-navy text-white border-navy" : "border-border text-muted-foreground hover:border-navy/40"}`}>Closed ({closedTasks.length})</button>
          </div>
          {visibleTasks.length === 0
            ? <p className="text-sm text-muted-foreground italic">No {showClosed ? "closed" : "open"} activities.</p>
            : <div className="space-y-2">
                {visibleTasks.map(task => (
                  <div key={task.id} className="rounded-md border bg-card px-3 py-2.5 space-y-1">
                    <div className="flex items-start gap-2">
                      {showClosed
                        ? <CheckCircle2 size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                        : <CircleDot size={13} className={`mt-0.5 shrink-0 ${taskPriorityColor(task.Priority)}`} />}
                      <span className="text-xs font-medium text-navy leading-tight">{task.Subject ?? "Untitled Task"}</span>
                      {task.Priority && <span className={`ml-auto text-[10px] font-semibold shrink-0 ${taskPriorityColor(task.Priority)}`}>{task.Priority}</span>}
                    </div>
                    {task.Description && <p className="text-[11px] text-muted-foreground pl-5 leading-relaxed line-clamp-2">{task.Description}</p>}
                    <div className="flex items-center gap-3 pt-1 border-t mt-1.5 pl-5">
                      {task.Due_Date && <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Clock size={10} />{formatDate(task.Due_Date)}</span>}
                      {task.Closed_Time && <span className="flex items-center gap-1 text-[10px] text-emerald-600"><CheckCircle2 size={10} />Closed {formatDate(task.Closed_Time)}</span>}
                      {task.Owner && <span className="flex items-center gap-1 text-[10px] text-muted-foreground ml-auto"><User size={10} />{task.Owner.name}</span>}
                    </div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}
