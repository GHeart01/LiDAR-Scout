// Renders the FSM as an SVG state diagram and highlights the active state.
const NS = "http://www.w3.org/2000/svg";

function el(name, attrs = {}) {
  const e = document.createElementNS(NS, name);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  return e;
}

export class FSMDiagram {
  constructor(container, fsm) {
    this.fsm = fsm;
    this.W = 360;
    this.H = 210;
    this.r = 28;
    this.pos = {
      IDLE: { x: 56, y: 105 },
      SCAN: { x: 180, y: 46 },
      DRIVE: { x: 304, y: 105 },
      AVOID: { x: 180, y: 164 },
    };
    this._build(container);
    fsm.onChange(() => this.update());
    this.update();
  }

  _build(container) {
    const svg = el("svg", { viewBox: `0 0 ${this.W} ${this.H}` });
    svg.classList.add("fsm-svg");

    // Arrowhead marker
    const defs = el("defs");
    const marker = el("marker", {
      id: "arrow",
      viewBox: "0 0 10 10",
      refX: "9",
      refY: "5",
      markerWidth: "7",
      markerHeight: "7",
      orient: "auto-start-reverse",
    });
    marker.appendChild(el("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#3a4d73" }));
    defs.appendChild(marker);
    svg.appendChild(defs);

    // Edges (curved, so opposite-direction pairs don't overlap)
    for (const t of this.fsm.transitions) svg.appendChild(this._edge(t));

    // Nodes
    this.nodeEls = {};
    for (const s of this.fsm.states) {
      const g = this._node(s);
      svg.appendChild(g);
      this.nodeEls[s] = g;
    }

    container.appendChild(svg);
  }

  _edge(t) {
    const a = this.pos[t.from];
    const b = this.pos[t.to];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const curve = 24;
    const cx = (a.x + b.x) / 2 + nx * curve;
    const cy = (a.y + b.y) / 2 + ny * curve;
    const start = this._trim(a, cx, cy);
    const end = this._trim(b, cx, cy);

    const g = el("g");
    g.classList.add("fsm-edge");
    g.appendChild(
      el("path", {
        d: `M ${start.x} ${start.y} Q ${cx} ${cy} ${end.x} ${end.y}`,
        "marker-end": "url(#arrow)",
      })
    );
    const label = el("text", { x: cx, y: cy });
    label.classList.add("fsm-edge-label");
    label.textContent = t.label;
    g.appendChild(label);
    return g;
  }

  // Move a point from a node center toward (tx,ty) by the node radius.
  _trim(node, tx, ty) {
    const dx = tx - node.x;
    const dy = ty - node.y;
    const l = Math.hypot(dx, dy) || 1;
    return { x: node.x + (dx / l) * this.r, y: node.y + (dy / l) * this.r };
  }

  _node(s) {
    const p = this.pos[s];
    const g = el("g");
    g.classList.add("fsm-node");
    g.appendChild(el("circle", { cx: p.x, cy: p.y, r: this.r }));
    const text = el("text", { x: p.x, y: p.y });
    text.textContent = s;
    g.appendChild(text);
    return g;
  }

  update() {
    for (const s of this.fsm.states) {
      this.nodeEls[s].classList.toggle("active", s === this.fsm.state);
    }
  }
}
