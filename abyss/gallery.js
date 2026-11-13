// The exhibition: the portfolio's content hangs on the walls of a 3D world and scrolling walks you through it.
// WebGL draws the architecture; the wall pieces are real DOM placed in the same 3D space (CSS3DRenderer),
// so text stays sharp and links work.
import * as THREE from "../vendor/three-kit.min.js";
import { PROJECTS, FEATURED, WORK, SKILLS } from "./data.js";

const { CSS3DRenderer, CSS3DObject, EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass } = THREE;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a || 1), 0, 1); return t * t * (3 - 2 * t); };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad = (n) => String(n).padStart(2, "0");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const narrowMq = matchMedia("(max-aspect-ratio: 4/5)");
const lite = matchMedia("(pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;
const S = 0.004; // one CSS pixel on a wall piece, in metres

/* =====================================================================
   Content
   ===================================================================== */
const JOBS = [
  { when: "2025 to Jun 2026", role: "Technical Lead", org: "Josys Digital Technologies", pts: [
    "Promoted to Technical Lead after two consecutive years rated top performer. Selected for Architect in 2026.",
    "Led and mentored a team of 4 engineers through design reviews, pairing and code review.",
    "Coordinated delivery across 3 product teams as the backend architecture owner, setting the interface contracts between services.",
    "Built MCP clients and servers that cut integration time for new services from 2 weeks to 2 days.",
    "Shipped an internal LLM platform for context-aware retrieval that saved the team 8 hours a week, with 60% less manual querying.",
    "Designed an analytics stack, Airbyte → DuckDB → Apache Airflow: about 70% faster queries above 50M rows, 45% lower infrastructure cost, and reports down from 25 minutes to under 2.",
    "Owned code review and engineering standards across every project in the company, and ran technical interviews and onboarding for new backend hires.",
  ] },
  { when: "2022 to Mar 2025", role: "Senior Software Engineer", org: "Josys Digital Technologies", pts: [
    "Championed NestJS as the company-wide backend standard across 12+ microservices, cutting new-engineer onboarding from 6 weeks to 3.",
    "Built a notification platform handling 50,000 messages a day, consolidating 8 flows into one across email, Slack and Teams.",
    "Built a browser extension serving over 2 million users from a single codebase across Chromium and Firefox, Manifest V2 and V3, with silent activation for enterprise deployment.",
    "Built a simulation framework covering 300+ integrated SaaS providers. It cut testing infrastructure cost 35%, never needed a bug fix, and became the customer-facing production sandbox.",
    "Led the security project and team, building a Go service that orchestrates Semgrep, Gitleaks and Trivy across the GitHub repository estate.",
    "Built a multi-database GraphQL platform with automatic schema generation and dynamic filter conversion.",
    "Rated top performer two years running.",
  ] },
  { when: "2019 to Aug 2022", role: "Member of Technical Staff (MTS-1)", org: "InstaSafe, Bengaluru", pts: [
    "Designed and built a Zero Trust Network Access (ZTNA) solution from scratch, part of a new product line that brought in 10+ enterprise customers.",
    "Built a gateway server for agentless access to private web apps, cutting enterprise customer onboarding time 40%.",
    "Led 3 engineers delivering 6 security product enhancements, each from design through production.",
    "Built a cross-platform desktop client for secure access to private resources.",
  ] },
  { when: "2018 to May 2019", role: "Earlier experience", org: "GrowthEnabler · Haappy, Bengaluru", pts: [
    "GrowthEnabler, Aug 2018 to May 2019: built a full-stack SRM workflow platform and a startup-to-corporate matching system.",
    "Haappy, Jan to Aug 2018: built WebTV websites and an internal CRM for task and workflow tracking.",
  ] },
  { when: "2013 to 2017", role: "B.E. Computer Science & Engineering", org: "East Point College of Engineering, Bengaluru", pts: [] },
];

const byName = (n) => PROJECTS.find((p) => p.name === n);
const featured = FEATURED.map(byName).filter(Boolean);
const shelf = PROJECTS.filter((p) => !featured.includes(p)).sort((a, b) => (a.priv ? 1 : 0) - (b.priv ? 1 : 0));
const ext = (h) => (/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : "");
const links = (p) => [
  p.site && `<a class="go" href="${esc(p.site.href)}"${ext(p.site.href)}>${esc(p.site.label)} →</a>`,
  p.link && `<a href="${esc(p.link.href)}"${ext(p.link.href)}>${esc(p.link.label)}</a>`,
  p.docs && `<a href="${esc(p.docs.href)}">${esc(p.docs.label)}</a>`,
  p.repo && `<a href="${esc(p.repo)}" target="_blank" rel="noopener">Source ↗</a>`,
].filter(Boolean).join("");
const status = (p) => (p.priv ? (p.soon ? "Private · open source soon" : "Private") : "Open source");
const picture = (p, cls = "") => `<figure class="frame ${cls}" data-shots='${esc(JSON.stringify(p.shots))}'><div class="mat"><img src="${esc(p.shots[0])}" alt="${esc(p.name)} screenshot" loading="lazy" decoding="async"${p.fit ? ' class="fit"' : ""}></div>${p.shots.length > 1 ? `<figcaption><b>1</b> / ${p.shots.length} · click for the next view</figcaption>` : ""}</figure>`;

const H = {
  hero: () => `<p class="k" data-r>A retrospective · 2018 to 2026</p>
    <h1><span>Aby Saji</span> <span>Pappachan</span></h1>
    <p class="sub" data-r>Technical Lead. Backend, platform and AI engineering.<br>Walsall, United Kingdom.</p>`,
  bio: () => `<p class="k" data-r>Room 1 · About</p>
    <h2 data-r>Eight years of owning products <em>end to end.</em></h2>
    <div class="cols"><p class="lead" data-r>My whole career, 8 years across four startups, has been owning products end to end: a Zero Trust security product built from nothing to 10+ enterprise customers, a company-wide reporting platform, and production LLM and MCP infrastructure.</p>
    <div data-r><p>I'm the person people bring <q>could we actually do this?</q> to, before anyone spends money finding out. At every company I've worked at, product managers, architects and sales brought me ideas to assess, and my proofs of concept repeatedly became the base implementation months later.</p>
    <p>I work mostly in TypeScript and Node.js, with Go and Python where they fit, across NestJS services, event-driven systems on AWS, and MCP and LLM platforms. I like pairing leadership with hands-on work: mentoring a team, setting the review standards, and building things that scale and keep working.</p>
    <p class="tag">UK right to work · no sponsorship required · available now</p></div></div>`,
  stats: () => `<p class="k" data-r>By the numbers</p><ul class="nums">
    ${[["8", " yrs", "backend, platform and AI engineering"], ["2", "M+", "users of a browser extension I built"], ["50", "k", "messages a day through my notification platform"], ["45", "%", "lower infrastructure cost from my analytics stack"], ["300", "+", "SaaS providers in my simulation framework"]]
      .map(([n, s, t]) => `<li data-r><b data-count="${n}" data-suffix="${s}">${n}${s}</b><span>${t}</span></li>`).join("")}</ul>`,
  job: (j, i) => `<p class="k" data-r>${esc(j.when)}</p><h2 data-r>${esc(j.role)}</h2><p class="org" data-r>${esc(j.org)}</p>
    ${j.pts.length ? `<ul class="pts">${j.pts.map((p) => `<li data-r>${esc(p)}</li>`).join("")}</ul>` : ""}`,
  art: (p, i) => `${picture(p)}<div class="label">
    <p class="k" data-r>${pad(i + 1)} / ${pad(featured.length)} · ${status(p)}</p><h3 data-r>${esc(p.name)}</h3><p class="org" data-r>${esc(p.meta)}</p>
    <p class="desc" data-r>${esc(p.desc)}</p><p class="medium" data-r>${p.tech.map(esc).join(", ")}</p><div class="acts" data-r>${links(p)}</div></div>`,
  pair: (ps) => ps.map((p) => `<div class="small">${picture(p, "sm")}<div class="label"><p class="k" data-r>${status(p)}</p><h3 data-r>${esc(p.name)}</h3><p class="org" data-r>${esc(p.meta)}</p>
    <p class="desc" data-r>${esc(p.desc)}</p><div class="acts" data-r>${links(p)}</div></div></div>`).join(""),
  trio: (ws, from) => ws.map((w, k) => `<div class="sys" data-r><p class="k">${pad(from + k + 1)} · ${esc(w.org)} · ${esc(w.meta)}</p><h3>${esc(w.name)}</h3><p class="desc">${esc(w.desc)}</p><p class="medium">${w.tech.map(esc).join(", ")}</p></div>`).join(""),
  skills: () => `<p class="k" data-r>Rooftop · Toolkit</p><h2 data-r>The toolkit, <em>all connected.</em></h2><div class="kit">${SKILLS.map(([n, items]) => `<div data-r><h4>${esc(n)}</h4><p>${items.map(esc).join(" · ")}</p></div>`).join("")}</div>`,
  contact: () => `<p class="k" data-r>The way out is a conversation</p><h2 data-r>Let's build something <em>worth shipping.</em></h2>
    <p class="lead" data-r>Available immediately. Open to senior Backend, Platform and AI roles across the West Midlands, or remote in the UK.</p>
    <a class="mail" data-r href="mailto:abyrocksaji@gmail.com">abyrocksaji@gmail.com</a>
    <ul class="reach" data-r><li><span>Phone</span><a href="tel:+447435067875">+44 7435 067875</a></li><li><span>LinkedIn</span><a href="https://www.linkedin.com/in/aby-saji/" target="_blank" rel="noopener">linkedin.com/in/aby-saji ↗</a></li>
    <li><span>GitHub</span><a href="https://github.com/AbyAbyss" target="_blank" rel="noopener">github.com/AbyAbyss ↗</a></li><li><span>CV</span><a href="Aby_Saji_Pappachan_Technical_Lead.pdf" download>Download the PDF ↓</a></li></ul>`,
};

/* =====================================================================
   The plan: every wall piece, where it hangs, and which way it faces.
   x: right, y: up, z: toward the viewer. Faces: the direction the piece looks out from its wall.
   ===================================================================== */
const FACE = { "+z": 0, "-z": Math.PI, "+x": Math.PI / 2, "-x": -Math.PI / 2 };
const NORMAL = { "+z": [0, 0, 1], "-z": [0, 0, -1], "+x": [1, 0, 0], "-x": [-1, 0, 0] };
const Y = 2.15, C = 12, R = 18.3; // hanging height, tower floor, roof

const PIECES = [
  { id: "hero", room: "out", cls: "hero", html: H.hero(), at: [0, 6.1, 0.2], face: "+z", scale: 0.0115, section: "Entrance", title: "The building", eye: 1.7 },
  { id: "s-about", room: "A1", cls: "sign", html: `<span>02</span> Experience<i>→</i>`, at: [0, 4.75, -15.82], face: "+z", scale: 0.008, stop: false },
  { id: "bio", room: "A1", cls: "text", html: H.bio(), at: [-6.82, Y, -8], face: "+x", section: "About", title: "About" },
  { id: "stats", room: "A1", cls: "stats", html: H.stats(), at: [6.82, Y, -8], face: "-x", title: "By the numbers" },
  { id: "quote", room: "A2", cls: "quote", html: `<p>Every company I have worked for has <em>asked me to come back.</em></p>`, at: [0, 3, -45.82], face: "+z", scale: 0.0075, stop: false },
  ...JOBS.map((j, i) => ({ id: "job" + i, room: "A2", cls: "text job", html: H.job(j, i), at: i < 3 ? [-6.82, Y, -22.5 - i * 8.5] : [6.82, Y, -40 + (i - 3) * 7.5], face: i < 3 ? "+x" : "-x", section: i ? null : "Experience", title: j.role })),
  { id: "s-work", room: "B", cls: "sign big", html: `Things I've built <em>after hours.</em>`, at: [67.82, 3.1, -22], face: "-x", scale: 0.011, stop: false },
  ...featured.map((p, i) => ({ id: "art" + i, room: "B", cls: "art", html: H.art(p, i), at: i < 4 ? [27 + i * 10, Y, -28.82] : [57 - (i - 4) * 10, Y, -15.18], face: i < 4 ? "+z" : "-z", section: i ? null : "Projects", title: p.name })),
  ...[0, 1, 2, 3].map((i) => ({ id: "pair" + i, room: "C", cls: "pair", html: H.pair(shelf.slice(i * 2, i * 2 + 2)), at: [26.6 + i * 6.3, C + Y, 23.82], face: "-z", section: i ? null : "More projects", title: shelf.slice(i * 2, i * 2 + 2).map((p) => p.name).join(" & ") })),
  { id: "s-pro", room: "C", cls: "sign big", html: `Platforms <em>&amp;</em> systems.`, at: [47.82, C + 3, 17], face: "-x", scale: 0.0085, stop: false },
  ...[0, 1, 2].map((i) => ({ id: "trio" + i, room: "C", cls: "trio", html: H.trio(WORK.slice(i * 3, i * 3 + 3), i * 3), at: [44 - i * 6.6, C + Y, 10.18], face: "+z", section: i ? null : "Professional work", title: WORK.slice(i * 3, i * 3 + 3).map((w) => w.name).join(", ") })),
  { id: "skills", room: "roof", cls: "text skills", html: H.skills(), at: [40.8, R + Y + 0.1, 17], face: "-x", section: "Skills", title: "The toolkit" },
  { id: "contact", room: "roof", cls: "text contact", html: H.contact(), at: [31, R + Y + 0.1, 22.4], face: "-z", section: "Contact", title: "Say hello" },
];

/* =====================================================================
   Renderers
   ===================================================================== */
const root = document.documentElement;
const glCanvas = $("#gl");
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas: glCanvas, antialias: !lite, powerPreference: "high-performance" });
} catch (e) { renderer = null; }

