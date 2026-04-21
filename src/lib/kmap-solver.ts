// Quine-McCluskey K-Map solver
// Variables: up to 4 supported in v1 (A,B,C,D)

export type CellValue = 0 | 1 | "X";
export type Mode = "SOP" | "POS";

export interface SolveResult {
  expression: string;
  groups: GroupInfo[];
  primeImplicants: string[];
  essentialPrimes: string[];
  steps: string[];
}

export interface GroupInfo {
  minterms: number[];
  pattern: string; // e.g. "1-0-"  (- is dash)
  term: string; // e.g. "AC'"
  size: number;
}

const VARS = ["A", "B", "C", "D", "E"];

function countOnes(n: number, bits: number): number {
  let c = 0;
  for (let i = 0; i < bits; i++) if (n & (1 << i)) c++;
  return c;
}

function toBin(n: number, bits: number): string {
  return n.toString(2).padStart(bits, "0");
}

function combine(a: string, b: string): string | null {
  let diff = 0;
  let res = "";
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) res += a[i];
    else {
      diff++;
      res += "-";
    }
    if (diff > 1) return null;
  }
  return diff === 1 ? res : null;
}

interface Implicant {
  pattern: string;
  minterms: number[];
  used: boolean;
}

function findPrimeImplicants(minterms: number[], dontCares: number[], bits: number): Implicant[] {
  const all = [...minterms, ...dontCares];
  if (all.length === 0) return [];

  let current: Implicant[] = all.map((m) => ({
    pattern: toBin(m, bits),
    minterms: [m],
    used: false,
  }));

  const primes: Implicant[] = [];
  const seen = new Set<string>();

  while (current.length > 0) {
    const next: Implicant[] = [];
    const usedIdx = new Set<number>();
    const groups: Record<number, Implicant[]> = {};
    current.forEach((imp) => {
      const ones = (imp.pattern.match(/1/g) || []).length;
      (groups[ones] ||= []).push(imp);
    });
    const keys = Object.keys(groups).map(Number).sort((a, b) => a - b);

    for (let k = 0; k < keys.length - 1; k++) {
      const g1 = groups[keys[k]];
      const g2 = groups[keys[k + 1]];
      if (keys[k + 1] !== keys[k] + 1) continue;
      for (let i = 0; i < g1.length; i++) {
        for (let j = 0; j < g2.length; j++) {
          const combined = combine(g1[i].pattern, g2[j].pattern);
          if (combined !== null) {
            const idxA = current.indexOf(g1[i]);
            const idxB = current.indexOf(g2[j]);
            usedIdx.add(idxA);
            usedIdx.add(idxB);
            const merged = [...new Set([...g1[i].minterms, ...g2[j].minterms])].sort((a, b) => a - b);
            const key = combined + "|" + merged.join(",");
            if (!seen.has(key)) {
              seen.add(key);
              next.push({ pattern: combined, minterms: merged, used: false });
            }
          }
        }
      }
    }

    current.forEach((imp, idx) => {
      if (!usedIdx.has(idx)) {
        const key = imp.pattern + "|" + imp.minterms.join(",");
        if (!seen.has(key + "_p")) {
          seen.add(key + "_p");
          primes.push(imp);
        }
      }
    });

    current = next;
  }

  return primes;
}

function selectEssential(primes: Implicant[], minterms: number[]): Implicant[] {
  const chart: Record<number, number[]> = {};
  minterms.forEach((m) => (chart[m] = []));
  primes.forEach((p, idx) => {
    p.minterms.forEach((m) => {
      if (chart[m] !== undefined) chart[m].push(idx);
    });
  });

  const selected = new Set<number>();
  const covered = new Set<number>();

  // Essential primes
  Object.entries(chart).forEach(([m, idxs]) => {
    if (idxs.length === 1) {
      selected.add(idxs[0]);
      primes[idxs[0]].minterms.forEach((mt) => covered.add(mt));
    }
  });

  // Greedy cover for remaining
  const remaining = minterms.filter((m) => !covered.has(m));
  while (remaining.some((m) => !covered.has(m))) {
    let bestIdx = -1;
    let bestCount = 0;
    primes.forEach((p, idx) => {
      if (selected.has(idx)) return;
      const count = p.minterms.filter((m) => remaining.includes(m) && !covered.has(m)).length;
      if (count > bestCount) {
        bestCount = count;
        bestIdx = idx;
      }
    });
    if (bestIdx === -1) break;
    selected.add(bestIdx);
    primes[bestIdx].minterms.forEach((m) => covered.add(m));
  }

  return Array.from(selected).map((i) => primes[i]);
}

function patternToTerm(pattern: string, mode: Mode, varNames: string[]): string {
  const parts: string[] = [];
  for (let i = 0; i < pattern.length; i++) {
    const ch = pattern[i];
    const v = varNames[i];
    if (ch === "-") continue;
    if (mode === "SOP") {
      parts.push(ch === "1" ? v : v + "'");
    } else {
      // POS: from maxterms, complement
      parts.push(ch === "0" ? v : v + "'");
    }
  }
  if (parts.length === 0) return mode === "SOP" ? "1" : "0";
  return mode === "SOP" ? parts.join("") : "(" + parts.join(" + ") + ")";
}

