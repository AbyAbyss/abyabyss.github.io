// Interaction layer: renders content from data.js, maps scroll to depth, drives the scene.
import { PROJECTS, FEATURED, WORK, SKILLS } from "./data.js";

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const pad = (n) => String(n).padStart(2, "0");
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const lite = matchMedia("(max-width: 860px), (pointer: coarse)").matches || (navigator.hardwareConcurrency || 8) <= 4;

/* ---------- content ---------- */
const byName = (n) => PROJECTS.find((p) => p.name === n);
const featured = FEATURED.map(byName).filter(Boolean);
const shelf = PROJECTS.filter((p) => !featured.includes(p)).sort((a, b) => (a.priv ? 1 : 0) - (b.priv ? 1 : 0));

const tags = (list) => `<ul class="tags">${list.map((t) => `<li>${esc(t)}</li>`).join("")}</ul>`;
const badge = (p) => p.priv
  ? `<span class="badge priv">${p.soon ? "Private · open source soon" : "Private"}</span>`
  : `<span class="badge oss">Open source</span>`;
function actions(p) {
  const out = [];
  const ext = (h) => (/^https?:/.test(h) ? ' target="_blank" rel="noopener"' : "");
  if (p.site) out.push(`<a class="btn hot" href="${esc(p.site.href)}"${ext(p.site.href)}>${esc(p.site.label)} →</a>`);
  if (p.link) out.push(`<a class="btn${p.site ? "" : " hot"}" href="${esc(p.link.href)}"${ext(p.link.href)}>${esc(p.link.label)}</a>`);
  if (p.docs) out.push(`<a class="btn" href="${esc(p.docs.href)}">${esc(p.docs.label)}</a>`);
  if (p.repo) out.push(`<a class="btn" href="${esc(p.repo)}" target="_blank" rel="noopener">Source ↗</a>`);
  return out.join("");
}
const img = (src, alt, fit) => `<img src="${esc(src)}" alt="${esc(alt)}" loading="lazy" decoding="async"${fit ? ' class="fit"' : ""}>`;

$("#feat").innerHTML = featured.map((p, i) => `
  <article class="proj" data-reveal>
    <div class="proj-media">
      <button class="frame" type="button" data-shots='${esc(JSON.stringify(p.shots))}' aria-label="${esc(p.name)} screenshots, show next">
        ${img(p.shots[0], p.name + " screenshot", p.fit)}
        ${p.shots.length > 1 ? `<span class="frame-n mono"><b>1</b> / ${p.shots.length}</span>` : ""}
      </button>
      ${p.shots.length > 1 ? `<div class="dots">${p.shots.map((_, k) => `<button type="button" class="${k ? "" : "on"}" aria-label="Screenshot ${k + 1}"></button>`).join("")}</div>` : ""}
    </div>
    <div class="proj-info">
      <p class="mono proj-n"><b>${pad(i + 1)}</b> / ${pad(featured.length)}</p>
      <h3>${esc(p.name)}</h3>
      <p class="proj-meta">${esc(p.meta)}</p>
      <p class="proj-desc">${esc(p.desc)}</p>
      ${tags(p.tech)}
      <div class="acts">${actions(p)}${badge(p)}</div>
    </div>
  </article>`).join("");

$("#shelf-n").textContent = `${pad(shelf.length)} more`;
$("#shelf").innerHTML = shelf.map((p, i) => `
  <article class="card" data-reveal style="--d:${i % 3}">
    <div class="card-img">${img(p.shots[0], p.name + " screenshot", p.fit)}</div>
    <div class="card-b">
      <div class="card-top"><h4>${esc(p.name)}</h4>${badge(p)}</div>
      <p class="card-meta">${esc(p.meta)}</p>
      <p class="card-d">${esc(p.desc)}</p>
      ${tags(p.tech)}
      <div class="acts">${actions(p)}</div>
    </div>
  </article>`).join("");

