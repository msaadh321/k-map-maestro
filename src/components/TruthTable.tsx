import { motion } from "framer-motion";
import { type CellValue } from "@/lib/kmap-solver";
import { cn } from "@/lib/utils";

const VARS = ["A", "B", "C", "D"];

interface Props {
  numVars: number;
  values: CellValue[];
  onChange: (idx: number, value: CellValue) => void;
}

export function TruthTable({ numVars, values, onChange }: Props) {
  const total = 1 << numVars;
  const varNames = VARS.slice(0, numVars);

  const cycle = (v: CellValue): CellValue => (v === 0 ? 1 : v === 1 ? "X" : 0);

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card/50">
      <div className="max-h-[420px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 z-10 bg-secondary text-xs">
            <tr className="border-b border-border">
              <th className="px-3 py-2 text-left font-mono text-muted-foreground w-10">#</th>
              {varNames.map((v) => (
                <th key={v} className="px-2 py-2 text-center font-mono text-primary">
                  {v}
                </th>
              ))}
              <th className="px-3 py-2 text-center font-mono text-accent">F</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: total }).map((_, idx) => {
              const v = values[idx];
              return (
                <tr
                  key={idx}
                  className={cn(
                    "border-b border-border/40 transition-colors",
                    idx % 2 === 0 ? "bg-card/30" : "bg-transparent",
                  )}
                >
                  <td className="px-3 py-1.5 font-mono text-xs text-muted-foreground">{idx}</td>
                  {varNames.map((_, bitPos) => {
                    const bit = (idx >> (numVars - 1 - bitPos)) & 1;
                    return (
                      <td
                        key={bitPos}
                        className="px-2 py-1.5 text-center font-mono text-muted-foreground"
                      >
                        {bit}
                      </td>
                    );
                  })}
                  <td className="px-3 py-1 text-center">
                    <motion.button
                      type="button"
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onChange(idx, cycle(v))}
                      className={cn(
                        "h-7 w-9 rounded-md border-2 font-mono text-sm font-bold transition-colors",
                        "border-border hover:border-primary",
                        v === 1 && "border-primary bg-primary/10 text-primary",
                        v === "X" && "border-[var(--grid-x)] bg-[var(--grid-x)]/10 text-[var(--grid-x)]",
                        v === 0 && "text-muted-foreground",
                      )}
                    >
                      {v}
                    </motion.button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
