// Boolean expression parser
// Supports: A, B, C, D, E variables; ' or ! for NOT; implicit AND (AB), * or ·; + or | for OR; parentheses
// Examples: F = A'B + AB'C + BC, (A+B)(C'+D), !A*B + A*!B

export interface ParseResult {
  numVars: number;
  minterms: number[];
  varsUsed: string[];
}

const VAR_ORDER = ["A", "B", "C", "D", "E"];

type Token =
  | { type: "var"; name: string; negated: boolean }
  | { type: "op"; op: "+" | "*" }
  | { type: "lparen" }
  | { type: "rparen" };

function tokenize(input: string): Token[] {
  // Remove "F =" prefix and whitespace
  let s = input.replace(/^\s*[A-Za-z]\s*=\s*/, "").replace(/\s+/g, "");
  const tokens: Token[] = [];
  let i = 0;

  const pushImplicitAnd = () => {
    const last = tokens[tokens.length - 1];
    if (!last) return;
    if (last.type === "var" || last.type === "rparen") {
      tokens.push({ type: "op", op: "*" });
    }
  };

  while (i < s.length) {
    const c = s[i];
    if (c === "+" || c === "|") {
      tokens.push({ type: "op", op: "+" });
      i++;
    } else if (c === "*" || c === "·" || c === "&" || c === "." ) {
      tokens.push({ type: "op", op: "*" });
      i++;
    } else if (c === "(") {
      pushImplicitAnd();
      tokens.push({ type: "lparen" });
      i++;
    } else if (c === ")") {
      tokens.push({ type: "rparen" });
      i++;
    } else if (c === "!" || c === "~" || c === "¬") {
      // Prefix NOT - attach to next variable
      i++;
      if (i >= s.length) throw new Error("Dangling NOT");
      const next = s[i].toUpperCase();
      if (!/[A-E]/.test(next)) throw new Error(`Expected variable after NOT, got '${s[i]}'`);
      pushImplicitAnd();
      tokens.push({ type: "var", name: next, negated: true });
      i++;
      // Allow postfix ' too (double neg)
      while (s[i] === "'") {
        const t = tokens[tokens.length - 1] as Extract<Token, { type: "var" }>;
        t.negated = !t.negated;
        i++;
      }
    } else if (/[a-eA-E]/.test(c)) {
      pushImplicitAnd();
      const name = c.toUpperCase();
      i++;
      let negated = false;
      while (s[i] === "'") {
        negated = !negated;
        i++;
      }
      tokens.push({ type: "var", name, negated });
    } else {
      throw new Error(`Unexpected character '${c}'`);
    }
  }
  return tokens;
}

// AST
type Node =
  | { type: "var"; name: string; negated: boolean }
  | { type: "and"; children: Node[] }
  | { type: "or"; children: Node[] };

// Parser: OR has lower precedence than AND
function parse(tokens: Token[]): Node {
  let pos = 0;

  function parseOr(): Node {
    const terms: Node[] = [parseAnd()];
    while (pos < tokens.length && tokens[pos].type === "op" && (tokens[pos] as any).op === "+") {
      pos++;
      terms.push(parseAnd());
    }
    return terms.length === 1 ? terms[0] : { type: "or", children: terms };
  }

  function parseAnd(): Node {
    const factors: Node[] = [parseAtom()];
    while (pos < tokens.length && tokens[pos].type === "op" && (tokens[pos] as any).op === "*") {
      pos++;
      factors.push(parseAtom());
    }
    return factors.length === 1 ? factors[0] : { type: "and", children: factors };
  }

  function parseAtom(): Node {
    const t = tokens[pos];
    if (!t) throw new Error("Unexpected end of expression");
    if (t.type === "lparen") {
      pos++;
      const node = parseOr();
      if (tokens[pos]?.type !== "rparen") throw new Error("Missing closing parenthesis");
      pos++;
      return node;
    }
    if (t.type === "var") {
      pos++;
      return { type: "var", name: t.name, negated: t.negated };
    }
    throw new Error(`Unexpected token`);
  }

  const result = parseOr();
  if (pos < tokens.length) throw new Error("Unexpected trailing tokens");
  return result;
}

function evaluate(node: Node, assignment: Record<string, 0 | 1>): 0 | 1 {
  if (node.type === "var") {
    const v = assignment[node.name] ?? 0;
    return (node.negated ? (v ? 0 : 1) : v) as 0 | 1;
  }
  if (node.type === "and") {
    for (const c of node.children) if (evaluate(c, assignment) === 0) return 0;
    return 1;
  }
  // or
  for (const c of node.children) if (evaluate(c, assignment) === 1) return 1;
  return 0;
}

function collectVars(node: Node, set: Set<string>) {
  if (node.type === "var") set.add(node.name);
  else node.children.forEach((c) => collectVars(c, set));
}

export function parseExpression(input: string, numVars: number): ParseResult {
  const tokens = tokenize(input);
  if (tokens.length === 0) throw new Error("Empty expression");
  const ast = parse(tokens);

  const usedSet = new Set<string>();
  collectVars(ast, usedSet);
  const varsUsed = VAR_ORDER.slice(0, numVars).filter((v) => usedSet.has(v));

  // Validate vars are within numVars
  for (const v of usedSet) {
    const idx = VAR_ORDER.indexOf(v);
    if (idx === -1 || idx >= numVars) {
      throw new Error(`Variable ${v} not allowed for ${numVars}-variable map (use ${VAR_ORDER.slice(0, numVars).join(", ")})`);
    }
  }

  const total = 1 << numVars;
  const minterms: number[] = [];
  const activeVars = VAR_ORDER.slice(0, numVars);

  for (let i = 0; i < total; i++) {
    const assignment: Record<string, 0 | 1> = {};
    activeVars.forEach((v, bitIdx) => {
      // MSB = first variable (A)
      const bitPos = numVars - 1 - bitIdx;
      assignment[v] = ((i >> bitPos) & 1) as 0 | 1;
    });
    if (evaluate(ast, assignment) === 1) minterms.push(i);
  }

  return { numVars, minterms, varsUsed };
}