$("#pro").innerHTML = WORK.map((w, i) => `
  <details name="pro"${i ? "" : " open"} data-reveal>
    <summary><span class="mono n">${pad(i + 1)}</span><span class="nm">${esc(w.name)}</span><span class="mono mt"><b>${esc(w.org)}</b> · ${esc(w.meta)}</span><span class="x" aria-hidden="true"></span></summary>
    <div class="body"><p>${esc(w.desc)}</p>${tags(w.tech)}</div>
  </details>`).join("");

$("#kit").innerHTML = SKILLS.map(([name, items], i) => `
  <section class="grp" data-reveal style="--d:${i % 3}">
    <h3>${esc(name)} <span class="mono">${pad(items.length)}</span></h3>
    <ul>${items.map((s, k) => `<li style="--i:${k}">${esc(s)}</li>`).join("")}</ul>
  </section>`).join("");

/* screenshot switcher + tilt */
$$(".proj-media").forEach((m) => {
  const frame = $(".frame", m), im = $("img", frame), shots = JSON.parse(frame.dataset.shots), dots = $$(".dots button", m), n = $(".frame-n b", m);
  let cur = 0, busy = false;
  const go = (k) => {
    if (busy || shots.length < 2) return; cur = (k + shots.length) % shots.length; busy = true;
    im.classList.add("out");
    setTimeout(() => {
      const done = () => { im.classList.remove("out"); busy = false; im.onload = im.onerror = null; };
      im.onload = im.onerror = done; im.src = shots[cur]; if (im.complete) done();
    }, 240);
    dots.forEach((d, i) => d.classList.toggle("on", i === cur)); if (n) n.textContent = cur + 1;
  };
  frame.addEventListener("click", () => go(cur + 1));
  dots.forEach((d, i) => d.addEventListener("click", () => go(i)));
  if (!reduced && !lite) {
    m.addEventListener("pointermove", (e) => {
      const r = frame.getBoundingClientRect();
      frame.style.setProperty("--ry", ((e.clientX - r.left) / r.width - 0.5) * 9 + "deg");
      frame.style.setProperty("--rx", -((e.clientY - r.top) / r.height - 0.5) * 7 + "deg");
    });
    m.addEventListener("pointerleave", () => { frame.style.setProperty("--ry", "0deg"); frame.style.setProperty("--rx", "0deg"); });
  }
});

/* ---------- text splitting + reveals ---------- */
$$("[data-chars]").forEach((el) => {
  el.innerHTML = [...el.textContent].map((c, i) => (c === " " ? `<span class="ch" style="--i:${i}">&nbsp;</span>` : `<span class="ch" style="--i:${i}">${c}</span>`)).join("");
});
$$("[data-words]").forEach((el) => {
  let i = 0;
  const wrap = (text) => text.split(/(\s+)/).map((w) => (w.trim() ? `<span class="w"><span style="--i:${i++}">${esc(w)}</span></span>` : w)).join("");
  el.innerHTML = [...el.childNodes].map((n) => (n.nodeType === 3 ? wrap(n.textContent) : `<em>${wrap(n.textContent)}</em>`)).join("");
});
const io = new IntersectionObserver((es) => es.forEach((e) => {
  if (!e.isIntersecting) return;
  e.target.classList.add("in"); io.unobserve(e.target);
  $$("[data-count]", e.target.matches("[data-count]") ? e.target.parentNode : e.target).forEach(countUp);
}), { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
$$("[data-reveal], [data-words]").forEach((el) => io.observe(el));
function countUp(el) {
  if (el.dataset.done || reduced) return; el.dataset.done = 1;
  const to = +el.dataset.count, suf = el.dataset.suffix || "", t0 = performance.now(), dur = 1400;
  const tick = (now) => { const t = clamp((now - t0) / dur, 0, 1), e = 1 - Math.pow(1 - t, 4); el.textContent = Math.round(to * e) + suf; if (t < 1) requestAnimationFrame(tick); };
  requestAnimationFrame(tick);
}

/* ---------- smooth scroll ---------- */
let lenis = null;
if (!reduced && window.Lenis) {
  lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.9, anchors: false });
  document.documentElement.classList.add("lenis");
}
const scrollY = () => (lenis ? lenis.scroll : window.scrollY);
document.addEventListener("click", (e) => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute("href").slice(1), el = document.getElementById(id); if (!el) return;
  e.preventDefault();
  const y = id === "top" ? 0 : el.getBoundingClientRect().top + window.scrollY + innerHeight * (id === "contact" ? 10 : 0.1);
  const target = Math.min(y, document.documentElement.scrollHeight - innerHeight);
  if (lenis) lenis.scrollTo(target, { duration: clamp(Math.abs(target - scrollY()) / 2600, 1.4, 4.5), easing: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2) });
  else window.scrollTo({ top: target, behavior: reduced ? "auto" : "smooth" });
  history.replaceState(null, "", id === "top" ? location.pathname : "#" + id);
});

