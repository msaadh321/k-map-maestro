import jsPDF from "jspdf";
import { type CellValue, type Mode, type SolveResult, getKmapLayout } from "@/lib/kmap-solver";

// Hex equivalents of the OKLCH group tokens (approximated for PDF rendering)
const GROUP_HEX = ["#e5484d", "#a3e635", "#c084fc", "#fbbf24", "#f472b6", "#22d3ee"];
const PRIMARY_HEX = "#22d3ee";
const ACCENT_HEX = "#a3e635";
const TEXT_HEX = "#0f172a";
const MUTED_HEX = "#64748b";
const BORDER_HEX = "#cbd5e1";

export function exportSolutionPDF(opts: {
  numVars: number;
  values: CellValue[];
  mode: Mode;
  result: SolveResult;
}) {
  const { numVars, values, mode, result } = opts;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = 48;
  let y = margin;

  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(TEXT_HEX);
  doc.text("K-Map Solution", margin, y);
  y += 8;
  doc.setDrawColor(PRIMARY_HEX);
  doc.setLineWidth(2);
  doc.line(margin, y, margin + 60, y);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(MUTED_HEX);
  doc.text(
    `${numVars}-variable Karnaugh map · ${mode} simplification · generated ${new Date().toLocaleString()}`,
    margin,
    y,
  );
  y += 24;

  // Expression box
  doc.setDrawColor(PRIMARY_HEX);
  doc.setFillColor(245, 252, 254);
  doc.setLineWidth(1);
  doc.roundedRect(margin, y, pageW - margin * 2, 60, 6, 6, "FD");
  doc.setFontSize(9);
  doc.setTextColor(MUTED_HEX);
  doc.text(`SIMPLIFIED ${mode}`, margin + 14, y + 18);
  doc.setFont("courier", "bold");
  doc.setFontSize(16);
  doc.setTextColor(TEXT_HEX);
  const expr = `F = ${result.expression}`;
  doc.text(expr, margin + 14, y + 42, { maxWidth: pageW - margin * 2 - 28 });
  y += 80;

  // K-Map
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(TEXT_HEX);
  doc.text("Karnaugh Map", margin, y);
  y += 14;

  y = drawKMap(doc, margin, y, numVars, values, result, mode);
  y += 24;

  // Page break check
  if (y > 700) {
    doc.addPage();
    y = margin;
  }

  // Groups
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(TEXT_HEX);
  doc.text(`Prime Implicant Groups (${result.groups.length})`, margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);

  result.groups.forEach((g, i) => {
    if (y > 760) {
      doc.addPage();
      y = margin;
    }
    const color = GROUP_HEX[i % GROUP_HEX.length];
    // color swatch
    doc.setFillColor(color);
    doc.circle(margin + 6, y - 3, 4, "F");
    // term
    doc.setFont("courier", "bold");
    doc.setFontSize(11);
    doc.setTextColor(TEXT_HEX);
    doc.text(g.term, margin + 18, y);
    // size + minterms
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(MUTED_HEX);
    doc.text(
      `size ${g.size}  ·  {${g.minterms.join(", ")}}`,
      margin + 18 + doc.getTextWidth(g.term) + 12,
      y,
    );
    y += 18;
  });

  y += 12;

  // Steps
  if (y > 720) {
    doc.addPage();
    y = margin;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(TEXT_HEX);
  doc.text("Step-by-step", margin, y);
  y += 18;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(TEXT_HEX);
  result.steps.forEach((s, i) => {
    if (y > 770) {
      doc.addPage();
      y = margin;
    }
    const lines = doc.splitTextToSize(`${i + 1}. ${s}`, pageW - margin * 2 - 12);
    doc.text(lines, margin + 6, y);
    y += lines.length * 14 + 4;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(MUTED_HEX);
    doc.text(
      `KMap.solve · page ${p} / ${pageCount}`,
      pageW / 2,
      doc.internal.pageSize.getHeight() - 20,
      { align: "center" },
    );
  }

  doc.save(`kmap-solution-${mode.toLowerCase()}.pdf`);
}

function drawKMap(
  doc: jsPDF,
  startX: number,
  startY: number,
  numVars: number,
  values: CellValue[],
  result: SolveResult,
  mode: Mode,
): number {
  const layout = getKmapLayout(numVars);
  const cellSize = 44;
  const labelOffset = 30;
  const x0 = startX + labelOffset;
  const y0 = startY + labelOffset;

  // Map idx -> group color indices
  const cellGroups: Record<number, number[]> = {};
  result.groups.forEach((g, gi) => {
    g.minterms.forEach((m) => {
      (cellGroups[m] ||= []).push(gi);
    });
  });

  // Axis labels (top-left corner)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(ACCENT_HEX);
  doc.text(layout.rowVars, startX + 4, startY + 14);
  doc.setTextColor(MUTED_HEX);
  doc.text("\\", startX + 16, startY + 18);
  doc.setTextColor(PRIMARY_HEX);
  doc.text(layout.colVars, startX + 22, startY + 22);

  const rowBits = layout.rowVars.length;
  const colBits = layout.colVars.length;

  // Column headers (gray code)
  doc.setFont("courier", "normal");
  doc.setFontSize(9);
  doc.setTextColor(PRIMARY_HEX);
  for (let c = 0; c < layout.cols; c++) {
    const lbl = layout.colGray[c].toString(2).padStart(colBits, "0");
    doc.text(lbl, x0 + c * cellSize + cellSize / 2, startY + 22, { align: "center" });
  }

  // Row headers
  doc.setTextColor(ACCENT_HEX);
  for (let r = 0; r < layout.rows; r++) {
    const lbl = layout.rowGray[r].toString(2).padStart(rowBits, "0");
    doc.text(lbl, startX + labelOffset - 6, y0 + r * cellSize + cellSize / 2 + 3, { align: "right" });
  }

  // Cells
  for (let r = 0; r < layout.rows; r++) {
    for (let c = 0; c < layout.cols; c++) {
      const idx = layout.indexOf(r, c);
      const v = values[idx];
      const groupIdxs = cellGroups[idx] || [];
      const primary = groupIdxs[0];
      const cx = x0 + c * cellSize;
      const cy = y0 + r * cellSize;

      // Cell border + fill
      if (primary !== undefined) {
        doc.setDrawColor(GROUP_HEX[primary % GROUP_HEX.length]);
        doc.setLineWidth(2);
        // tinted fill
        const tint = hexToRgbTint(GROUP_HEX[primary % GROUP_HEX.length], 0.12);
        doc.setFillColor(tint.r, tint.g, tint.b);
        doc.roundedRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 4, 4, "FD");
      } else {
        doc.setDrawColor(BORDER_HEX);
        doc.setLineWidth(0.5);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 4, 4, "FD");
      }

      // Cell value
      doc.setFont("courier", "bold");
      doc.setFontSize(14);
      if (v === 1) doc.setTextColor(mode === "SOP" ? PRIMARY_HEX : TEXT_HEX);
      else if (v === "X") doc.setTextColor("#f59e0b");
      else doc.setTextColor(MUTED_HEX);
      doc.text(String(v), cx + cellSize / 2, cy + cellSize / 2 + 5, { align: "center" });

      // Index in corner
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6);
      doc.setTextColor(MUTED_HEX);
      doc.text(String(idx), cx + 5, cy + 9);

      // Multi-group dots
      if (groupIdxs.length > 1) {
        groupIdxs.slice(1).forEach((gi, di) => {
          doc.setFillColor(GROUP_HEX[gi % GROUP_HEX.length]);
          doc.circle(cx + cellSize - 8 - di * 5, cy + cellSize - 6, 1.5, "F");
        });
      }
    }
  }

  return y0 + layout.rows * cellSize + 8;
}

function hexToRgbTint(hex: string, alpha: number): { r: number; g: number; b: number } {
  const h = hex.replace("#", "");
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  // Blend with white
  return {
    r: Math.round(r * alpha + 255 * (1 - alpha)),
    g: Math.round(g * alpha + 255 * (1 - alpha)),
    b: Math.round(b * alpha + 255 * (1 - alpha)),
  };
}
