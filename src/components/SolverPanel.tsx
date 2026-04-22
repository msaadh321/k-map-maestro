import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Copy, Check, Sparkles, RotateCcw, Variable, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { KMapGrid } from "./KMapGrid";
import { TruthTable } from "./TruthTable";
import {
  type CellValue,
  type Mode,
  solve,
  parseMinterms,
} from "@/lib/kmap-solver";
import { parseExpression } from "@/lib/expression-parser";
import { toast } from "sonner";
import { exportSolutionPDF } from "@/lib/pdf-export";

const GROUP_COLORS = [
  "var(--group-1)",
  "var(--group-2)",
  "var(--group-3)",
  "var(--group-4)",
  "var(--group-5)",
  "var(--group-6)",
];

export function SolverPanel() {
  const [numVars, setNumVars] = useState<2 | 3 | 4>(4);
  const [values, setValues] = useState<CellValue[]>(() => Array(16).fill(0));
  const [mode, setMode] = useState<Mode>("SOP");
  const [showSteps, setShowSteps] = useState(false);
  const [copied, setCopied] = useState(false);
  const [mintermInput, setMintermInput] = useState("Σ(1,3,5,7,9,11,13,15)");
  const [maxtermInput, setMaxtermInput] = useState("Π(0,2,4,6,8,10,12,14)");
  const [exprInput, setExprInput] = useState("A'B + AB'C + BC");

  const handleVarChange = (n: 2 | 3 | 4) => {
    setNumVars(n);
    setValues(Array(1 << n).fill(0));
  };

  const toggleCell = (idx: number) => {
    setValues((prev) => {
      const next = [...prev];
      const cur = next[idx];
      next[idx] = cur === 0 ? 1 : cur === 1 ? "X" : 0;
      return next;
    });
  };

  const result = useMemo(() => solve(numVars, values, mode), [numVars, values, mode]);

  const applyMinterms = () => {
    try {
      const { terms, dontCares } = parseMinterms(mintermInput);
      const total = 1 << numVars;
      const next: CellValue[] = Array(total).fill(0);
      terms.forEach((t) => t < total && (next[t] = 1));
      dontCares.forEach((t) => t < total && (next[t] = "X"));
      setValues(next);
      setMode("SOP");
      toast.success(`Loaded ${terms.length} minterms`);
    } catch {
      toast.error("Invalid minterm format");
    }
  };

  const applyMaxterms = () => {
    try {
      const { terms, dontCares } = parseMinterms(maxtermInput);
      const total = 1 << numVars;
      const next: CellValue[] = Array(total).fill(1);
      terms.forEach((t) => t < total && (next[t] = 0));
      dontCares.forEach((t) => t < total && (next[t] = "X"));
      setValues(next);
      setMode("POS");
      toast.success(`Loaded ${terms.length} maxterms`);
    } catch {
      toast.error("Invalid maxterm format");
    }
  };

  const reset = () => setValues(Array(1 << numVars).fill(0));

  const copyExpression = () => {
    navigator.clipboard.writeText(`F = ${result.expression}`);
    setCopied(true);
    toast.success("Expression copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
      {/* LEFT: Input */}
      <Card className="border-border bg-gradient-surface p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Variable className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Input</h2>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-1">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                onClick={() => handleVarChange(n)}
                className={`rounded-md px-3 py-1 text-xs font-mono font-semibold transition-colors ${
                  numVars === n
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {n}-var
              </button>
            ))}
          </div>
        </div>

        <Tabs defaultValue="kmap" className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-secondary">
            <TabsTrigger value="kmap">K-Map</TabsTrigger>
            <TabsTrigger value="truth">Truth</TabsTrigger>
            <TabsTrigger value="minterms">Σ Min</TabsTrigger>
            <TabsTrigger value="maxterms">Π Max</TabsTrigger>
          </TabsList>

          <TabsContent value="kmap" className="mt-5">
            <p className="mb-3 text-xs text-muted-foreground">
              Click cells to cycle: <span className="font-mono text-muted-foreground">0</span> →{" "}
              <span className="font-mono text-primary">1</span> →{" "}
              <span className="font-mono text-[var(--grid-x)]">X</span>
            </p>
            <div className="flex justify-center overflow-x-auto py-2">
              <KMapGrid
                numVars={numVars}
                values={values}
                groups={result.groups}
                onToggle={toggleCell}
              />
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setValues(Array(1 << numVars).fill(1))}
              >
                All 1s
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="truth" className="mt-5 space-y-4">
            <p className="text-xs text-muted-foreground">
              Click the F column to cycle output:{" "}
              <span className="font-mono text-muted-foreground">0</span> →{" "}
              <span className="font-mono text-primary">1</span> →{" "}
              <span className="font-mono text-[var(--grid-x)]">X</span>. The K-map updates live.
            </p>
            <TruthTable
              numVars={numVars}
              values={values}
              onChange={(idx, value) =>
                setValues((prev) => {
                  const next = [...prev];
                  next[idx] = value;
                  return next;
                })
              }
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={reset} className="gap-1.5">
                <RotateCcw className="h-3.5 w-3.5" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setValues(Array(1 << numVars).fill(1))}
              >
                All 1s
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="minterms" className="mt-5 space-y-4">
            <div>
              <Label htmlFor="mt" className="text-xs text-muted-foreground">
                Format: Σ(1,3,5) d(2,4)
              </Label>
              <Input
                id="mt"
                value={mintermInput}
                onChange={(e) => setMintermInput(e.target.value)}
                className="mt-1.5 font-mono"
                placeholder="Σ(1,3,5,7) d(0,2)"
              />
            </div>
            <Button onClick={applyMinterms} className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Generate K-Map
            </Button>
          </TabsContent>

          <TabsContent value="maxterms" className="mt-5 space-y-4">
            <div>
              <Label htmlFor="xt" className="text-xs text-muted-foreground">
                Format: Π(0,2,4) d(1,3)
              </Label>
              <Input
                id="xt"
                value={maxtermInput}
                onChange={(e) => setMaxtermInput(e.target.value)}
                className="mt-1.5 font-mono"
                placeholder="Π(0,2,4,6) d(1)"
              />
            </div>
            <Button onClick={applyMaxterms} className="w-full gap-2">
              <Sparkles className="h-4 w-4" />
              Generate K-Map
            </Button>
          </TabsContent>
        </Tabs>
      </Card>

      {/* RIGHT: Result */}
      <Card className="border-border bg-gradient-surface p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-semibold">Solution</h2>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-border bg-secondary p-1">
            {(["SOP", "POS"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-md px-3 py-1 text-xs font-mono font-semibold transition-colors ${
                  mode === m
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Expression */}
        <div className="rounded-xl border border-primary/30 bg-card p-5 shadow-glow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-muted-foreground">
              Simplified {mode}
            </span>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  exportSolutionPDF({ numVars, values, mode, result });
                  toast.success("PDF exported");
                }}
                className="h-7 gap-1.5 text-xs"
              >
                <Download className="h-3.5 w-3.5" />
                PDF
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyExpression}
                className="h-7 gap-1.5 text-xs"
              >
                {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={result.expression}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="font-mono text-2xl font-bold leading-tight break-words"
            >
              <span className="text-muted-foreground">F = </span>
              <FormattedExpression expression={result.expression} />
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Groups */}
        <div className="mt-5">
          <h3 className="mb-3 text-xs uppercase tracking-wider text-muted-foreground">
            Prime Implicant Groups ({result.groups.length})
          </h3>
          {result.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">No groups to display.</p>
          ) : (
            <div className="space-y-2">
              {result.groups.map((g, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className="h-3 w-3 rounded-full"
                      style={{
                        backgroundColor: GROUP_COLORS[i % GROUP_COLORS.length],
                        boxShadow: `0 0 8px ${GROUP_COLORS[i % GROUP_COLORS.length]}`,
                      }}
                    />
                    <span className="font-mono text-base font-semibold">{g.term}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-[10px]">
                      size {g.size}
                    </Badge>
                    <span className="font-mono text-[11px] text-muted-foreground">
                      {`{${g.minterms.join(",")}}`}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Steps toggle */}
        <div className="mt-5 flex items-center justify-between rounded-lg border border-border bg-card/30 px-3 py-2">
          <Label htmlFor="steps" className="text-sm cursor-pointer">
            Show step-by-step
          </Label>
          <Switch id="steps" checked={showSteps} onCheckedChange={setShowSteps} />
        </div>

        <AnimatePresence>
          {showSteps && (
            <motion.ol
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-1.5 overflow-hidden text-sm text-muted-foreground"
            >
              {result.steps.map((s, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-mono text-primary">{i + 1}.</span>
                  <span>{s}</span>
                </li>
              ))}
            </motion.ol>
          )}
        </AnimatePresence>
      </Card>
    </div>
  );
}

function FormattedExpression({ expression }: { expression: string }) {
  // Render primes (apostrophes) as superscripts for nicer math look
  const parts = expression.split(/(\s\+\s|\s·\s)/);
  return (
    <span>
      {parts.map((p, i) => {
        if (p === " + " || p === " · ") {
          return (
            <span key={i} className="text-accent mx-1">
              {p.trim()}
            </span>
          );
        }
        // Replace var' with var followed by overline-style
        const tokens = p.split(/('+)/);
        return (
          <span key={i}>
            {tokens.map((t, j) =>
              t === "'" ? (
                <span key={j} className="text-accent">
                  ̄
                </span>
              ) : (
                <span key={j}>{t}</span>
              ),
            )}
          </span>
        );
      })}
    </span>
  );
}
