// Tiny box-and-arrow renderer: data in, inline SVG out (no dependencies, renders the same in every browser).
// node: { id, x, y, w, h, title, sub: [lines], kind, group: true (container), href }
// edge: { from, to, fs: 'r'|'l'|'t'|'b', ts: ..., label, dash, kind, via: [[x,y]...] (optional bend points), lx, ly }
const NS = 'http://www.w3.org/2000/svg';
const el = (n, a = {}, parent) => {
  const e = document.createElementNS(NS, n);
  for (const k in a) e.setAttribute(k, a[k]);
  if (parent) parent.appendChild(e);
  return e;
};

function side(n, s, t = 0.5) {
  switch (s) {
    case 'l': return [n.x, n.y + n.h * t];
    case 't': return [n.x + n.w * t, n.y];
    case 'b': return [n.x + n.w * t, n.y + n.h];
    default: return [n.x + n.w, n.y + n.h * t];
  }
}

export function drawDiagram(host, { width, height, nodes, edges, title }) {
  const svg = el('svg', { viewBox: `0 0 ${width} ${height}`, role: 'img', class: 'dg' });
  if (title) el('title', {}, svg).textContent = title;
  const defs = el('defs', {}, svg);
  const mk = el('marker', { id: 'ah', viewBox: '0 0 10 10', refX: 9, refY: 5, markerWidth: 7, markerHeight: 7, orient: 'auto-start-reverse' }, defs);
  el('path', { d: 'M0,0 L10,5 L0,10 z', class: 'dg-ah' }, mk);
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));

  const gGroups = el('g', {}, svg), gEdges = el('g', {}, svg), gNodes = el('g', {}, svg), gTitles = el('g', {}, svg), gLabels = el('g', {}, svg);
  for (const n of nodes.filter((n) => n.group)) {
    el('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: 6, class: `dg-group ${n.kind || ''}` }, gGroups);
    const t = el('text', { x: n.x + 12, y: n.y + 20, class: 'dg-gt' }, gTitles); t.textContent = n.title;
    if (n.sub) n.sub.forEach((s, i) => { const u = el('text', { x: n.x + 12, y: n.y + 36 + i * 14, class: 'dg-gs' }, gTitles); u.textContent = s; });
  }
  for (const e of edges) {
    const a = byId[e.from], b = byId[e.to];
    const p0 = side(a, e.fs || 'r', e.ft ?? 0.5), p1 = side(b, e.ts || 'l', e.tt ?? 0.5);
    let pts;
    if (e.via) pts = [p0, ...e.via, p1];
    else if ((e.fs || 'r') === 'r' && (e.ts || 'l') === 'l') { const mx = e.mx ?? (p0[0] + p1[0]) / 2; pts = [p0, [mx, p0[1]], [mx, p1[1]], p1]; }
    else if ((e.fs === 'b' || e.fs === 't') && (e.ts === 't' || e.ts === 'b')) { const my = e.my ?? (p0[1] + p1[1]) / 2; pts = [p0, [p0[0], my], [p1[0], my], p1]; }
    else if (e.fs === 'b' || e.fs === 't') pts = [p0, [p0[0], p1[1]], p1];
    else pts = [p0, [p1[0], p0[1]], p1];
    const d = pts.map((p, i) => (i ? 'L' : 'M') + p[0] + ',' + p[1]).join(' ');
    el('path', { d, class: `dg-e ${e.kind || ''} ${e.dash ? 'dash' : ''}`, 'marker-end': e.both === false ? '' : 'url(#ah)', 'marker-start': e.both ? 'url(#ah)' : '' }, gEdges);
    if (e.label) {
      const m = pts[Math.floor((pts.length - 1) / 2)], n2 = pts[Math.floor((pts.length - 1) / 2) + 1];
      const lx = e.lx ?? (m[0] + n2[0]) / 2, ly = e.ly ?? (m[1] + n2[1]) / 2 - 5;
      const lines = [].concat(e.label);
      lines.forEach((s, i) => {
        const t = el('text', { x: lx, y: ly + i * 12, class: 'dg-el', 'text-anchor': e.anchor || 'middle' }, gLabels);
        t.textContent = s;
      });
    }
  }
  for (const n of nodes.filter((n) => !n.group)) {
    const g = el('g', { class: `dg-n ${n.kind || ''}` }, gNodes);
    const wrap = n.href ? el('a', { href: n.href, target: '_blank', rel: 'noopener' }, g) : g;
    el('rect', { x: n.x, y: n.y, width: n.w, height: n.h, rx: 4 }, wrap);
    el('rect', { x: n.x, y: n.y, width: 5, height: n.h, rx: 1, class: 'dg-tab' }, wrap);
    const t = el('text', { x: n.x + 13, y: n.y + 19, class: 'dg-t' }, wrap); t.textContent = n.title;
    (n.sub || []).forEach((s, i) => { const u = el('text', { x: n.x + 13, y: n.y + 35 + i * 13.5, class: 'dg-s' }, wrap); u.textContent = s; });
  }
  host.appendChild(svg);
  return svg;
}
