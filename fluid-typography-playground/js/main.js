(function () {
  "use strict";

  const els = {
    minInput: document.getElementById("min-input"),
    maxInput: document.getElementById("max-input"),
    w1Input: document.getElementById("w1-input"),
    w2Input: document.getElementById("w2-input"),
    minDisplay: document.getElementById("min-display"),
    maxDisplay: document.getElementById("max-display"),
    w1Display: document.getElementById("w1-display"),
    w2Display: document.getElementById("w2-display"),
    slopeDisplay: document.getElementById("slope-display"),
    interceptDisplay: document.getElementById("intercept-display"),
    outMin: document.getElementById("out-min"),
    outMiddle: document.getElementById("out-middle"),
    outMax: document.getElementById("out-max"),
    copyBtn: document.getElementById("copy-btn"),
    resetBtn: document.getElementById("reset-btn"),
    warn: document.getElementById("warn"),
    graph: document.getElementById("graph"),
    previewSlider: document.getElementById("preview-slider"),
    previewContainer: document.getElementById("preview-container"),
    previewText: document.getElementById("preview-text"),
    previewWidth: document.getElementById("preview-width"),
    previewFont: document.getElementById("preview-font"),
    previewMarkers: document.getElementById("preview-markers"),
  };

  const DEFAULTS = { min: 1.45, max: 2.25, w1: 252, w2: 432 };
  const REM = 16;

  // ============ STATE ============

  function getState() {
    return {
      minRem: parseFloat(els.minInput.value),
      maxRem: parseFloat(els.maxInput.value),
      w1: parseInt(els.w1Input.value, 10),
      w2: parseInt(els.w2Input.value, 10),
    };
  }

  // ============ COMPUTE ============

  function compute(s) {
    const minPx = s.minRem * REM;
    const maxPx = s.maxRem * REM;

    const valid = s.w2 > s.w1 && s.maxRem > s.minRem;

    // slope: font-px per container-px
    const slopePx = valid ? (maxPx - minPx) / (s.w2 - s.w1) : 0;
    // slope expressed as cqi coefficient
    const slopeCqi = slopePx * 100;
    // intercept in px (at container-width = 0)
    const interceptPx = minPx - slopePx * s.w1;
    const interceptRem = interceptPx / REM;

    return {
      ...s,
      minPx,
      maxPx,
      slopePx,
      slopeCqi,
      interceptPx,
      interceptRem,
      valid,
    };
  }

  // Given a container width, compute the actual font-size that clamp would produce
  function fontForWidth(c, r) {
    if (!r.valid) return r.minPx;
    const preferred = r.interceptPx + r.slopePx * c;
    return Math.max(r.minPx, Math.min(r.maxPx, preferred));
  }

  // ============ RENDER ============

  function fmtRem(n) {
    return (Math.round(n * 1000) / 1000).toFixed(3).replace(/\.?0+$/, "") + "rem";
  }

  function fmtPx(n, decimals = 1) {
    return (
      (Math.round(n * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals) + "px"
    );
  }

  function fmtCqi(n) {
    const v = Math.round(n * 100) / 100;
    return v.toFixed(2).replace(/\.?0+$/, "") + "cqi";
  }

  function renderInputs(s) {
    els.minDisplay.textContent = s.minRem.toFixed(s.minRem % 1 === 0 ? 0 : 3).replace(/\.?0+$/, "");
    els.maxDisplay.textContent = s.maxRem.toFixed(s.maxRem % 1 === 0 ? 0 : 3).replace(/\.?0+$/, "");
    els.w1Display.textContent = s.w1;
    els.w2Display.textContent = s.w2;
  }

  function renderDerived(r) {
    els.warn.classList.toggle("show", !r.valid);
    els.slopeDisplay.textContent = r.valid ? fmtCqi(r.slopeCqi) : "—";
    els.interceptDisplay.textContent = r.valid ? fmtRem(r.interceptRem) : "—";

    els.outMin.textContent = fmtRem(r.minRem);
    els.outMax.textContent = fmtRem(r.maxRem);
    els.outMiddle.textContent = r.valid ? `${fmtRem(r.interceptRem)} + ${fmtCqi(r.slopeCqi)}` : "—";
  }

  // ============ GRAPH ============

  function renderGraph(r) {
    const svg = els.graph;
    const W = 600,
      H = 280;
    const pad = { top: 20, right: 30, bottom: 36, left: 52 };
    const plotW = W - pad.left - pad.right;
    const plotH = H - pad.top - pad.bottom;

    // Axis ranges
    // x: container width, pad beyond W1..W2 so bounds are visible
    const xRange = r.w2 - r.w1;
    const xPad = Math.max(xRange * 0.35, 60);
    const xMin = Math.max(0, r.w1 - xPad);
    const xMax = r.w2 + xPad;

    // y: font size in px, pad beyond MIN..MAX
    const yRange = r.maxPx - r.minPx;
    const yPad = Math.max(yRange * 0.35, 6);
    const yMin = Math.max(0, r.minPx - yPad);
    const yMax = r.maxPx + yPad;

    const xScale = (x) => pad.left + ((x - xMin) / (xMax - xMin)) * plotW;
    const yScale = (y) => pad.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

    // Build SVG content
    let html = "";

    // Grid lines (horizontal)
    const gridYSteps = 4;
    for (let i = 0; i <= gridYSteps; i++) {
      const yv = yMin + (yMax - yMin) * (i / gridYSteps);
      const y = yScale(yv);
      html += `<line x1="${pad.left}" y1="${y}" x2="${W - pad.right}" y2="${y}" stroke="#DCD2BE" stroke-width="1" stroke-dasharray="2 3"/>`;
      html += `<text x="${pad.left - 8}" y="${y + 4}" fill="#8A7F70" font-family="JetBrains Mono" font-size="10" text-anchor="end">${yv.toFixed(0)}px</text>`;
    }

    // Grid lines (vertical)
    const gridXSteps = 5;
    for (let i = 0; i <= gridXSteps; i++) {
      const xv = xMin + (xMax - xMin) * (i / gridXSteps);
      const x = xScale(xv);
      html += `<line x1="${x}" y1="${pad.top}" x2="${x}" y2="${H - pad.bottom}" stroke="#DCD2BE" stroke-width="1" stroke-dasharray="2 3"/>`;
      html += `<text x="${x}" y="${H - pad.bottom + 16}" fill="#8A7F70" font-family="JetBrains Mono" font-size="10" text-anchor="middle">${xv.toFixed(0)}</text>`;
    }

    // Axis labels
    html += `<text x="${pad.left - 38}" y="${pad.top - 6}" fill="#4A4138" font-family="JetBrains Mono" font-size="10" font-weight="600">y = font</text>`;
    html += `<text x="${W - pad.right}" y="${H - 4}" fill="#4A4138" font-family="JetBrains Mono" font-size="10" font-weight="600" text-anchor="end">x = container (px)</text>`;

    if (r.valid) {
      // Clamp bounds as horizontal reference lines (the "ceiling" and "floor" the line hits)
      const yMinPx = yScale(r.minPx);
      const yMaxPx = yScale(r.maxPx);
      html += `<line x1="${pad.left}" y1="${yMinPx}" x2="${W - pad.right}" y2="${yMinPx}" stroke="#1A1714" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.4"/>`;
      html += `<line x1="${pad.left}" y1="${yMaxPx}" x2="${W - pad.right}" y2="${yMaxPx}" stroke="#1A1714" stroke-width="1.5" stroke-dasharray="4 3" opacity="0.4"/>`;
      html += `<text x="${W - pad.right - 4}" y="${yMinPx - 5}" fill="#1A1714" font-family="JetBrains Mono" font-size="10" text-anchor="end" opacity="0.75">MIN ${r.minPx.toFixed(1)}px</text>`;
      html += `<text x="${W - pad.right - 4}" y="${yMaxPx - 5}" fill="#1A1714" font-family="JetBrains Mono" font-size="10" text-anchor="end" opacity="0.75">MAX ${r.maxPx.toFixed(1)}px</text>`;

      // Full clamped curve: flat at MIN, line segment, flat at MAX
      const x0 = xScale(xMin);
      const xW1 = xScale(r.w1);
      const xW2 = xScale(r.w2);
      const xEnd = xScale(xMax);

      // Flat MIN segment (dark/thick — this is what user sees)
      html += `<line x1="${x0}" y1="${yMinPx}" x2="${xW1}" y2="${yMinPx}" stroke="#1A1714" stroke-width="2.5"/>`;
      // Rising segment (accent — the "active" line)
      html += `<line x1="${xW1}" y1="${yMinPx}" x2="${xW2}" y2="${yMaxPx}" stroke="#B84A2F" stroke-width="2.5"/>`;
      // Flat MAX segment
      html += `<line x1="${xW2}" y1="${yMaxPx}" x2="${xEnd}" y2="${yMaxPx}" stroke="#1A1714" stroke-width="2.5"/>`;

      // Extension of the underlying line (what y=mx+b would compute *without* clamping)
      // Dashed, low opacity
      const lineAtX = (x) => r.interceptPx + r.slopePx * x;
      const extX0 = xMin;
      const extX1 = xMax;
      const extY0 = lineAtX(extX0);
      const extY1 = lineAtX(extX1);
      // Only draw the parts that are outside the clamp segment and within y-range
      const clampYToPlot = (y) => Math.max(yMin, Math.min(yMax, y));

      // Left extension (below W1, where the line goes below MIN)
      if (extY0 < r.minPx) {
        const visY0 = clampYToPlot(extY0);
        // find x where extended line crosses yMin (bottom of plot)
        let extStartX = extX0;
        if (extY0 < yMin) {
          extStartX = (yMin - r.interceptPx) / r.slopePx;
        }
        html += `<line x1="${xScale(extStartX)}" y1="${yScale(Math.max(extY0, yMin))}" x2="${xW1}" y2="${yMinPx}" stroke="#B84A2F" stroke-width="1" stroke-dasharray="3 3" opacity="0.45"/>`;
      }
      // Right extension (above W2, where the line goes above MAX)
      if (extY1 > r.maxPx) {
        let extEndX = extX1;
        if (extY1 > yMax) {
          extEndX = (yMax - r.interceptPx) / r.slopePx;
        }
        html += `<line x1="${xW2}" y1="${yMaxPx}" x2="${xScale(extEndX)}" y2="${yScale(Math.min(extY1, yMax))}" stroke="#B84A2F" stroke-width="1" stroke-dasharray="3 3" opacity="0.45"/>`;
      }

      // W1 / W2 vertical markers
      html += `<line x1="${xW1}" y1="${pad.top}" x2="${xW1}" y2="${H - pad.bottom}" stroke="#8A7F70" stroke-width="1" stroke-dasharray="2 4"/>`;
      html += `<line x1="${xW2}" y1="${pad.top}" x2="${xW2}" y2="${H - pad.bottom}" stroke="#8A7F70" stroke-width="1" stroke-dasharray="2 4"/>`;
      html += `<text x="${xW1}" y="${pad.top - 6}" fill="#B84A2F" font-family="JetBrains Mono" font-size="10" font-weight="600" text-anchor="middle">W₁=${r.w1}</text>`;
      html += `<text x="${xW2}" y="${pad.top - 6}" fill="#B84A2F" font-family="JetBrains Mono" font-size="10" font-weight="600" text-anchor="middle">W₂=${r.w2}</text>`;

      // Endpoint dots
      html += `<circle cx="${xW1}" cy="${yMinPx}" r="4" fill="#B84A2F" stroke="#F2EDE2" stroke-width="2"/>`;
      html += `<circle cx="${xW2}" cy="${yMaxPx}" r="4" fill="#B84A2F" stroke="#F2EDE2" stroke-width="2"/>`;

      // Current preview-width indicator
      const previewW = parseInt(els.previewSlider.value, 10);
      if (previewW >= xMin && previewW <= xMax) {
        const previewFont = fontForWidth(previewW, r);
        const px = xScale(previewW);
        const py = yScale(previewFont);
        html += `<line x1="${px}" y1="${pad.top}" x2="${px}" y2="${H - pad.bottom}" stroke="#E8C547" stroke-width="1.5" opacity="0.8"/>`;
        html += `<circle cx="${px}" cy="${py}" r="5" fill="#E8C547" stroke="#1A1714" stroke-width="1.5"/>`;
      }
    }

    svg.innerHTML = html;
  }

  // ============ PREVIEW ============

  function renderPreview(r) {
    const w = parseInt(els.previewSlider.value, 10);
    els.previewContainer.style.width = w + "px";
    els.previewWidth.textContent = w;

    // Apply the actual clamp so the browser computes font-size for us
    if (r.valid) {
      const clampValue = `clamp(${r.minRem}rem, ${r.interceptRem}rem + ${r.slopeCqi}cqi, ${r.maxRem}rem)`;
      els.previewText.style.fontSize = clampValue;
    } else {
      els.previewText.style.fontSize = `${r.minRem}rem`;
    }

    // Read back what the browser actually computed
    requestAnimationFrame(() => {
      const computedPx = parseFloat(getComputedStyle(els.previewText).fontSize);
      els.previewFont.textContent = computedPx.toFixed(1) + "px";
    });
  }

  function renderPreviewMarkers(r) {
    const slider = els.previewSlider;
    const min = parseInt(slider.min, 10);
    const max = parseInt(slider.max, 10);
    const toPct = (v) => ((v - min) / (max - min)) * 100;

    const current = parseInt(slider.value, 10);
    let html = "";
    // W1
    if (r.w1 >= min && r.w1 <= max) {
      html += `<div class="marker is-bound" style="left:${toPct(r.w1)}%">W₁ · ${r.w1}</div>`;
    }
    // W2
    if (r.w2 >= min && r.w2 <= max) {
      html += `<div class="marker is-bound" style="left:${toPct(r.w2)}%">W₂ · ${r.w2}</div>`;
    }
    els.previewMarkers.innerHTML = html;
  }

  // ============ RENDER ALL ============

  function renderAll() {
    const s = getState();
    const r = compute(s);
    renderInputs(s);
    renderDerived(r);
    renderGraph(r);
    renderPreview(r);
    renderPreviewMarkers(r);
  }

  // ============ EVENTS ============

  [els.minInput, els.maxInput, els.w1Input, els.w2Input, els.previewSlider].forEach((el) => {
    el.addEventListener("input", renderAll);
  });

  els.copyBtn.addEventListener("click", () => {
    const s = getState();
    const r = compute(s);
    if (!r.valid) return;
    const css = `font-size: clamp(${fmtRem(r.minRem)}, ${fmtRem(r.interceptRem)} + ${fmtCqi(r.slopeCqi)}, ${fmtRem(r.maxRem)});`;

    navigator.clipboard.writeText(css).then(() => {
      els.copyBtn.textContent = "Copied";
      els.copyBtn.classList.add("copied");
      setTimeout(() => {
        els.copyBtn.textContent = "Copy";
        els.copyBtn.classList.remove("copied");
      }, 1400);
    });
  });

  els.resetBtn.addEventListener("click", () => {
    els.minInput.value = DEFAULTS.min;
    els.maxInput.value = DEFAULTS.max;
    els.w1Input.value = DEFAULTS.w1;
    els.w2Input.value = DEFAULTS.w2;
    els.previewSlider.value = DEFAULTS.w1;
    renderAll();
  });

  // Initial render
  renderAll();
})();