export function solve(
  numVars: number,
  values: CellValue[],
  mode: Mode = "SOP",
): SolveResult {
  const total = 1 << numVars;
  const minterms: number[] = [];
  const maxterms: number[] = [];
  const dontCares: number[] = [];

  for (let i = 0; i < total; i++) {
    const v = values[i];
    if (v === "X") dontCares.push(i);
    else if (v === 1) minterms.push(i);
    else maxterms.push(i);
  }

  const target = mode === "SOP" ? minterms : maxterms;
  const varNames = VARS.slice(0, numVars);

  if (target.length === 0) {
    return {
      expression: mode === "SOP" ? "0" : "1",
      groups: [],
      primeImplicants: [],
      essentialPrimes: [],
      steps: [`No ${mode === "SOP" ? "minterms" : "maxterms"} to cover.`],
    };
  }

  if (target.length + dontCares.length === total) {
    return {
      expression: mode === "SOP" ? "1" : "0",
      groups: [
        {
          minterms: target,
          pattern: "-".repeat(numVars),
          term: mode === "SOP" ? "1" : "0",
          size: target.length,
        },
      ],
      primeImplicants: ["-".repeat(numVars)],
      essentialPrimes: ["-".repeat(numVars)],
      steps: ["All cells covered → constant output."],
    };
  }

  const primes = findPrimeImplicants(target, dontCares, numVars);
  const essential = selectEssential(primes, target);

  const groups: GroupInfo[] = essential.map((p) => ({
    minterms: p.minterms.filter((m) => target.includes(m)),
    pattern: p.pattern,
    term: patternToTerm(p.pattern, mode, varNames),
    size: p.minterms.length,
  }));

  const expression =
    mode === "SOP"
      ? groups.map((g) => g.term).join(" + ")
      : groups.map((g) => g.term).join(" · ");

  const steps = [
    `Identified ${target.length} ${mode === "SOP" ? "minterms" : "maxterms"}: {${target.join(", ")}}${dontCares.length ? ` with don't-cares {${dontCares.join(", ")}}` : ""}.`,
    `Found ${primes.length} prime implicant${primes.length === 1 ? "" : "s"} via Quine-McCluskey.`,
    `Selected ${essential.length} cover${essential.length === 1 ? "" : "s"} (essential + greedy).`,
    `Final ${mode}: ${expression}`,
  ];

  return {
    expression,
    groups,
    primeImplicants: primes.map((p) => p.pattern),
    essentialPrimes: essential.map((p) => p.pattern),
    steps,
  };
}

// Convert minterm index to K-map (row, col) for standard layouts
// 2 vars: 1x4 (or 2x2). 3 vars: 2x4. 4 vars: 4x4.
const GRAY_2 = [0, 1, 3, 2];
const GRAY_1 = [0, 1];

export function getKmapLayout(numVars: number) {
  if (numVars === 2) {
    return {
      rows: 2,
      cols: 2,
      rowGray: GRAY_1,
      colGray: GRAY_1,
      rowVars: "A",
      colVars: "B",
      indexOf: (r: number, c: number) => (GRAY_1[r] << 1) | GRAY_1[c],
    };
  }
  if (numVars === 3) {
    return {
      rows: 2,
      cols: 4,
      rowGray: GRAY_1,
      colGray: GRAY_2,
      rowVars: "A",
      colVars: "BC",
      indexOf: (r: number, c: number) => (GRAY_1[r] << 2) | GRAY_2[c],
    };
  }
  // 4 vars
  return {
    rows: 4,
    cols: 4,
    rowGray: GRAY_2,
    colGray: GRAY_2,
    rowVars: "AB",
    colVars: "CD",
    indexOf: (r: number, c: number) => (GRAY_2[r] << 2) | GRAY_2[c],
  };
}

export function parseMinterms(input: string): { terms: number[]; dontCares: number[] } {
  const terms: number[] = [];
  const dontCares: number[] = [];
  // Σ(1,3,5) d(2,4)  or  1,3,5
  const sigmaMatch = input.match(/(?:Σ|S|sum)?\s*\(([^)]*)\)/i);
  const dMatch = input.match(/d\s*\(([^)]*)\)/i);

  const parseList = (s: string) =>
    s
      .split(/[,\s]+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => parseInt(t, 10))
      .filter((n) => !isNaN(n));

  if (sigmaMatch) terms.push(...parseList(sigmaMatch[1]));
  else terms.push(...parseList(input.replace(/d\s*\([^)]*\)/i, "")));

  if (dMatch) dontCares.push(...parseList(dMatch[1]));

  return { terms: [...new Set(terms)], dontCares: [...new Set(dontCares)] };
}