/* ---------- the descent: scroll → world height, depth and camera ---------- */
const SECS = ["top", "about", "experience", "work", "skills", "contact"].map((id) => document.getElementById(id));
// The route. `s` is section-space (1 = start of About, 2 = start of Experience, ...), so the
// camera reaches each knot as that part of the page arrives. x: right, y: up, z: toward the viewer.
const ROUTE = [
  { s: 0,    p: [0, 2.4, 0],       yaw: 0,     pitch: 0.13 },   // above the water
  { s: 1,    p: [0, -12, 0],       yaw: -0.1,  pitch: -0.2 },   // down
  { s: 1.33, p: [17, -6, -2],      yaw: -0.5,  pitch: 0.16 },   // up, back under the ripples
  { s: 1.7,  p: [41, -19, -4],     yaw: -0.32, pitch: -0.06 },  // right, into the kelp
  { s: 2,    p: [62, -32, -1],     yaw: 0.08,  pitch: -0.14 },
  { s: 2.5,  p: [65, -80, 1],      yaw: 0.22,  pitch: -0.08 },  // down through the jellyfish
  { s: 3,    p: [62, -125, 0],     yaw: 0.4,   pitch: -0.05 },
  { s: 3.25, p: [28, -141, -1],    yaw: 0.8,   pitch: -0.14 },   // left along the cables, the wreck comes into view
  { s: 3.45, p: [2, -148, -1],     yaw: 0.1,   pitch: -0.32 },  // over her deck
  { s: 3.62, p: [-24, -158, 1],    yaw: -0.8,  pitch: -0.1 },  // a last look back
  { s: 3.8,  p: [-55, -190, 0],    yaw: 0,     pitch: -0.16 },
  { s: 4,    p: [-55, -262, 0],    yaw: 0.25,  pitch: -0.06 },  // down again
  { s: 4.5,  p: [-74, -282, 0],    yaw: 0.1,   pitch: -0.1 },   // left, through the network
  { s: 5,    p: [-60, -298, 2],    yaw: -1.35, pitch: -0.35 },  // turn into the cave mouth
  { s: 5.3,  p: [-44, -311, 0.5],  yaw: -1.5,  pitch: -0.6 },   // forward and down the tunnel
  { s: 5.6,  p: [-28, -333, 0.5],  yaw: -1.5,  pitch: -0.6 },
  { s: 5.82, p: [-12, -348.5, 0],  yaw: -1.1,  pitch: -0.15 },  // out onto the plain
  { s: 6,    p: [0, -352.8, 0],    yaw: 0,     pitch: 0.015 },  // the floor
];
// world height → metres shown on the gauge
const DEPTH = [[0, 0], [-12, 12], [-32, 200], [-125, 1000], [-262, 4000], [-303, 6000], [-352.8, 10935]];
const depthAt = (y) => {
  if (y >= 0) return 0;
  for (let k = 1; k < DEPTH.length; k++) if (y >= DEPTH[k][0]) return lerp(DEPTH[k - 1][1], DEPTH[k][1], (DEPTH[k - 1][0] - y) / (DEPTH[k - 1][0] - DEPTH[k][0]));
  return DEPTH[DEPTH.length - 1][1];
};
const tangent = (k, a) => { // finite-difference tangents keep the path smooth through every knot
  const lo = ROUTE[Math.max(0, k - 1)], hi = ROUTE[Math.min(ROUTE.length - 1, k + 1)];
  return (hi.p[a] - lo.p[a]) / (hi.s - lo.s);
};
function routeAt(u) {
  let k = 0; while (k < ROUTE.length - 2 && u >= ROUTE[k + 1].s) k++;
  const A = ROUTE[k], B = ROUTE[k + 1], h = B.s - A.s, t = clamp((u - A.s) / h, 0, 1), t2 = t * t, t3 = t2 * t;
  const pos = [0, 1, 2].map((a) => (2 * t3 - 3 * t2 + 1) * A.p[a] + (t3 - 2 * t2 + t) * h * tangent(k, a) + (-2 * t3 + 3 * t2) * B.p[a] + (t3 - t2) * h * tangent(k + 1, a));
  const e = smooth(0, 1, t);
  return { x: pos[0], y: pos[1], z: pos[2], yaw: lerp(A.yaw, B.yaw, e), pitch: lerp(A.pitch, B.pitch, e) };
}
const ZONES = ["Surface", "Sunlight zone", "Twilight zone", "Midnight zone", "Abyssal zone", "Hadal zone · trench floor"];
let breaks = [];
function measure() {
  const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
  breaks = SECS.map((s, i) => (i ? Math.min(max, s.offsetTop - innerHeight * 0.5) : 0)); breaks.push(max);
}
function sample(sy) {
  let i = 0; while (i < SECS.length - 1 && sy >= breaks[i + 1]) i++;
  const t = clamp((sy - breaks[i]) / Math.max(1, breaks[i + 1] - breaks[i]), 0, 1);
  let e = t;
  if (i === 0) e = t * t * (1.6 - 0.6 * t);                 // hold the horizon, then plunge
  if (i === SECS.length - 1) e = 1 - Math.pow(1 - t, 1.25); // settle onto the floor
  const r = routeAt(i + e);
  if (i === 0) r.pitch -= Math.sin(Math.PI * clamp((t - 0.12) / 0.88, 0, 1)) * 0.5;
  r.y = Math.max(r.y, -352.8);
  return { i, t, ...r, m: depthAt(r.y) };
}

