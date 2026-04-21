import { motion } from "framer-motion";
import { type CellValue, type GroupInfo, getKmapLayout } from "@/lib/kmap-solver";
import { cn } from "@/lib/utils";

interface Props {
  numVars: number;
  values: CellValue[];
  groups?: GroupInfo[];
  onToggle?: (idx: number) => void;
  readOnly?: boolean;
}

const GROUP_COLORS = [
  "var(--group-1)",
  "var(--group-2)",
  "var(--group-3)",
  "var(--group-4)",
  "var(--group-5)",
  "var(--group-6)",
];

export function KMapGrid({ numVars, values, groups = [], onToggle, readOnly }: Props) {
  const layout = getKmapLayout(numVars);

  // Map index -> group color indices
  const cellGroups: Record<number, number[]> = {};
  groups.forEach((g, gi) => {
    g.minterms.forEach((m) => {
      (cellGroups[m] ||= []).push(gi);
    });
  });

  const grayLabel = (n: number, bits: number) => {
    const g = n ^ (n >> 1);
    return g.toString(2).padStart(bits, "0");
  };
  const rowBits = layout.rowVars.length;
  const colBits = layout.colVars.length;

  return (
    <div className="inline-block">
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `auto repeat(${layout.cols}, minmax(56px, 1fr))`,
        }}
      >
        {/* Top-left corner with axis labels */}
        <div className="flex items-end justify-end pr-2 pb-1 text-xs font-mono text-muted-foreground">
          <span className="text-accent">{layout.rowVars}</span>
          <span className="mx-1">\</span>
          <span className="text-primary">{layout.colVars}</span>
        </div>

        {/* Column headers */}
        {Array.from({ length: layout.cols }).map((_, c) => (
          <div
            key={`ch-${c}`}
            className="flex items-center justify-center pb-1 text-xs font-mono text-primary"
          >
            {layout.colGray[c].toString(2).padStart(colBits, "0")}
          </div>
        ))}

        {/* Rows */}
        {Array.from({ length: layout.rows }).map((_, r) => (
          <RowRender
            key={`r-${r}`}
            r={r}
            layout={layout}
            rowBits={rowBits}
            values={values}
            cellGroups={cellGroups}
            onToggle={onToggle}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  );
}

function RowRender({
  r,
  layout,
  rowBits,
  values,
  cellGroups,
  onToggle,
  readOnly,
}: {
  r: number;
  layout: ReturnType<typeof getKmapLayout>;
  rowBits: number;
  values: CellValue[];
  cellGroups: Record<number, number[]>;
  onToggle?: (idx: number) => void;
  readOnly?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-end pr-2 text-xs font-mono text-accent">
        {layout.rowGray[r].toString(2).padStart(rowBits, "0")}
      </div>
      {Array.from({ length: layout.cols }).map((_, c) => {
        const idx = layout.indexOf(r, c);
        const v = values[idx];
        const groupIdxs = cellGroups[idx] || [];
        const primary = groupIdxs[0];

        return (
          <motion.button
            key={`cell-${idx}`}
            type="button"
            disabled={readOnly}
            onClick={() => onToggle?.(idx)}
            whileTap={{ scale: 0.92 }}
            whileHover={readOnly ? undefined : { scale: 1.04 }}
            className={cn(
              "relative aspect-square min-h-14 rounded-lg border-2 font-mono text-xl font-bold",
              "flex items-center justify-center transition-colors",
              "border-border bg-card",
              !readOnly && "cursor-pointer hover:border-primary",
            )}
            style={
              primary !== undefined
                ? {
                    borderColor: GROUP_COLORS[primary % GROUP_COLORS.length],
                    boxShadow: `0 0 20px -4px ${GROUP_COLORS[primary % GROUP_COLORS.length]}, inset 0 0 0 1px ${GROUP_COLORS[primary % GROUP_COLORS.length]}`,
                    backgroundColor: `color-mix(in oklab, ${GROUP_COLORS[primary % GROUP_COLORS.length]} 12%, var(--card))`,
                  }
                : undefined
            }
          >
            <span
              className={cn(
                v === 1 && "text-primary",
                v === "X" && "text-[var(--grid-x)]",
                v === 0 && "text-muted-foreground",
              )}
            >
              {v}
            </span>
            <span className="absolute top-1 left-1.5 text-[9px] font-mono text-muted-foreground/60">
              {idx}
            </span>
            {groupIdxs.length > 1 && (
              <span className="absolute bottom-1 right-1 flex gap-0.5">
                {groupIdxs.slice(1).map((gi) => (
                  <span
                    key={gi}
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ backgroundColor: GROUP_COLORS[gi % GROUP_COLORS.length] }}
                  />
                ))}
              </span>
            )}
          </motion.button>
        );
      })}
    </>
  );
}
