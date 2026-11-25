/* Three Axes of Science — explorer logic.
 * Depends on: Plotly (vendor/plotly.min.js), FIELDS / AXES / SCIENTISTS (data.js).
 *
 * Extending:
 *  - New scientist  → add an object to SCIENTISTS in data.js (or use the page's form).
 *  - New field      → add a key to FIELDS (up to 8 fields get distinct colours+symbols).
 *  - New dimension  → add a key to AXES and a score on each scientist; it appears in the
 *                     X/Y/Z selectors, the editor sliders and the table automatically.
 */
(function () {
  "use strict";

  const STORE_KEY = "three-axes-science.v1";
  const SYMBOL_POOL = ["circle", "square", "diamond", "cross", "x", "circle-open", "diamond-open", "square-open"];
  const AXIS_RANGE = [-0.6, 10.6];
  const WALL = AXIS_RANGE[0];
  const axisKeys = () => Object.keys(AXES);

  // ── State ───────────────────────────────────────────────────────────
  let nextId = 1;
  const state = {
    data: [],
    view: "3d",                     // "3d" | "xy" | "xz" | "yz" | "all"
    axes: { x: "math", y: "exp", z: "intuition" },
    colorBy: "field",
    breadth: "geo",                 // key of BREADTH
    labels: "key",
    yrMin: null, yrMax: null,
    search: "",
    jitter: true, shadows: true, livingOnly: false,
    hiddenFields: new Set(),
    selected: null,                 // _id
    sort: { key: "born", dir: 1 }
  };

  const clone = (o) => JSON.parse(JSON.stringify(o));
  const stripIds = (arr) => arr.map(({ _id, ...rest }) => rest);
  // Older exports used "insight" for the intuition axis; migrate them transparently.
  const migrate = (d) => {
    if (d.insight != null && d.intuition == null) { d = { ...d, intuition: d.insight }; delete d.insight; }
    return d;
  };
  const withIds = (arr) => arr.map((d) => ({ ...migrate(d), _id: nextId++ }));

  function loadData() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr) && arr.length) return withIds(arr);
      }
    } catch (e) { /* storage unavailable: fall back to defaults */ }
    return withIds(clone(SCIENTISTS));
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(stripIds(state.data))); setSaveState("Edits are kept in this browser."); }
      catch (e) { setSaveState("This browser isn't keeping edits — export JSON to keep them."); }
    }, 250);
  }
  const setSaveState = (t) => { document.getElementById("saveState").textContent = t; };

  function ensureFields() {
    state.data.forEach((d) => {
      if (!FIELDS[d.field]) FIELDS[d.field] = {};
    });
    Object.keys(FIELDS).forEach((f, i) => {
      if (!FIELDS[f].symbol) FIELDS[f].symbol = SYMBOL_POOL[i % SYMBOL_POOL.length];
    });
  }

  // ── Theme helpers ───────────────────────────────────────────────────
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  function fieldColor(field) {
    const i = Object.keys(FIELDS).indexOf(field);
    return css(`--series-${(i % 8) + 1}`);
  }
  function theme() {
    return {
      surface: css("--surface-1"), surface2: css("--surface-2"), page: css("--page"),
      text: css("--text-primary"), text2: css("--text-secondary"),
      grid: css("--grid"), axis: css("--axis"), accent: css("--accent"), shadow: css("--shadow"),
      seq: [[0, css("--seq-lo")], [0.5, css("--seq-mid")], [1, css("--seq-hi")]]
    };
  }

  // ── Data helpers ────────────────────────────────────────────────────
  function hash(str, salt) {
    let h = 2166136261 ^ salt;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return ((h >>> 0) / 4294967295) - 0.5; // [-0.5, 0.5]
  }
  const J = 0.42;
  // Jitter is seeded by (name, dimension), so a point sits at the same place along
  // "Math" in 3D and in every 2D projection, whichever screen axis Math is on.
  function coord(d, key) {
    const v = Number(d[key] ?? 0);
    return state.jitter ? v + J * hash(d.name, hash(key, 7) * 1e9 | 0) : v;
  }
  const fmtYear = (y) => (y == null ? "" : y < 0 ? `${-y} BCE` : `${y}`);
  const lifespan = (d) => d.died == null ? `b. ${fmtYear(d.born)}` : `${fmtYear(d.born)}–${fmtYear(d.died)}`;
  const total = (d) => axisKeys().reduce((s, k) => s + Number(d[k] ?? 0), 0);

  // ── Breadth of knowledge ────────────────────────────────────────────
  // A composite of all AXES (so a 4th dimension is included automatically), on 0–10.
  // Add your own formula here; it appears in the "Breadth" selector.
  const BREADTH = {
    geo:  { label: "Geometric mean", short: "geo. mean",
            descr: "geometric mean of (score + 1), minus 1: rewards strength on every axis",
            fn: (v) => Math.exp(v.reduce((s, x) => s + Math.log(x + 1), 0) / v.length) - 1 },
    min:  { label: "Weakest axis", short: "min",
            descr: "the lowest of the axis scores: breadth is only as good as the weakest skill",
            fn: (v) => Math.min(...v) },
    mean: { label: "Arithmetic mean", short: "mean",
            descr: "plain average of the axis scores: total ability, blind to lopsidedness",
            fn: (v) => v.reduce((s, x) => s + x, 0) / v.length }
  };
  const breadth = (d) => BREADTH[state.breadth].fn(axisKeys().map((k) => Number(d[k] ?? 0)));
  const fmtB = (x) => x.toFixed(1);
  function rankedRows(rows) {
    return rows.slice().sort((a, b) => breadth(b) - breadth(a) || total(b) - total(a) || a.name.localeCompare(b.name));
  }
  function rankOf(d) {
    const r = rankedRows(visibleData());
    const i = r.findIndex((x) => x._id === d._id);
    return i < 0 ? null : { rank: i + 1, of: r.length };
  }

  function visibleData() {
    const q = state.search.trim().toLowerCase();
    return state.data.filter((d) =>
      !state.hiddenFields.has(d.field) &&
      (state.yrMin == null || d.born >= state.yrMin) &&
      (state.yrMax == null || d.born <= state.yrMax) &&
      (!state.livingOnly || d.died == null));
  }
  function matches(d) {
    const q = state.search.trim().toLowerCase();
    return q && d.name.toLowerCase().includes(q);
  }
  function hoverText(d) {
    const scores = axisKeys().map((k) => `${AXES[k].short} <b>${d[k] ?? 0}</b>`).join(" · ");
    return `<b>${d.name}</b>  <span style="opacity:.7">${lifespan(d)}</span><br>${d.field}<br>${scores}`;
  }
  function labelFor(d) {
    if (d._id === state.selected || matches(d)) return d.name;
    if (state.labels === "all") return d.name;
    if (state.labels === "key" && d.star) return d.name;
    return "";
  }

  // ── Trace builders ──────────────────────────────────────────────────
  // dims: array of axis keys, e.g. ["math","exp","intuition"] for 3D or ["math","exp"] for 2D.
  function markerFor(field, rows, is3d, t) {
    const sym = FIELDS[field].symbol;
    const open = sym.endsWith("-open");
    const SIZE3D = { circle: 6, square: 5, diamond: 3.6, cross: 7, x: 3.6, "circle-open": 5, "diamond-open": 3.6, "square-open": 5 };
    const m = { symbol: sym, size: is3d ? (SIZE3D[sym] || 5) : 10 };
    if (state.colorBy === "born") {
      m.color = rows.map((d) => d.born);
      m.coloraxis = "coloraxis";
    } else {
      m.color = fieldColor(field);
    }
    if (is3d) {
      m.line = { width: open ? 2 : 0.5, color: t.surface };
      if (open) m.line.color = m.color;
    } else {
      m.line = open ? { width: 2, color: state.colorBy === "born" ? t.text2 : fieldColor(field) }
                    : { width: 1, color: t.surface };
    }
    return m;
  }

  function buildTraces(dims, sub, showLegend, t, pxPerUnit) {
    const is3d = dims.length === 3;
    const rows = visibleData();
    const traces = [];
    const suffix = sub > 1 ? String(sub) : "";
    const placement = is3d ? null : placeLabels(rows, dims, pxPerUnit);

    // Wall projections (3D only) — drawn first so they sit behind.
    if (is3d && state.shadows && rows.length) {
      const X = [], Y = [], Z = [];
      rows.forEach((d) => {
        const p = dims.map((k) => coord(d, k));
        X.push(WALL, p[0], p[0]); Y.push(p[1], WALL, p[1]); Z.push(p[2], p[2], WALL);
      });
      traces.push({
        type: "scatter3d", mode: "markers", x: X, y: Y, z: Z, hoverinfo: "skip", showlegend: false,
        marker: { size: 2.5, color: t.shadow, symbol: "circle" }, name: "projections", uid: "shadows"
      });
    }

    Object.keys(FIELDS).forEach((field) => {
      const fr = rows.filter((d) => d.field === field);
      const anyOfField = state.data.some((d) => d.field === field);
      if (!anyOfField) return;
      const tr = {
        type: is3d ? "scatter3d" : "scatter",
        mode: "markers+text",
        name: field,
        legendgroup: field,
        showlegend: showLegend && state.colorBy !== "born",
        uid: `${field}-${sub}`,
        customdata: fr.map((d) => d._id),
        hovertext: fr.map(hoverText),
        hovertemplate: "%{hovertext}<extra></extra>",
        text: fr.map(labelFor),
        textposition: is3d ? "top center" : fr.map((d) => (placement && placement.get(d._id)) || "top center"),
        textfont: { size: is3d ? 11 : 11, color: t.text2 },
        marker: markerFor(field, fr, is3d, t),
      };
      tr.x = fr.map((d) => coord(d, dims[0]));
      tr.y = fr.map((d) => coord(d, dims[1]));
      if (is3d) tr.z = fr.map((d) => coord(d, dims[2]));
      if (!fr.length) {
        // Plotly drops empty traces from the legend; a single null point keeps the
        // entry visible so a hidden/filtered field can be clicked back on.
        tr.x = [null]; tr.y = [null]; if (is3d) tr.z = [null];
        tr.text = [""]; tr.hovertext = [""]; tr.customdata = [null];
        if (Array.isArray(tr.marker.color)) tr.marker.color = [1900];
      }
      else { tr.xaxis = "x" + suffix; tr.yaxis = "y" + suffix; tr.cliponaxis = false; }
      traces.push(tr);
      // In birth-year mode the marker colours are an array, so the legend swatch would be
      // arbitrary; add a neutral legend-only proxy that shows the field's symbol instead.
      if (showLegend && state.colorBy === "born") {
        const proxy = { type: tr.type, mode: "markers", name: field, legendgroup: field, showlegend: true,
          uid: `proxy-${field}`, hoverinfo: "skip", x: [null], y: [null],
          marker: { symbol: FIELDS[field].symbol, size: 9, color: t.text2, line: { width: 1.5, color: t.text2 } } };
        if (is3d) proxy.z = [null]; else { proxy.xaxis = tr.xaxis; proxy.yaxis = tr.yaxis; }
        traces.push(proxy);
      }
    });

    // Highlight ring for the selection and search hits.
    const hi = rows.filter((d) => d._id === state.selected || matches(d));
    if (hi.length) {
      const h = {
        type: is3d ? "scatter3d" : "scatter", mode: "markers", showlegend: false, hoverinfo: "skip",
        uid: `hi-${sub}`, name: "highlight",
        marker: { symbol: "circle-open", size: is3d ? 14 : 22, color: t.text, line: { width: 2, color: t.text } }
      };
      h.x = hi.map((d) => coord(d, dims[0]));
      h.y = hi.map((d) => coord(d, dims[1]));
      if (is3d) h.z = hi.map((d) => coord(d, dims[2]));
      else { h.xaxis = "x" + suffix; h.yaxis = "y" + suffix; }
      traces.push(h);
    }
    return traces;
  }


  // Greedy label placement for 2D views: for each labelled point try eight anchor
  // positions and keep the one overlapping least with labels already placed and
  // with all markers. Works in data units using an estimate of pixels per unit.
  function placeLabels(rows, dims, pxPerUnit) {
    const ppu = pxPerUnit || 45;
    const cw = 6.2 / ppu, lh = 14 / ppu, r = 6 / ppu;
    const pts = rows.map((d) => ({ d, x: coord(d, dims[0]), y: coord(d, dims[1]) }));
    const obstacles = pts.map((p) => [p.x - r, p.x + r, p.y - r, p.y + r]);
    const placed = [];
    const out = new Map();
    const area = (a, b) => Math.max(0, Math.min(a[1], b[1]) - Math.max(a[0], b[0])) *
                           Math.max(0, Math.min(a[3], b[3]) - Math.max(a[2], b[2]));
    const lo = AXIS_RANGE[0] - 0.4, hi = AXIS_RANGE[1] + 0.4;
    const prio = (p) => (p.d._id === state.selected ? 0 : matches(p.d) ? 1 : p.d.star ? 2 : 3);
    pts.filter((p) => labelFor(p.d)).sort((a, b) => prio(a) - prio(b)).forEach((p) => {
      const w = p.d.name.length * cw, { x, y } = p;
      const cand = {
        "top center":    [x - w / 2, x + w / 2, y + r, y + r + lh],
        "bottom center": [x - w / 2, x + w / 2, y - r - lh, y - r],
        "middle right":  [x + r, x + r + w, y - lh / 2, y + lh / 2],
        "middle left":   [x - r - w, x - r, y - lh / 2, y + lh / 2],
        "top right":     [x + r * 0.5, x + r * 0.5 + w, y + r * 0.5, y + r * 0.5 + lh],
        "top left":      [x - r * 0.5 - w, x - r * 0.5, y + r * 0.5, y + r * 0.5 + lh],
        "bottom right":  [x + r * 0.5, x + r * 0.5 + w, y - r * 0.5 - lh, y - r * 0.5],
        "bottom left":   [x - r * 0.5 - w, x - r * 0.5, y - r * 0.5 - lh, y - r * 0.5]
      };
      let best = "top center", bestScore = Infinity;
      Object.entries(cand).forEach(([pos, b], i) => {
        let sc = i * 1e-4;
        placed.forEach((q) => { sc += 3 * area(b, q); });
        obstacles.forEach((q) => { sc += area(b, q); });
        if (b[0] < lo || b[1] > hi || b[2] < lo || b[3] > hi) sc += 5;
        if (sc < bestScore) { bestScore = sc; best = pos; }
      });
      placed.push(cand[best]);
      out.set(p.d._id, best);
    });
    return out;
  }

  // ── Layout builders ─────────────────────────────────────────────────
  function axis2d(key, t, extra) {
    return Object.assign({
      title: { text: AXES[key].label, font: { color: t.text2, size: 12 } },
      range: AXIS_RANGE, dtick: 2, tick0: 0, zeroline: false,
      gridcolor: t.grid, linecolor: t.axis, tickcolor: t.axis, tickfont: { color: t.text2 },
      showline: true, mirror: false, fixedrange: false
    }, extra || {});
  }
  function axis3d(key, t) {
    return {
      title: { text: AXES[key].label, font: { color: t.text2, size: 12 } },
      range: AXIS_RANGE, dtick: 2, tick0: 0, autorange: false,
      gridcolor: t.grid, zerolinecolor: t.axis, linecolor: t.axis, tickfont: { color: t.text2, size: 10 },
      showbackground: true, backgroundcolor: t.surface2, showspikes: false
    };
  }
  function baseLayout(t) {
    const L = {
      paper_bgcolor: t.surface, plot_bgcolor: t.surface,
      font: { family: 'system-ui, -apple-system, "Segoe UI", sans-serif', color: t.text },
      margin: { l: 60, r: 30, t: 50, b: 60 },
      hoverlabel: { bgcolor: t.surface, bordercolor: t.axis, font: { color: t.text, size: 12 }, align: "left" },
      legend: { orientation: "h", x: 0, y: 1.06, xanchor: "left", yanchor: "bottom",
        font: { color: t.text2 }, itemclick: "toggle", itemdoubleclick: "toggleothers", itemsizing: "constant" },
      uirevision: `${state.view}|${state.axes.x}|${state.axes.y}|${state.axes.z}`
    };
    if (state.colorBy === "born") {
      L.coloraxis = {
        cmin: 1500, cmax: 1980, colorscale: t.seq,
        colorbar: {
          title: { text: "Born", font: { color: t.text2 } }, thickness: 12, len: 0.6,
          tickvals: [1500, 1600, 1700, 1800, 1900, 1980], ticktext: ["≤1500", "1600", "1700", "1800", "1900", "1980"],
          tickfont: { color: t.text2 }, outlinewidth: 0
        }
      };
    }
    return L;
  }

  const VIEW_DEFS = () => {
    const a = state.axes;
    const s = (k) => AXES[k].short;
    return [
      { id: "3d", label: "3D" },
      { id: "xy", label: `${s(a.x)} × ${s(a.y)}`, dims: [a.x, a.y] },
      { id: "xz", label: `${s(a.x)} × ${s(a.z)}`, dims: [a.x, a.z] },
      { id: "yz", label: `${s(a.y)} × ${s(a.z)}`, dims: [a.y, a.z] },
      { id: "all", label: "All projections" },
      { id: "rank", label: "Breadth ranking" }
    ];
  };


  // ── Breadth ranking view ────────────────────────────────────────────
  const CMP_SYMBOLS = ["square-open", "triangle-up-open", "circle-open", "diamond-open", "x-thin-open", "cross-thin-open"];
  function buildRanking(t, L) {
    const rows = rankedRows(visibleData());
    const names = rows.map((d) => d.name);
    const rankIdx = new Map(rows.map((d, i) => [d._id, i + 1]));
    const B = BREADTH[state.breadth];
    const traces = [];
    const hov = (d) => `<b>#${rankIdx.get(d._id)} ${d.name}</b>  <span style="opacity:.7">${lifespan(d)}</span><br>` +
      `Breadth <b>${fmtB(breadth(d))}</b> (${B.short})<br>` +
      axisKeys().map((k) => `${AXES[k].short} ${d[k] ?? 0}`).join(" · ");

    Object.keys(FIELDS).forEach((field) => {
      if (!state.data.some((d) => d.field === field)) return;
      const fr = rows.filter((d) => d.field === field);
      const hiOf = (d) => d._id === state.selected || matches(d);
      const tr = {
        type: "bar", orientation: "h", name: field, legendgroup: field, uid: `bar-${field}`,
        showlegend: state.colorBy !== "born",
        y: fr.map((d) => d.name), x: fr.map(breadth),
        customdata: fr.map((d) => d._id), hovertext: fr.map(hov), hovertemplate: "%{hovertext}<extra></extra>",
        marker: {
          color: state.colorBy === "born" ? fr.map((d) => d.born) : fieldColor(field),
          line: { color: t.text, width: fr.map((d) => (hiOf(d) ? 2 : 0)) }
        },
        width: 0.72
      };
      if (state.colorBy === "born") tr.marker.coloraxis = "coloraxis";
      if (!fr.length) { tr.y = [null]; tr.x = [null]; tr.customdata = [null]; tr.hovertext = [""]; tr.marker.line.width = [0]; }
      traces.push(tr);
      if (state.colorBy === "born") {
        traces.push({ type: "scatter", mode: "markers", name: field, legendgroup: field, showlegend: true,
          uid: `proxy-${field}`, hoverinfo: "skip", x: [null], y: [null],
          marker: { symbol: FIELDS[field].symbol, size: 9, color: t.text2 } });
      }
    });

    // Individual axis scores as small markers on each row: shows *why* someone ranks where they do.
    axisKeys().forEach((k, i) => {
      traces.push({
        type: "scatter", mode: "markers", name: AXES[k].label, legendgroup: `cmp-${k}`, uid: `cmp-${k}`,
        y: rows.map((d) => d.name), x: rows.map((d) => Number(d[k] ?? 0)),
        customdata: rows.map((d) => d._id), hovertext: rows.map(hov), hovertemplate: "%{hovertext}<extra></extra>",
        marker: { symbol: CMP_SYMBOLS[i % CMP_SYMBOLS.length], size: 8, color: t.text, line: { width: 1.5, color: t.text } },
        opacity: 0.8
      });
    });

    const height = Math.max(420, rows.length * 19 + 170);
    L.barmode = "overlay";
    L.height = height;
    L.margin = { l: 10, r: 30 + (state.colorBy === "born" ? 90 : 0), t: 120, b: 50 };
    L.legend = Object.assign(L.legend, { y: 1 + 75 / (height - 170), yanchor: "bottom" });
    L.xaxis = {
      side: "top", range: [0, 10.4], dtick: 1, tick0: 0, gridcolor: t.grid, linecolor: t.axis,
      tickfont: { color: t.text2 }, zeroline: false, showline: true, fixedrange: true,
      title: { text: `Breadth score — ${B.label.toLowerCase()} of the ${axisKeys().length} axes (bars) · individual axis scores (markers)`,
               font: { color: t.text2, size: 12 }, standoff: 8 }
    };
    L.yaxis = {
      type: "category", categoryorder: "array", categoryarray: names,
      range: [Math.max(names.length, 1) - 0.5, -0.5], autorange: false,
      tickvals: names, ticktext: rows.map((d, i) => `${i + 1}. ${d.name}`),
      tickfont: { size: 11, color: t.text }, automargin: true, fixedrange: true, showgrid: false, ticks: ""
    };
    if (L.coloraxis) L.coloraxis.colorbar.len = Math.min(0.6, 500 / height), L.coloraxis.colorbar.y = 1, L.coloraxis.colorbar.yanchor = "top";
    return { traces, height };
  }

  // ── Render ──────────────────────────────────────────────────────────
  const plotEl = document.getElementById("plot");
  let wired = false;

  function render() {
    const t = theme();
    const a = state.axes;
    const L = baseLayout(t);
    let traces = [];
    let height = 720;
    document.querySelector("main").classList.toggle("wide", state.view === "all");
    const W = plotEl.clientWidth || 1000;
    const cbar = state.colorBy === "born" ? 90 : 0;

    if (state.view === "rank") {
      const r = buildRanking(t, L);
      traces = r.traces; height = r.height;
    } else if (state.view === "3d") {
      traces = buildTraces([a.x, a.y, a.z], 1, true, t);
      L.margin = { l: 0, r: cbar, t: 40, b: 0 };
      L.scene = {
        xaxis: axis3d(a.x, t), yaxis: axis3d(a.y, t), zaxis: axis3d(a.z, t),
        aspectmode: "cube", camera: { eye: { x: 1.6, y: 1.5, z: 0.85 }, center: { x: 0, y: 0, z: -0.12 } },
        bgcolor: t.surface
      };
    } else if (state.view === "all") {
      const pairs = [[a.x, a.y], [a.x, a.z], [a.y, a.z]];
      const wide = W >= 900;
      const side = wide ? (W - 90 - cbar) / 3 * 0.84 : Math.min(W - 90 - cbar, 560);
      height = wide ? Math.round(side + 130) : Math.round(3 * side + 300);
      const ppu = side / (AXIS_RANGE[1] - AXIS_RANGE[0]);
      pairs.forEach((p, i) => { traces = traces.concat(buildTraces(p, i + 1, i === 0, t, ppu)); });
      L.grid = wide ? { rows: 1, columns: 3, pattern: "independent", xgap: 0.16 }
                    : { rows: 3, columns: 1, pattern: "independent", ygap: 0.12 };
      pairs.forEach((p, i) => {
        const sfx = i === 0 ? "" : String(i + 1);
        L["xaxis" + sfx] = axis2d(p[0], t);
        L["yaxis" + sfx] = axis2d(p[1], t, { scaleanchor: "x" + sfx, scaleratio: 1, constrain: "domain" });
        L["xaxis" + sfx].constrain = "domain";
      });
      L.margin = { l: 60, r: 30 + cbar, t: 60, b: 60 };
    } else {
      const def = VIEW_DEFS().find((v) => v.id === state.view);
      const side = Math.min(W - 90 - cbar, height - 110);
      traces = buildTraces(def.dims, 1, true, t, side / (AXIS_RANGE[1] - AXIS_RANGE[0]));
      L.margin = { l: 60, r: 30 + cbar, t: 50, b: 60 };
      L.xaxis = axis2d(def.dims[0], t, { constrain: "domain" });
      L.yaxis = axis2d(def.dims[1], t, { scaleanchor: "x", scaleratio: 1, constrain: "domain" });
    }

    plotEl.style.height = height + "px";
    document.getElementById("plotCard").style.minHeight = height + "px";
    L.height = height;

    Plotly.react(plotEl, traces, L, {
      responsive: true, displaylogo: false,
      modeBarButtonsToRemove: ["select2d", "lasso2d", "autoScale2d"],
      toImageButtonOptions: { format: "png", filename: "three-axes-of-science", scale: 2 }
    });

    if (!wired) {
      wired = true;
      plotEl.on("plotly_click", (ev) => {
        const p = ev.points && ev.points[0];
        if (p && p.customdata != null) select(p.customdata);
      });
      plotEl.on("plotly_legendclick", (ev) => {
        const f = ev.data[ev.curveNumber].legendgroup;
        if (!f || !FIELDS[f]) return true;
        state.hiddenFields.has(f) ? state.hiddenFields.delete(f) : state.hiddenFields.add(f);
        update();
        return false;
      });
      plotEl.on("plotly_legenddoubleclick", (ev) => {
        const f = ev.data[ev.curveNumber].legendgroup;
        if (!f || !FIELDS[f]) return true;
        const all = Object.keys(FIELDS);
        const onlyThis = all.every((g) => g === f ? !state.hiddenFields.has(g) : state.hiddenFields.has(g));
        state.hiddenFields = onlyThis ? new Set() : new Set(all.filter((g) => g !== f));
        update();
        return false;
      });
    }
    // Dim legend items for hidden fields (we filter data ourselves, so keep entries clickable).
    requestAnimationFrame(styleLegend);
    renderViewSeg();
  }

  function styleLegend() {
    plotEl.querySelectorAll(".legend .traces").forEach((g) => {
      const name = g.querySelector(".legendtext")?.textContent;
      g.style.opacity = state.hiddenFields.has(name) ? 0.35 : 1;
    });
  }

  // ── Controls ────────────────────────────────────────────────────────
  function renderViewSeg() {
    const seg = document.getElementById("viewSeg");
    seg.innerHTML = "";
    VIEW_DEFS().forEach((v) => {
      const b = document.createElement("button");
      b.textContent = v.label;
      b.setAttribute("aria-pressed", String(state.view === v.id));
      b.onclick = () => { state.view = v.id; render(); };
      seg.appendChild(b);
    });
    const show = (id, on) => { document.getElementById(id).style.display = on ? "" : "none"; };
    const rank = state.view === "rank";
    document.getElementById("shadows").parentElement.style.display = state.view === "3d" ? "" : "none";
    show("jitterWrap", !rank); show("axesGroup", !rank); show("labelGroup", !rank);
  }

  function fillAxisSelects() {
    ["x", "y", "z"].forEach((l) => {
      const sel = document.getElementById("ax" + l.toUpperCase());
      sel.innerHTML = axisKeys().map((k) => `<option value="${k}">${AXES[k].short}</option>`).join("");
      sel.value = state.axes[l];
      sel.onchange = () => {
        const nk = sel.value;
        const other = ["x", "y", "z"].find((o) => o !== l && state.axes[o] === nk);
        if (other) state.axes[other] = state.axes[l];   // swap to keep three distinct dims
        state.axes[l] = nk;
        ["x", "y", "z"].forEach((o) => { document.getElementById("ax" + o.toUpperCase()).value = state.axes[o]; });
        render();
      };
    });
  }

  function wireToolbar() {
    const $ = (id) => document.getElementById(id);
    const years = state.data.map((d) => d.born);
    $("yrMin").placeholder = Math.min(...years);
    $("yrMax").placeholder = Math.max(...years);
    $("colorSel").onchange = (e) => { state.colorBy = e.target.value; render(); };
    $("breadthSel").innerHTML = Object.entries(BREADTH).map(([k, b]) => `<option value="${k}">${b.label}</option>`).join("");
    $("breadthSel").value = state.breadth;
    $("breadthSel").onchange = (e) => { state.breadth = e.target.value; update(); renderDetail(); describeBreadth(); };
    describeBreadth();
    $("labelSel").onchange = (e) => { state.labels = e.target.value; render(); };
    const yr = (v) => (v === "" ? null : Number(v));
    $("yrMin").oninput = (e) => { state.yrMin = yr(e.target.value); update(); };
    $("yrMax").oninput = (e) => { state.yrMax = yr(e.target.value); update(); };
    $("search").oninput = (e) => { state.search = e.target.value; update(); };
    $("search").onkeydown = (e) => {
      if (e.key !== "Enter") return;
      const hits = visibleData().filter(matches);
      if (hits.length) select(hits[0]._id);
    };
    $("jitter").onchange = (e) => { state.jitter = e.target.checked; render(); };
    $("shadows").onchange = (e) => { state.shadows = e.target.checked; render(); };
    $("living").onchange = (e) => { state.livingOnly = e.target.checked; update(); };
    $("themeBtn").onclick = () => {
      const dark = matchMedia("(prefers-color-scheme: dark)").matches;
      const cur = document.documentElement.dataset.theme || (dark ? "dark" : "light");
      document.documentElement.dataset.theme = cur === "dark" ? "light" : "dark";
      render(); renderDetail();
    };
    matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => render());
    let rt; window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => { if (state.view === "all") render(); }, 200); });

    // Add form
    $("addField").innerHTML = Object.keys(FIELDS).map((f) => `<option>${f}</option>`).join("");
    $("addForm").onsubmit = (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const d = { name: f.get("name").trim(), born: Number(f.get("born")),
        died: f.get("died") === "" ? null : Number(f.get("died")), field: f.get("field"), star: true, note: "" };
      axisKeys().forEach((k) => { d[k] = 5; });
      if (!d.name) return;
      d._id = nextId++;
      state.data.push(d);
      e.target.reset();
      save(); select(d._id);
      toast(`Added ${d.name}`);
    };

    // Data tools
    $("copyJson").onclick = async () => {
      const txt = exportJson();
      try { await navigator.clipboard.writeText(txt); toast("JSON copied"); }
      catch (err) {
        const ta = document.createElement("textarea"); ta.value = txt; document.body.appendChild(ta); ta.select();
        try { document.execCommand("copy"); toast("JSON copied"); } catch (e2) { toast("Copy was blocked"); }
        ta.remove();
      }
    };
    $("dlJson").onclick = () => download("scientists.json", exportJson(), "application/json");
    $("dlCsv").onclick = () => download("scientists.csv", exportCsv(), "text/csv");
    $("importBtn").onclick = () => $("importFile").click();
    $("importFile").onchange = async (e) => {
      const file = e.target.files[0]; if (!file) return;
      try {
        let arr = JSON.parse(await file.text());
        if (!Array.isArray(arr)) arr = arr.scientists;
        if (!Array.isArray(arr) || !arr.every((d) => d && d.name)) throw new Error("bad");
        state.data = withIds(arr); state.selected = null; ensureFields(); save(); refreshAll();
        toast(`Imported ${arr.length} entries`);
      } catch (err) { toast("Couldn't read that file — expected a JSON array of scientists"); }
      e.target.value = "";
    };
    $("resetBtn").onclick = () => {
      const b = $("resetBtn");
      if (b.dataset.armed) {
        delete b.dataset.armed; b.textContent = "Reset to defaults";
        state.data = withIds(clone(SCIENTISTS)); state.selected = null;
        try { localStorage.removeItem(STORE_KEY); } catch (e) {}
        refreshAll(); toast("Restored the default dataset");
      } else {
        b.dataset.armed = "1"; b.textContent = "Click again to confirm";
        setTimeout(() => { delete b.dataset.armed; b.textContent = "Reset to defaults"; }, 3000);
      }
    };
  }

  function describeBreadth() {
    const el = document.getElementById("breadthDescr");
    if (el) el.textContent = `Breadth = ${BREADTH[state.breadth].descr} (a formula on the axis scores, not a measure of scientific impact).`;
  }

  function exportJson() { return JSON.stringify(stripIds(state.data), null, 2); }
  function exportCsv() {
    const cols = ["name", "born", "died", "field", ...axisKeys(), "star", "note"];
    const esc = (v) => { const s = v == null ? "" : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const head = [...cols, `breadth_${state.breadth}`];
    return [head.join(","), ...state.data.map((d) => [...cols.map((c) => esc(d[c])), fmtB(breadth(d))].join(","))].join("\n");
  }
  function download(name, text, type) {
    try {
      const url = URL.createObjectURL(new Blob([text], { type }));
      const a = document.createElement("a"); a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast(`Saving ${name} — if nothing downloads here, use Copy JSON`);
    } catch (e) { toast("Downloads are blocked here — use Copy JSON"); }
  }

  let toastTimer;
  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg; el.classList.add("show");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
  }

  // ── Detail / editor ─────────────────────────────────────────────────
  function select(id) {
    state.selected = id;
    renderDetail(); render(); renderTable(true);
  }
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function renderDetail() {
    const box = document.getElementById("detail");
    const d = state.data.find((x) => x._id === state.selected);
    if (!d) {
      box.innerHTML = `<h2>Selected</h2><p class="empty">Click a point (or a table row) to see and edit its scores.</p>`;
      return;
    }
    const sw = state.colorBy === "field" ? `<span class="sw" style="background:${fieldColor(d.field)}"></span>` : "";
    box.innerHTML = `
      <h2>Selected</h2>
      <p class="who">${esc(d.name)}</p>
      <p class="meta">${sw}${esc(d.field)} · ${lifespan(d)}</p>
      <p class="note">${esc(d.note)}</p>
      <p class="meta" id="brd"></p>
      ${axisKeys().map((k) => `
        <div class="row"><label for="s-${k}">${AXES[k].short}</label>
          <input type="range" min="0" max="10" step="0.5" id="s-${k}" data-k="${k}" value="${d[k] ?? 0}">
          <output id="o-${k}">${d[k] ?? 0}</output></div>`).join("")}
      <details style="margin-top:8px"><summary style="padding:0;font-weight:500">Edit details</summary>
        <div class="form1">
          <label>Name <input type="text" data-f="name" value="${esc(d.name)}"></label>
          <div class="form2" style="margin:0">
            <label>Born <input type="number" data-f="born" value="${d.born}"></label>
            <label>Died <input type="number" data-f="died" value="${d.died ?? ""}" placeholder="living"></label>
          </div>
          <label>Field <select data-f="field">${Object.keys(FIELDS).map((f) => `<option ${f === d.field ? "selected" : ""}>${f}</option>`).join("")}</select></label>
          <label>Note <textarea rows="3" data-f="note">${esc(d.note)}</textarea></label>
          <label class="check" style="flex-direction:row"><input type="checkbox" data-f="star" ${d.star ? "checked" : ""}> Key figure (labelled by default)</label>
        </div>
      </details>
      <div class="btns">
        <button id="deselect">Close</button>
        <button id="delBtn" class="danger">Remove</button>
      </div>`;

    const brd = () => {
      const r = rankOf(d);
      box.querySelector("#brd").innerHTML = `Breadth <b>${fmtB(breadth(d))}</b> (${BREADTH[state.breadth].short})` +
        (r ? ` · rank ${r.rank} of ${r.of}` : "");
    };
    brd();
    let raf = 0;
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => { render(); renderTable(); save(); brd(); }); };
    box.querySelectorAll("input[type=range]").forEach((inp) => {
      inp.oninput = () => {
        d[inp.dataset.k] = Number(inp.value);
        box.querySelector(`#o-${inp.dataset.k}`).textContent = inp.value;
        schedule();
      };
    });
    box.querySelectorAll("[data-f]").forEach((inp) => {
      const ev = inp.tagName === "SELECT" || inp.type === "checkbox" ? "change" : "input";
      inp.addEventListener(ev, () => {
        const f = inp.dataset.f;
        if (f === "star") d.star = inp.checked;
        else if (f === "born") d.born = Number(inp.value);
        else if (f === "died") d.died = inp.value === "" ? null : Number(inp.value);
        else d[f] = inp.value;
        box.querySelector(".who").textContent = d.name;
        box.querySelector(".note").textContent = d.note;
        schedule();
      });
    });
    box.querySelector("#deselect").onclick = () => { state.selected = null; renderDetail(); render(); renderTable(); };
    box.querySelector("#delBtn").onclick = () => {
      state.data = state.data.filter((x) => x !== d); state.selected = null;
      save(); refreshAll(); toast(`Removed ${d.name}`);
    };
  }

  // ── Table ───────────────────────────────────────────────────────────
  function renderTable(scrollToSel) {
    const tbl = document.getElementById("tbl");
    const cols = [
      { k: "name", h: "Name" }, { k: "born", h: "Born", num: true }, { k: "died", h: "Died", num: true },
      { k: "field", h: "Field" },
      ...axisKeys().map((k) => ({ k, h: AXES[k].short, num: true })),
      { k: "_sum", h: "Σ", num: true },
      { k: "_breadth", h: "Breadth", num: true }
    ];
    const rows = visibleData().slice();
    const { key, dir } = state.sort;
    const val = (d) => key === "_sum" ? total(d) : key === "_breadth" ? breadth(d) : d[key];
    rows.sort((a, b) => {
      const va = val(a), vb = val(b);
      if (va == null && vb == null) return 0; if (va == null) return 1; if (vb == null) return -1;
      return (typeof va === "string" ? va.localeCompare(vb) : va - vb) * dir;
    });
    const arrow = (k) => state.sort.key === k ? (state.sort.dir > 0 ? " ▲" : " ▼") : "";
    tbl.innerHTML = `<thead><tr>${cols.map((c) => `<th data-k="${c.k}" class="${c.num ? "num" : ""}">${c.h}${arrow(c.k)}</th>`).join("")}</tr></thead>
      <tbody>${rows.map((d) => `<tr data-id="${d._id}" class="${d._id === state.selected ? "sel" : ""}">
        ${cols.map((c) => {
          if (c.k === "name") return `<td>${esc(d.name)}</td>`;
          if (c.k === "field") return `<td><span class="sw" style="background:${fieldColor(d.field)}"></span>${esc(d.field)}</td>`;
          if (c.k === "born" || c.k === "died") return `<td class="num">${fmtYear(d[c.k])}</td>`;
          if (c.k === "_sum") return `<td class="num">${total(d)}</td>`;
          if (c.k === "_breadth") return `<td class="num">${fmtB(breadth(d))}</td>`;
          return `<td class="num">${d[c.k] ?? 0}</td>`;
        }).join("")}</tr>`).join("")}</tbody>`;
    tbl.querySelectorAll("th").forEach((th) => th.onclick = () => {
      const k = th.dataset.k;
      state.sort = { key: k, dir: state.sort.key === k ? -state.sort.dir : (k === "name" || k === "field" || k === "born" || k === "died" ? 1 : -1) };
      renderTable();
    });
    tbl.querySelectorAll("tbody tr").forEach((tr) => tr.onclick = () => select(Number(tr.dataset.id)));
    if (scrollToSel) tbl.querySelector("tr.sel")?.scrollIntoView({ block: "nearest" });
  }

  // ── Glue ────────────────────────────────────────────────────────────
  function update() { render(); renderTable(); }
  function refreshAll() {
    ensureFields();
    document.getElementById("addField").innerHTML = Object.keys(FIELDS).map((f) => `<option>${f}</option>`).join("");
    renderDetail(); update();
  }

  state.data = loadData();
  ensureFields();
  fillAxisSelects();
  wireToolbar();
  refreshAll();
})();