const ui = {
  depth: $("#g-depth"), zone: $("#g-zone"), atm: $("#g-atm"), temp: $("#g-temp"), light: $("#g-light"), head: $("#g-head"),
  rail: $("#rail-fill"), links: $$(".rail a"), root: document.documentElement, heroPin: $(".hero-pin"),
};
const fmt = new Intl.NumberFormat("en-GB");
let lastZone = -1, lastDepth = -1;
function hud(s, sy) {
  const d = Math.round(s.m);
  if (d !== lastDepth) {
    lastDepth = d; ui.depth.textContent = fmt.format(d);
    ui.atm.textContent = fmt.format(Math.round(1 + d / 10));
    const temp = d < 200 ? lerp(24, 14, d / 200) : d < 1000 ? lerp(14, 4, (d - 200) / 800) : lerp(4, 1.8, clamp((d - 1000) / 9000, 0, 1));
    ui.temp.textContent = temp.toFixed(1);
    ui.light.textContent = d > 1000 ? "0" : Math.round(100 * Math.exp(-d / 160));
  }
  const hd = Math.round((((-s.yaw * 180) / Math.PI) % 360 + 360) % 360 / 5) * 5 % 360;
  if (ui.head.textContent !== String(hd).padStart(3, "0")) ui.head.textContent = String(hd).padStart(3, "0");
  const z = d < 1 ? 0 : d < 200 ? 1 : d < 1000 ? 2 : d < 4000 ? 3 : d < 6000 ? 4 : 5;
  if (z !== lastZone) { lastZone = z; ui.zone.textContent = ZONES[z]; }
  ui.links.forEach((a, k) => a.classList.toggle("on", k === s.i));
  ui.rail.style.setProperty("--p", clamp(sy / breaks[breaks.length - 1], 0, 1).toFixed(4));
  ui.root.style.setProperty("--scrim", (s.i === 0 ? smooth(0.55, 1, s.t) * 0.85 : Math.max(0.85, smooth(-14, -60, s.y))).toFixed(3));
  ui.root.classList.toggle("under", s.i > 0);
  if (ui.heroPin) {
    const o = s.i === 0 ? 1 - smooth(0.28, 0.62, s.t) : 0;
    ui.heroPin.style.opacity = o.toFixed(3); ui.heroPin.style.transform = `translate3d(0, ${(-(1 - o) * 60).toFixed(1)}px, 0)`;
    ui.heroPin.style.visibility = o < 0.01 ? "hidden" : "visible";
  }
}

