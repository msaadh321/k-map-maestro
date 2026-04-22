import { motion, AnimatePresence } from "framer-motion";
import { History, X, Trash2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface HistoryEntry {
  id: string;
  expr: string;
  vars: 2 | 3 | 4;
  source: "example" | "manual";
  ts: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  entries: HistoryEntry[];
  previews?: Record<string, { mintermCount: number; simplified: string; error?: string }>;
  onSelect: (entry: HistoryEntry) => void;
  onClear: () => void;
  onRemove: (id: string) => void;
}

function timeAgo(ts: number) {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function HistorySidebar({
  open,
  onClose,
  entries,
  previews,
  onSelect,
  onClear,
  onRemove,
}: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm"
          />
          <motion.aside
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 240 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-sm flex-col border-l border-border bg-card shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-primary" />
                <h2 className="font-semibold">Input history</h2>
                <span className="rounded-md border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                  {entries.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {entries.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClear}
                    className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {entries.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <Clock className="mb-2 h-8 w-8 opacity-40" />
                  <p>No history yet.</p>
                  <p className="mt-1 text-xs">
                    Click an example expression or generate a K-map from the Expr tab to start
                    building history.
                  </p>
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {entries.map((e) => {
                    const p = previews?.[e.id];
                    return (
                    <li key={e.id}>
                      <div className="group relative flex items-center gap-2 rounded-lg border border-border bg-card/60 pr-1 transition-colors hover:border-primary/60 hover:bg-primary/5">
                        <button
                          onClick={() => onSelect(e)}
                          className="flex-1 px-3 py-2 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm font-semibold text-foreground">
                              {e.expr}
                            </span>
                            <span className="rounded border border-border bg-secondary px-1 py-px font-mono text-[9px] text-muted-foreground">
                              {e.vars}-var
                            </span>
                          </div>
                          {p && !p.error && (
                            <div className="mt-1.5 space-y-0.5">
                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="rounded bg-primary/15 px-1 py-px font-mono text-primary">
                                  {p.mintermCount} minterm{p.mintermCount === 1 ? "" : "s"}
                                </span>
                                <span className="truncate font-mono text-[10px] text-accent">
                                  → {p.simplified}
                                </span>
                              </div>
                            </div>
                          )}
                          {p?.error && (
                            <div className="mt-1 truncate text-[10px] text-destructive">
                              ⚠ {p.error}
                            </div>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                            <span>{e.source === "example" ? "from example" : "manual"}</span>
                            <span>·</span>
                            <span>{timeAgo(e.ts)}</span>
                          </div>
                        </button>
                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onRemove(e.id);
                          }}
                          className="rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          aria-label="Remove entry"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  );
                  })}
                </ul>
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
