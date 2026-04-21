import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { Grid3x3, Zap, BookOpen } from "lucide-react";
import { SolverPanel } from "@/components/SolverPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "K-Map Solver — Interactive Karnaugh Map Simplifier" },
      {
        name: "description",
        content:
          "Solve Karnaugh Maps instantly. Interactive K-Map grid, minterm/maxterm input, automatic SOP & POS simplification with visual prime implicant grouping.",
      },
      { property: "og:title", content: "K-Map Solver — Interactive Karnaugh Map Simplifier" },
      {
        property: "og:description",
        content:
          "Solve Karnaugh Maps instantly with visual grouping, SOP/POS output, and step-by-step simplification.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <div className="min-h-screen grid-bg">
      {/* Top bar */}
      <header className="border-b border-border/50 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero shadow-glow">
              <Grid3x3 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-display text-lg font-bold leading-none">KMap.solve</div>
              <div className="text-[10px] font-mono text-muted-foreground">
                digital logic simplifier
              </div>
            </div>
          </div>
          <div className="hidden items-center gap-6 text-xs text-muted-foreground sm:flex">
            <a
              href="https://en.wikipedia.org/wiki/Karnaugh_map"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 hover:text-foreground transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Learn K-Maps
            </a>
            <span className="flex items-center gap-1.5 font-mono">
              <Zap className="h-3.5 w-3.5 text-accent" />
              Quine-McCluskey engine
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 max-w-3xl"
        >
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-mono text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse-glow" />
            Real-time simplification
          </div>
          <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
            Simplify Boolean expressions with{" "}
            <span className="text-gradient">visual K-Maps</span>.
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Interactive Karnaugh Map solver for 2–4 variables. Toggle cells, paste minterms, or input
            maxterms — get the minimal SOP/POS form instantly with grouped prime implicants.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <SolverPanel />
        </motion.div>

        <footer className="mt-16 border-t border-border/50 pt-6 text-center text-xs text-muted-foreground">
          <p className="font-mono">
            built for digital logic students · powered by Quine-McCluskey
          </p>
        </footer>
      </main>
    </div>
  );
}