/* ---------- cursor ---------- */
const cursor = $("#cursor"); const cp = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2 };
let scene = null;
addEventListener("pointermove", (e) => {
  cp.tx = e.clientX; cp.ty = e.clientY;
  if (e.pointerType === "mouse") { cursor.classList.add("on"); cursor.classList.toggle("hot", !!e.target.closest("a, button, summary")); }
  scene && scene.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1));
}, { passive: true });
document.addEventListener("pointerleave", () => cursor.classList.remove("on"));
addEventListener("pointerdown", (e) => {
  if (reduced || e.pointerType !== "mouse") return;
  const s = document.createElement("i"); s.className = "sonar"; s.style.left = e.clientX + "px"; s.style.top = e.clientY + "px";
  document.body.appendChild(s); s.addEventListener("animationend", () => s.remove());
  audio.ping(0.5);
});

/* ---------- ambient sound (off until asked for) ---------- */
const audio = (() => {
  let ctx, master, lp, drone, noiseGain, on = false, lastPing = 0;
  function build() {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 1400; lp.connect(master);
    const len = ctx.sampleRate * 4, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); let last = 0;
    for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } // brown noise
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    noiseGain = ctx.createGain(); noiseGain.gain.value = 0.5; src.connect(noiseGain); noiseGain.connect(lp); src.start();
    const swell = ctx.createOscillator(), sg = ctx.createGain(); swell.frequency.value = 0.13; sg.gain.value = 0.22; swell.connect(sg); sg.connect(noiseGain.gain); swell.start();
    drone = ctx.createGain(); drone.gain.value = 0; drone.connect(master);
    [[48, 0.5], [72.3, 0.28], [96.4, 0.14]].forEach(([f, g]) => { const o = ctx.createOscillator(), og = ctx.createGain(); o.type = "sine"; o.frequency.value = f; og.gain.value = g; o.connect(og); og.connect(drone); o.start(); });
  }
  return {
    toggle() {
      if (!ctx) build();
      on = !on; ctx.resume(); master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.4);
      return on;
    },
    update(y, t) {
      if (!on) return;
      const under = y < 0, deep = smooth(-10, -200, y);
      lp.frequency.setTargetAtTime(under ? lerp(520, 150, deep) : 1500, ctx.currentTime, 0.15);
      drone.gain.setTargetAtTime(under ? lerp(0.12, 0.5, deep) : 0, ctx.currentTime, 0.3);
      if (under && t - lastPing > 7.5) { lastPing = t; this.ping(1); }
    },
    ping(vol) {
      if (!on) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), dl = ctx.createDelay(1), fb = ctx.createGain(), now = ctx.currentTime;
      o.type = "sine"; o.frequency.setValueAtTime(1180, now); o.frequency.exponentialRampToValueAtTime(1120, now + 0.4);
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.09 * vol, now + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
      dl.delayTime.value = 0.33; fb.gain.value = 0.42; o.connect(g); g.connect(master); g.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(master);
      o.start(now); o.stop(now + 1.4); setTimeout(() => { fb.gain.value = 0; dl.disconnect(); }, 3500);
    },
    suspend(h) { if (ctx && on) (h ? ctx.suspend() : ctx.resume()); },
  };
})();
$("#snd").addEventListener("click", (e) => {
  const on = audio.toggle(); e.currentTarget.setAttribute("aria-pressed", on); $("#snd-t").textContent = on ? "Sound on" : "Sound off";
});
document.addEventListener("visibilitychange", () => audio.suspend(document.hidden));