if (!renderer) flatFallback(); else start();

/* No WebGL: lay the wall pieces out as an ordinary page. */
function flatFallback() {
  root.classList.add("flat", "ready");
  const main = document.createElement("main"); main.className = "flatlist";
  PIECES.forEach((p) => { const el = document.createElement("section"); el.className = "pn seen " + p.cls; el.innerHTML = p.html; main.appendChild(el); });
  document.body.appendChild(main); $("#boot").classList.add("done"); wireFrames();
}

function wireFrames() {
  $$(".frame").forEach((f) => {
    const shots = JSON.parse(f.dataset.shots), im = $("img", f), n = $("figcaption b", f); let cur = 0, busy = false;
    if (shots.length < 2) return;
    f.addEventListener("click", () => {
      if (busy) return; busy = true; cur = (cur + 1) % shots.length; im.classList.add("out");
      setTimeout(() => { const done = () => { im.classList.remove("out"); busy = false; im.onload = im.onerror = null; }; im.onload = im.onerror = done; im.src = shots[cur]; if (im.complete) done(); }, 220);
      if (n) n.textContent = cur + 1;
    });
  });
}

function start() {
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, lite ? 1.25 : 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  const css = new CSS3DRenderer({ element: $("#walls") });
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x070a12, 0.011); scene.background = new THREE.Color(0x070a12);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 900);
  scene.add(camera);
  const G = { uTime: { value: 0 } };

  /* ---------- materials ---------- */
  const M = {
    wall: new THREE.MeshStandardMaterial({ color: 0x2a2d34, roughness: 0.92 }),
    ext: new THREE.MeshStandardMaterial({ color: 0x191b21, roughness: 0.8 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x14161a, roughness: 0.32, metalness: 0.35 }),
    ceil: new THREE.MeshStandardMaterial({ color: 0x17191e, roughness: 1 }),
    strip: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.4, 2.1, 1.7) }),
    accent: new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.95, 0.3) }),
    cool: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.5, 1.7, 2.2) }),
  };
  const T = 0.3;
  const box = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); scene.add(m); return m; };
  // an axis-aligned wall with openings. axis "x": runs along x at z = c. axis "z": runs along z at x = c.
  function wall(axis, c, a, b, y0, h, gaps = [], mat = M.wall) {
    const seg = (p, q, yy, hh) => { if (q - p < 0.02 || hh < 0.02) return; axis === "x" ? box(q - p, hh, T, (p + q) / 2, yy + hh / 2, c, mat) : box(T, hh, q - p, c, yy + hh / 2, (p + q) / 2, mat); };
    let cur = a;
    for (const g of [...gaps].sort((m, n) => m.from - n.from)) {
      seg(cur, g.from, y0, h); if (g.sill) seg(g.from, g.to, y0, g.sill); if (g.top < h) seg(g.from, g.to, y0 + g.top, h - g.top); cur = g.to;
      // a lit reveal around each opening
      const mid = (g.from + g.to) / 2, len = g.to - g.from, yy = y0 + g.top;
      axis === "x" ? box(len, 0.05, T + 0.04, mid, yy, c, M.accent) : box(T + 0.04, 0.05, len, c, yy, mid, M.accent);
    }
    seg(cur, b, y0, h);
  }
  const slab = (x1, x2, z1, z2, y, th, mat) => box(x2 - x1, th, z2 - z1, (x1 + x2) / 2, y + th / 2, (z1 + z2) / 2, mat);

  /* ---------- building A: About, then the Experience hall ---------- */
  wall("x", 0, -7, 7, 0, 9, [{ from: -1.7, to: 1.7, top: 3.5 }], M.ext);
  wall("x", -46, -7, 7, 0, 6);
  wall("z", -7, -46, 0, 0, 6);
  wall("z", 7, -46, 0, 0, 6, [{ from: -24.1, to: -20.9, top: 3.3 }]);
  wall("x", -16, -7, 7, 0, 6, [{ from: -1.9, to: 1.9, top: 3.7 }]);
  slab(-7, 7, -46, 0, -0.2, 0.2, M.floor); slab(-7.15, 7.15, -46.15, 0.15, 6, 0.3, M.ceil);
  for (let z = -3; z > -45; z -= 6) box(0.14, 0.05, 3.2, 0, 5.97, z, M.strip);       // ceiling lights down the spine
  box(0.05, 0.05, 46, -6.83, 0.03, -23, M.accent); box(0.05, 0.05, 46, 6.83, 0.03, -23, M.accent);

  /* ---------- the walk across ---------- */
  slab(7.2, 20, -24.1, -20.9, 0.0, 0.04, M.floor);
  box(12.8, 0.04, 0.06, 13.6, 0.06, -24.1, M.cool); box(12.8, 0.04, 0.06, 13.6, 0.06, -20.9, M.cool);

  /* ---------- building B: the projects hall ---------- */
  wall("z", 20, -29, -15, 0, 6, [{ from: -24.1, to: -20.9, top: 3.3 }], M.wall);
  wall("z", 68, -29, -15, 0, 6);
  wall("x", -29, 20, 68, 0, 6);
  wall("x", -15, 20, 68, 0, 6, [{ from: 20.9, to: 24.5, sill: 0.45, top: 4.2 }]);
  slab(20, 68, -29, -15, -0.2, 0.2, M.floor); slab(19.85, 68.15, -29.15, -14.85, 6, 0.3, M.ceil);
  for (let x = 24; x < 67; x += 6) box(3.2, 0.05, 0.14, x, 5.97, -22, M.strip);
  box(48, 0.05, 0.05, 44, 0.03, -28.83, M.cool); box(48, 0.05, 0.05, 44, 0.03, -15.17, M.cool);

  /* ---------- the tower: more projects and professional work on its top floor, then the roof ---------- */
  const towerMat = new THREE.ShaderMaterial({
    uniforms: { uTime: G.uTime },
    vertexShader: `varying vec3 vP; varying vec3 vN; varying float vD;
      void main(){ vec4 p = vec4(position, 1.);
        #ifdef USE_INSTANCING
          p = instanceMatrix * p;
        #endif
        vP = p.xyz; vN = normal; vec4 mv = modelViewMatrix * p; vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `varying vec3 vP; varying vec3 vN; varying float vD; uniform float uTime;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec2 uv = abs(vN.x) > .5 ? vP.zy : vP.xy; vec2 g = uv * vec2(.55, .34); vec2 id = floor(g), f = fract(g);
        float lit = step(.7, h(id)) * step(.2, f.x) * step(f.x, .8) * step(.3, f.y) * step(f.y, .72) * step(abs(vN.y), .5);
        vec3 c = vec3(.03, .034, .046) + mix(vec3(1., .7, .38), vec3(.6, .8, 1.), step(.8, h(id + 3.))) * lit * (.35 + .65 * h(id + 7.)) * .9;
        gl_FragColor = vec4(mix(c, vec3(.027, .039, .07), 1. - exp(-vD * vD * .000018)), 1.); }`,
  });
  box(28, 12, 14, 34, 6, 17, towerMat);
  wall("x", 10, 20, 48, C, 6, [{ from: 20.5, to: 24.3, top: 4.4 }], M.wall);
  wall("x", 24, 20, 48, C, 6); wall("z", 20, 10, 24, C, 6); wall("z", 48, 10, 24, C, 6);
  slab(20, 48, 10, 24, C - 0.05, 0.1, M.floor);
  slab(19.85, 25, 9.85, 24.15, C + 6, 0.3, M.ceil); slab(29, 48.15, 9.85, 24.15, C + 6, 0.3, M.ceil); // the skylight is the gap
  slab(25, 29, 9.85, 15, C + 6, 0.3, M.ceil); slab(25, 29, 19, 24.15, C + 6, 0.3, M.ceil);
  [[25, 15, 4, 0.06], [25, 19, 4, 0.06]].forEach(([x, z, l]) => box(l, 0.06, 0.06, x + l / 2, C + 6, z, M.accent));
  for (let x = 31.5; x < 47; x += 5.5) box(3, 0.05, 0.14, x, C + 5.97, 17, M.strip);
  box(28, 0.05, 0.05, 34, C + 0.08, 23.83, M.accent); box(28, 0.05, 0.05, 34, C + 0.08, 10.17, M.accent);
  // roof: a low parapet, a billboard for the toolkit, a monolith for the last word
  [[20, 48, 10], [20, 48, 24]].forEach(([a, b, z]) => box(b - a, 0.7, 0.2, (a + b) / 2, R + 0.35, z, M.ext));
  [[20], [48]].forEach(([x]) => box(0.2, 0.7, 14, x, R + 0.35, 17, M.ext));
  box(0.3, 4.6, 7, 41, R + 2.5, 17, M.wall); box(0.34, 0.05, 7.04, 41, R + 4.82, 17, M.strip);
  box(7.4, 4.9, 0.3, 31, R + 2.6, 22.6, M.wall); box(7.44, 0.05, 0.34, 31, R + 5.07, 22.6, M.accent);

  /* ---------- outside: ground, sky, skyline ---------- */
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(900, 900).rotateX(-Math.PI / 2), new THREE.ShaderMaterial({
    uniforms: { uFog: { value: scene.fog.color } },
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec3 vW; uniform vec3 uFog;
      void main(){ vec2 g = abs(fract(vW.xz / 4. - .5) - .5) / fwidth(vW.xz / 4.); float line = 1. - min(min(g.x, g.y), 1.);
        float d = length(vW.xz - cameraPosition.xz); vec3 c = vec3(.028, .032, .042) + vec3(.1, .16, .22) * line * .55;
        gl_FragColor = vec4(mix(c, uFog, 1. - exp(-d * d * .00035)), 1.); }`,
  }));
  ground.position.y = -0.21; scene.add(ground);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(700, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTime: G.uTime },
    vertexShader: `varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec3 vD; uniform float uTime;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){ vec3 d = normalize(vD); float y = max(d.y, 0.);
        vec3 c = mix(vec3(.2, .11, .12), vec3(.035, .05, .11), smoothstep(0., .22, y)); c = mix(c, vec3(.008, .012, .035), smoothstep(.15, .8, y));
        c += vec3(.95, .42, .2) * pow(1. - y, 14.) * .32 * smoothstep(-.4, 1., -d.z);               // the last of the sunset, behind you at the door
        vec2 g = d.xz / (y + .3) * 150.; float r = h(floor(g)); c += smoothstep(.985, 1., r) * smoothstep(.32, 0., length(fract(g) - .5)) * smoothstep(.05, .4, y) * (.7 + .3 * sin(uTime * 2. + r * 50.));
        vec3 m = normalize(vec3(.55, .5, .67)); float md = dot(d, m); c += vec3(1., .97, .9) * (smoothstep(.9985, .9992, md) * 1.6 + pow(max(md, 0.), 300.) * .5 + pow(max(md, 0.), 20.) * .08);
        gl_FragColor = vec4(c, 1.); }`,
  }));
  scene.add(sky);
  {
    const n = lite ? 110 : 230, city = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0), towerMat, n), o = new THREE.Object3D();
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, r = 95 + Math.random() * 190;
      o.position.set(24 + Math.cos(a) * r, -0.2, -10 + Math.sin(a) * r); o.rotation.y = Math.random() * 3;
      o.scale.set(8 + Math.random() * 16, 10 + Math.pow(Math.random(), 2.2) * 80, 8 + Math.random() * 16); o.updateMatrix(); city.setMatrixAt(i, o.matrix);
    }
    scene.add(city);
  }

  /* ---------- light ---------- */
  scene.add(new THREE.HemisphereLight(0x9fb4d8, 0x0b0b0e, 0.75));
  const moon = new THREE.DirectionalLight(0xbfd0ff, 0.5); moon.position.set(0.55, 0.5, 0.67); scene.add(moon);
  const lamp = new THREE.PointLight(0xffe6cc, 20, 30, 1.5); lamp.position.set(0, 0.6, 0.4); camera.add(lamp);

  /* ---------- wall pieces ---------- */
  const glowMat = (color) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, uniforms: { uC: { value: new THREE.Color(color) }, uOn: { value: 0.35 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `varying vec2 vUv; uniform vec3 uC; uniform float uOn; void main(){ vec2 p = (vUv - vec2(.5, .62)) * vec2(1.9, 2.2); float a = exp(-dot(p, p) * 2.6) * smoothstep(1., .78, vUv.y);
      gl_FragColor = vec4(uC * a * uOn * .15, 1.); }`,
  });
  const pieces = PIECES.map((spec) => {
    const el = document.createElement(spec.cls.includes("sign") || spec.cls === "quote" || spec.cls === "hero" ? "div" : "article");
    el.className = "pn " + spec.cls; el.innerHTML = spec.html;
    const obj = new CSS3DObject(el); obj.position.set(...spec.at); obj.rotation.y = FACE[spec.face]; obj.scale.setScalar(spec.scale || S);
    scene.add(obj);
    return { ...spec, el, obj, n: new THREE.Vector3(...NORMAL[spec.face]), c: new THREE.Vector3(...spec.at), stop: spec.stop !== false };
  });
  wireFrames();

  /* ---------- the route ---------- */
  const tmp = new THREE.Matrix4(), UP = new THREE.Vector3(0, 1, 0);
  const pose = (p, look) => ({ p: new THREE.Vector3(...p), q: new THREE.Quaternion().setFromRotationMatrix(tmp.lookAt(new THREE.Vector3(...p), new THREE.Vector3(...look), UP)) });
  let stops = [], cum = [], total = 1, sections = [];
  function fit(pc) { // how far back to stand so the piece fills the view
    const w = pc.el.offsetWidth * pc.obj.scale.x, h = pc.el.offsetHeight * pc.obj.scale.x, tv = Math.tan((camera.fov * Math.PI) / 360);
    pc.w = w; pc.h = h;
    return Math.max(h / (2 * tv * 0.7), w / (2 * tv * camera.aspect * (narrowMq.matches ? 0.92 : 0.8)));
  }
  function buildRoute() {
    const P = Object.fromEntries(pieces.map((p) => [p.id, p]));
    const out = [];
    const via = (room, p, look) => out.push({ room, ...pose(p, look) });
    const view = (id, eye) => {
      const pc = P[id], d = fit(pc), pos = pc.c.clone().addScaledVector(pc.n, d);
      // stand a touch off-centre and look slightly down, so the wall, floor and room stay in the picture
      if (!eye && !narrowMq.matches) pos.addScaledVector(new THREE.Vector3().crossVectors(UP, pc.n), -0.07 * d);
      if (eye) pos.y = eye;
      out.push({ room: pc.room, piece: pc, ...pose(pos.toArray(), [pc.c.x, pc.c.y - (eye ? 0 : 0.045 * d), pc.c.z]) });
    };
    const E = 1.7;
    view("hero", E);
    via("out", [0, E, 4], [0, 2.4, -16]);
    via("A1", [0, E, -4.5], [-3, 2.2, -16]);
    view("bio");
    via("A1", [0, E, -8.5], [0, 2.6, -30]);                     // turn through the doorway ahead
    view("stats");
    via("A1", [0, E, -12.5], [0, 2.6, -46]);
    via("A2", [0.5, E, -19.5], [-3, 2.4, -46]);                 // into the hall, the far wall in view
    view("job0"); view("job1"); view("job2");
    via("A2", [0, E, -41], [0, 2.8, -46]);                      // the far wall
    view("job3"); view("job4");
    via("A2", [3.4, E, -22.5], [14, E, -22.5]);                 // out the side door
    via("out", [13.5, E, -22.5], [40, 2.4, -22.3]);             // across, under the sky
    via("B", [22.5, E, -22.3], [68, 2.8, -22]);                 // the hall opens up
    view("art0"); view("art1"); view("art2"); view("art3");
    via("B", [61.5, E, -22], [68, 3, -22]);                     // the end wall, then turn back
    view("art4"); view("art5"); view("art6"); view("art7");
    via("B", [22.7, 2, -19.5], [22.7, 2.6, -8]);                // the window
    via("out", [22.6, 3.4, -12], [22.4, 12, 12]);               // out through it
    via("out", [22.4, 10.5, 1.5], [22.4, C + 2.2, 16]);         // and up
    via("C", [22.4, C + E, 12.2], [30, C + 2.3, 24]);
    view("pair0"); view("pair1"); view("pair2"); view("pair3");
    via("C", [42.5, C + E, 17], [48, C + 3, 17]);
    view("trio0"); view("trio1"); view("trio2");
    via("C", [27, C + E, 17], [30, C + 9, 17]);                 // under the skylight, looking up
    via("roof", [27, R + E, 17], [41, R + 2.4, 17]);            // rising onto the roof
    view("skills");
    via("roof", [31, R + E, 15], [31, R + 2.6, 22.6]);
    view("contact");
    stops = out;
    // scroll length of each leg: distance to walk, plus time to stand in front of a piece
    cum = [0];
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1], turn = a.q.angleTo(b.q);
      a.dA = a.piece ? 0.42 : 0; a.dB = b.piece ? 0.42 : 0;
      a.len = 0.4 + a.p.distanceTo(b.p) * 0.055 + turn * 0.22 + a.dA + a.dB;
      cum.push(cum[i] + a.len);
    }
    total = cum[cum.length - 1];
    sections = stops.map((s, i) => (s.piece && s.piece.section ? { name: s.piece.section, u: cum[i], i } : null)).filter(Boolean);
    // light pools behind each piece, sized to it
    pieces.forEach((pc) => {
      if (pc.glow) { scene.remove(pc.glow); pc.glow.geometry.dispose(); }
      if (pc.w === undefined) fit(pc);
      const g = new THREE.Mesh(new THREE.PlaneGeometry(pc.w + 5, pc.h + 4.4), glowMat(pc.room === "B" ? 0x9fd8ff : pc.room === "roof" ? 0x565e7a : 0xffdcb0));
      g.position.copy(pc.c).addScaledVector(pc.n, -0.012); g.position.y += 0.3; g.rotation.y = FACE[pc.face]; scene.add(g); pc.glow = g;
    });
    document.body.style.height = Math.round(total * innerHeight * 0.78 + innerHeight) + "px";
    buildNav();
  }

  /* ---------- HUD ---------- */
  const ui = { sec: $("#h-sec"), title: $("#h-title"), n: $("#h-n"), bar: $("#h-bar"), nav: $("#nav"), hint: $("#hint") };
  const scrollMax = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  let lenis = null;
  if (!reduced && window.Lenis) { lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 0.85 }); root.classList.add("lenis"); }
  const getScroll = () => (lenis ? lenis.scroll : scrollY);
  const goTo = (u) => { const y = (u / total) * scrollMax(); lenis ? lenis.scrollTo(y, { duration: clamp(Math.abs(y - getScroll()) / 2400, 1.2, 5) }) : scrollTo({ top: y, behavior: reduced ? "auto" : "smooth" }); };
  function buildNav() {
    ui.nav.innerHTML = sections.map((s, k) => `<button type="button" data-k="${k}"><span>${esc(s.name)}</span></button>`).join("");
    $$("button", ui.nav).forEach((b) => b.addEventListener("click", () => goTo(sections[+b.dataset.k].u + 0.001)));
  }
  $("#next").addEventListener("click", () => { const u = (getScroll() / scrollMax()) * total; const nx = stops.findIndex((s, i) => s.piece && cum[i] > u + 0.05); goTo(nx < 0 ? total : cum[nx]); });
  $("#prev").addEventListener("click", () => { const u = (getScroll() / scrollMax()) * total; let pv = 0; stops.forEach((s, i) => { if (s.piece && cum[i] < u - 0.05) pv = i; }); goTo(cum[pv]); });
  addEventListener("keydown", (e) => { if (e.key === "ArrowRight") $("#next").click(); if (e.key === "ArrowLeft") $("#prev").click(); });

  function countUp(el) {
    if (el.dataset.done || reduced) return; el.dataset.done = 1;
    const to = +el.dataset.count, suf = el.dataset.suffix || "", t0 = performance.now();
    const tick = (now) => { const t = clamp((now - t0) / 1500, 0, 1); el.textContent = Math.round(to * (1 - Math.pow(1 - t, 4))) + suf; if (t < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  }

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.6, 0.85); if (!lite) composer.addPass(bloom);
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uTime; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
      void main(){ vec2 c = vUv - .5; vec3 col = texture2D(tDiffuse, vUv).rgb; col *= smoothstep(1.05, .3, length(c * vec2(1., 1.2))) * .35 + .65;
        col += (h(vUv * 900. + fract(uTime) * 60.) - .5) * .022; gl_FragColor = vec4(col, 1.); }`,
  });
  composer.addPass(lens); composer.addPass(new OutputPass());

  /* ---------- frame ---------- */
  function resize() {
    const w = innerWidth, h = innerHeight;
    document.body.classList.toggle("narrow", narrowMq.matches);
    camera.aspect = w / h; camera.fov = narrowMq.matches ? 62 : 50; camera.updateProjectionMatrix();
    renderer.setSize(w, h, false); composer.setSize(w, h); css.setSize(w, h);
    const keep = total > 1 ? getScroll() / scrollMax() : 0;
    pieces.forEach((pc) => (pc.obj.visible = true)); css.render(scene, camera); // attach and show everything so it can be measured
    buildRoute();
    if (keep > 0) { const y = keep * scrollMax(); lenis ? lenis.scrollTo(y, { immediate: true }) : scrollTo(0, y); }
  }

  // a piece shows only while the camera is inside its room (or at its doorway), because DOM pieces draw over the walls
  const ROOMS = { A1: [-7, 7, -16, 0, -1, 9], A2: [-7, 7, -46, -16, -1, 9], B: [20, 68, -29, -15, -1, 9], C: [20, 48, 10, 24, 11, 18.4], roof: [10, 60, 0, 34, 17.2, 40], out: [-40, 40, 0.3, 80, -1, 30] };
  const inRoom = (r, p, m = 2.6) => { const b = ROOMS[r]; return p.x > b[0] - m && p.x < b[1] + m && p.z > b[2] - m && p.z < b[3] + m && p.y > b[4] && p.y < b[5]; };
  const tp = new THREE.Vector3(), tq = new THREE.Quaternion(), toCam = new THREE.Vector3(), mq = new THREE.Quaternion(), me = new THREE.Euler();
  const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
  addEventListener("pointermove", (e) => { if (e.pointerType === "mouse") { mouse.x = (e.clientX / innerWidth) * 2 - 1; mouse.y = (e.clientY / innerHeight) * 2 - 1; } }, { passive: true });
  let first = true, last = performance.now(), lastStop = -1, lastSec = "";
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; G.uTime.value += dt; lens.uniforms.uTime.value = G.uTime.value;
    if (lenis) lenis.raf(now);
    const u = clamp((getScroll() / scrollMax()) * total, 0, total - 1e-4);
    let i = 0; while (i < stops.length - 2 && u >= cum[i + 1]) i++;
    const a = stops[i], b = stops[i + 1], f = (u - cum[i]) / a.len;
    const e = smooth(a.dA / a.len, 1 - a.dB / a.len, f);
    tp.lerpVectors(a.p, b.p, e); tq.slerpQuaternions(a.q, b.q, e);
    tp.y += Math.sin(e * Math.PI) * Math.min(0.5, a.p.distanceTo(b.p) * 0.02) * (a.room === "out" && b.room === "out" ? 0 : -0.12); // a slight dip of the stride
    const k = first ? 1 : 1 - Math.exp(-dt * 6);
    camera.position.lerp(tp, k); camera.quaternion.slerp(tq, k);
    mouse.sx = lerp(mouse.sx, mouse.x, 0.06); mouse.sy = lerp(mouse.sy, mouse.y, 0.06);
    const base = camera.quaternion.clone(); camera.quaternion.multiply(mq.setFromEuler(me.set(-mouse.sy * 0.025, -mouse.sx * 0.04, 0)));

    // show only what the rooms you are in (or walking into) contain, and only from the front
    const near = e < 0.5 ? i : i + 1;
    for (const pc of pieces) {
      toCam.subVectors(camera.position, pc.c);
      const vis = inRoom(pc.room, camera.position) && toCam.dot(pc.n) > 0.15;
      pc.obj.visible = vis; pc.glow.visible = vis;
      const mine = stops[near].piece === pc;
      pc.glow.material.uniforms.uOn.value = lerp(pc.glow.material.uniforms.uOn.value, mine ? 1 : 0.3, 0.08);
      if (vis && !pc.seen && (mine || toCam.length() < (pc.stop ? 15 : 40))) { pc.seen = true; pc.el.classList.add("seen"); $$("[data-count]", pc.el).forEach(countUp); }
      pc.el.classList.toggle("on", mine);
    }
    sky.position.copy(camera.position);

    if (near !== lastStop) {
      lastStop = near; const s = stops[near];
      let sec = ""; for (const x of sections) if (x.i <= near) sec = x.name;
      const pcs = stops.filter((x) => x.piece);
      let sp = s; for (let j = near; j >= 0 && !sp.piece; j--) sp = stops[j];
      if (sp.piece) { ui.title.textContent = sp.piece.title; ui.n.textContent = pad(pcs.indexOf(sp) + 1) + " / " + pad(pcs.length); }
      if (sec !== lastSec) { lastSec = sec; ui.sec.textContent = sec; $$("button", ui.nav).forEach((bn, k2) => bn.classList.toggle("on", sections[k2].name === sec)); }
    }
    ui.bar.style.transform = `scaleX(${(u / total).toFixed(4)})`;
    root.classList.toggle("moved", u > 0.12);

    composer.render(dt); css.render(scene, camera);
    camera.quaternion.copy(base);
    if (first) { first = false; $("#boot").classList.add("done"); root.classList.add("ready"); }
    requestAnimationFrame(frame);
  }

  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => {
    resize();
    let rt; addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });
    requestAnimationFrame(frame);
    window.__gallery = { goTo, get total() { return total; }, stops: () => stops, cum: () => cum };
  });
}