$("#copy").addEventListener("click", async (e) => {
  const b = e.currentTarget;
  try { await navigator.clipboard.writeText("abyrocksaji@gmail.com"); b.textContent = "Copied"; } catch { b.textContent = "Press ⌘C"; }
  setTimeout(() => (b.textContent = "Copy"), 1800);
});

/* ---------- boot ---------- */
const boot = { el: $("#boot"), fill: $("#boot-fill"), pct: $("#boot-pct"), items: $$(".boot-list li"), p: 0, target: 0 };
const step = (k) => { boot.target = Math.max(boot.target, (k + 1) / boot.items.length); };
(function bootTick() {
  boot.p = lerp(boot.p, boot.target, 0.12); if (boot.target - boot.p < 0.004) boot.p = boot.target;
  boot.fill.style.transform = `scaleX(${boot.p})`; boot.pct.textContent = String(Math.round(boot.p * 100)).padStart(3, "0");
  boot.items.forEach((li, i) => li.classList.toggle("ok", boot.p >= (i + 1) / boot.items.length - 0.001));
  if (boot.p < 1) requestAnimationFrame(bootTick);
  else setTimeout(() => { boot.el.classList.add("done"); document.documentElement.classList.add("ready"); }, 260);
})();

async function start() {
  step(0);
  measure();
  try {
    const { createScene } = await import("./journey-scene.js");
    step(1);
    scene = createScene($("#sea"), { lite });
    window.__abyss = scene;
    step(2);
  } catch (err) {
    console.warn("WebGL scene unavailable, using the static water column.", err);
    document.documentElement.classList.add("no-gl"); step(2);
  }
  await Promise.race([document.fonts ? document.fonts.ready : 0, new Promise((r) => setTimeout(r, 2500))]);
  measure();

  let last = performance.now(), first = true; const cam = sample(scrollY());
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (lenis) lenis.raf(now);
    const sy = scrollY(), s = sample(sy);
    const kf = first ? 1 : 1 - Math.exp(-dt * 7);
    cam.x = lerp(cam.x, s.x, kf); cam.y = lerp(cam.y, s.y, kf); cam.z = lerp(cam.z, s.z, kf);
    hud(s, sy);
    cp.x = lerp(cp.x, cp.tx, 0.2); cp.y = lerp(cp.y, cp.ty, 0.2);
    cursor.style.transform = `translate3d(${cp.x}px, ${cp.y}px, 0)`;
    if (scene && !document.hidden) {
      const st = scene.state; st.x = cam.x; st.y = cam.y; st.z = cam.z; st.pitch = lerp(st.pitch, s.pitch, first ? 1 : 1 - Math.exp(-dt * 5)); st.yaw = lerp(st.yaw, s.yaw, first ? 1 : 1 - Math.exp(-dt * 3));
      scene.render(dt); audio.update(cam.y, st.time);
    }
    if (first) { first = false; step(3); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  let rt; const onResize = () => { clearTimeout(rt); rt = setTimeout(() => { measure(); scene && scene.resize(); }, 120); };
  addEventListener("resize", onResize);
  new ResizeObserver(onResize).observe(document.body);
  $$("img").forEach((i) => i.complete || i.addEventListener("load", onResize, { once: true }));
  $$("details").forEach((d) => d.addEventListener("toggle", onResize));
}
start();
