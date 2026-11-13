// The dive: one continuous WebGL scene from a dusk ocean surface to the trench floor.
// World units: y = 0 is the waterline, the seabed sits at SEABED_Y.
import * as THREE from "../vendor/three-kit.min.js";

const {
  EffectComposer, RenderPass, UnrealBloomPass, ShaderPass, OutputPass, mergeGeometries,
} = THREE;

export const SEABED_Y = -356;

const rand = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

/* ---------- shared GLSL ---------- */
const NOISE = /* glsl */ `
float hash11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.-2.*f);
  return mix(mix(hash21(i), hash21(i+vec2(1,0)), f.x), mix(hash21(i+vec2(0,1)), hash21(i+vec2(1,1)), f.x), f.y); }
`;
const FOG_PARS = /* glsl */ `
uniform vec3 uFogColor; uniform float uFogDensity;
vec3 applyFog(vec3 c, float d){ float f = 1. - exp(-uFogDensity*uFogDensity*d*d); return mix(c, uFogColor, clamp(f,0.,1.)); }
float fogAmount(float d){ return clamp(1. - exp(-uFogDensity*uFogDensity*d*d), 0., 1.); }
`;
const SKY_FN = /* glsl */ `
uniform vec3 uSunDir;
vec3 skyColor(vec3 d){
  float h = d.y;
  vec3 horizon = vec3(.95, .40, .17), mid = vec3(.33, .12, .32), top = vec3(.018, .028, .1);
  vec3 c = mix(horizon, mid, smoothstep(-.02, .22, h));
  c = mix(c, top, smoothstep(.1, .5, h));
  float s = max(dot(d, uSunDir), 0.);
  c += vec3(1.0, .6, .28) * (pow(s, 1400.) * 12. + pow(s, 90.) * .7 + pow(s, 9.) * .22);
  return c;
}
`;

/* Fog and water colour by world height. */
const STOPS = [
  { y: 6, c: "#f08a4e", d: 0.0045 },
  { y: 0.01, c: "#f08a4e", d: 0.0045 },
  { y: -0.01, c: "#0d7c9c", d: 0.02 },
  { y: -16, c: "#0a6887", d: 0.024 },
  { y: -50, c: "#064363", d: 0.027 },
  { y: -95, c: "#042a45", d: 0.03 },
  { y: -135, c: "#02121f", d: 0.033 },
  { y: -200, c: "#01070e", d: 0.035 },
  { y: -320, c: "#01060b", d: 0.032 },
  { y: -360, c: "#030708", d: 0.026 },
].map((s) => ({ y: s.y, c: new THREE.Color(s.c), d: s.d }));

export function createScene(canvas, opts = {}) {
  const lite = !!opts.lite; // phones and low-power devices
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: "high-performance", alpha: false });
  const maxDpr = lite ? 1.25 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0d7c9c, 0.02);
  scene.background = new THREE.Color(0x0d7c9c);

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 1400);
  camera.rotation.order = "YXZ";
  scene.add(camera);

  const G = { // uniforms shared by every custom material
    uTime: { value: 0 },
    uFogColor: { value: scene.fog.color },
    uFogDensity: { value: 0.02 },
    uSunDir: { value: new THREE.Vector3(0.1, 0.085, -1).normalize() },
    uCam: { value: camera.position },
    uPointScale: { value: 600 },
    uMouse: { value: new THREE.Vector2(0, 0) },
  };

  const updaters = [];
  const disposables = [];

  /* ---------- sky ---------- */
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(1000, 32, 20),
    new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { uSunDir: G.uSunDir, uTime: G.uTime },
      vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.); gl_Position = projectionMatrix * p; }`,
      fragmentShader: `varying vec3 vDir; uniform float uTime; ${NOISE} ${SKY_FN}
        void main(){ vec3 d = normalize(vDir); vec3 c = skyColor(d);
          // a few stars high up
          vec2 g = d.xz / (abs(d.y) + .35) * 170.; vec2 id = floor(g); float r = hash21(id);
          float st = smoothstep(.988, 1., r) * smoothstep(.3, .0, length(fract(g) - .5)) * smoothstep(.16, .45, d.y) * 1.6;
          c += st * (.6 + .4 * sin(uTime * 2. + r * 60.));
          // thin cloud bands near the horizon
          float cl = vnoise(vec2(d.x * 5. + uTime * .004, d.y * 34.)) * vnoise(vec2(d.x * 2.2, d.y * 9. + 3.));
          c = mix(c, c * .55 + vec3(.25, .08, .1), smoothstep(.3, .75, cl) * smoothstep(.0, .05, d.y) * smoothstep(.3, .08, d.y) * .75);
          gl_FragColor = vec4(c, 1.); }`,
    })
  );
  sky.frustumCulled = false;
  scene.add(sky);

  /* ---------- ocean surface (seen from above and from below) ---------- */
  const waterMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: G.uTime, uSunDir: G.uSunDir, uFogColor: G.uFogColor, uFogDensity: G.uFogDensity, uCam: G.uCam },
    vertexShader: /* glsl */ `
      uniform float uTime; varying vec3 vW;
      float wave(vec2 p, vec2 d, float k, float s){ return sin(dot(p, d) * k + uTime * s); }
      void main(){
        vec4 w = modelMatrix * vec4(position, 1.);
        float near = smoothstep(260., 20., length(w.xz));
        w.y += (wave(w.xz, vec2(.8,.6), .35, .9) * .16 + wave(w.xz, vec2(-.5,.86), .62, 1.3) * .09 + wave(w.xz, vec2(.2,-1.), 1.1, 1.7) * .04) * near;
        vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: /* glsl */ `
      uniform float uTime; uniform vec3 uCam; varying vec3 vW; ${NOISE} ${FOG_PARS} ${SKY_FN}
      vec3 waveNormal(vec2 p, float amp){
        vec2 g = vec2(0.);
        g += vec2(.8,.6)   * cos(dot(p, vec2(.8,.6)) * .35 + uTime * .9) * .35 * .16;
        g += vec2(-.5,.86) * cos(dot(p, vec2(-.5,.86)) * .62 + uTime * 1.3) * .62 * .09;
        g += vec2(.2,-1.)  * cos(dot(p, vec2(.2,-1.)) * 1.1 + uTime * 1.7) * 1.1 * .04;
        g += vec2(.6,-.8)  * cos(dot(p, vec2(.6,-.8)) * 2.7 + uTime * 2.3) * .05;
        g += vec2(-.9,.3)  * cos(dot(p, vec2(-.9,.3)) * 4.9 - uTime * 2.9) * .045;
        g += vec2(.3,.95)  * cos(dot(p, vec2(.3,.95)) * 8.3 + uTime * 3.7) * .03;
        g += (vec2(vnoise(p * 1.7 + uTime * .3), vnoise(p * 1.7 + 17. - uTime * .25)) - .5) * .22;
        return normalize(vec3(-g.x * amp, 1., -g.y * amp));
      }
      void main(){
        vec3 toCam = uCam - vW; float dist = length(toCam); vec3 V = toCam / dist;
        vec3 col;
        if (uCam.y >= 0.) {
          vec3 N = waveNormal(vW.xz, mix(1.5, .35, smoothstep(10., 260., dist)));
          vec3 R = reflect(-V, N); R.y = abs(R.y);
          float fres = .03 + .97 * pow(1. - max(dot(N, V), 0.), 5.);
          vec3 deep = vec3(.006, .05, .075);
          col = mix(deep, skyColor(R), fres);
          col += vec3(1., .6, .3) * pow(max(dot(R, uSunDir), 0.), 180.) * 5.;
          vec3 hz = skyColor(normalize(vec3(-V.x, .0, -V.z)));
          col = mix(col, hz, smoothstep(140., 620., dist));
        } else {
          vec3 N = waveNormal(vW.xz, 1.6);
          float up = clamp(-V.y, 0., 1.);                       // 1 = looking straight up
          float window = smoothstep(.5, .8, up + (N.x + N.z) * .22);
          float caust = pow(max(dot(N, normalize(vec3(.2, 1., -.35))), 0.), 60.);
          vec3 under = vec3(.02, .22, .32);
          col = mix(under, vec3(.62, .93, 1.), window * .9) + caust * vec3(.7, 1., 1.) * 1.1;
          col = applyFog(col, dist * .55);
        }
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000, lite ? 120 : 220, lite ? 120 : 220).rotateX(-Math.PI / 2), waterMat);
  water.frustumCulled = false;
  scene.add(water);

  /* ---------- light shafts under the surface ---------- */
  const rayMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    uniforms: { uTime: G.uTime, uFade: { value: 1 }, uSeed: { value: 0 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec2 vUv; uniform float uTime, uFade, uSeed; ${NOISE}
      void main(){ float x = vUv.x; float skew = x + (1. - vUv.y) * .25;
        float n = vnoise(vec2(skew * 7. + uSeed, uTime * .12 + uSeed)) * vnoise(vec2(skew * 19. - uTime * .07, uSeed * 3.));
        float a = smoothstep(.06, .45, n) * smoothstep(0., .3, x) * smoothstep(1., .7, x) * pow(vUv.y, 1.6) * smoothstep(1., .93, vUv.y);
        gl_FragColor = vec4(vec3(.55, .95, 1.) * a * 1.1 * uFade, 1.); }`,
  });
  const rays = new THREE.Group();
  for (let i = 0; i < (lite ? 6 : 10); i++) {
    const m = rayMat.clone(); m.uniforms.uTime = G.uTime; m.uniforms.uSeed.value = i * 7.3;
    const g = new THREE.PlaneGeometry(rand(14, 26), 70); g.translate(0, -35, 0);
    const r = new THREE.Mesh(g, m); const a = (i / 10) * Math.PI * 2 + rand(0.4), d = rand(14, 34);
    r.position.set(Math.cos(a) * d, 0, Math.sin(a) * d - 6); r.rotation.z = rand(-0.22, 0.22);
    rays.add(r);
  }
  scene.add(rays);
  updaters.push((t, cam) => {
    const f = smooth(-75, -8, cam.y) * smooth(0.5, -2, cam.y);
    rays.visible = f > 0.01;
    rays.children.forEach((r) => { r.material.uniforms.uFade.value = f; r.rotation.y = Math.atan2(cam.x - r.position.x, cam.z - r.position.z); });
  });

  /* ---------- drifting particles that wrap around the camera ---------- */
  function wrapPoints({ count, box, size, frag, uniforms = {}, vertExtra = "", motion }) {
    const g = new THREE.BufferGeometry();
    const p = new Float32Array(count * 3), s = new Float32Array(count);
    for (let i = 0; i < count; i++) { p[i * 3] = rand(box); p[i * 3 + 1] = rand(box); p[i * 3 + 2] = rand(box); s[i] = Math.random(); }
    g.setAttribute("position", new THREE.BufferAttribute(p, 3)); g.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: G.uTime, uCam: G.uCam, uBox: { value: box }, uSize: { value: size }, uPointScale: G.uPointScale, uMouse: G.uMouse, uFogDensity: G.uFogDensity, uFogColor: G.uFogColor, ...uniforms },
      vertexShader: /* glsl */ `
        attribute float aSeed; uniform float uTime, uBox, uSize, uPointScale; uniform vec3 uCam; uniform vec2 uMouse;
        varying float vA; varying float vSeed; varying float vY; varying float vLit; ${vertExtra}
        void main(){ vec3 p = position; ${motion}
          p = mod(p - uCam + uBox * .5, uBox) - uBox * .5 + uCam;
          vec4 mv = viewMatrix * vec4(p, 1.); float d = -mv.z;
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uSize * (.4 + aSeed) * uPointScale / max(d, .1);
          vA = smoothstep(uBox * .5, uBox * .28, length(p - uCam)) * smoothstep(.4, 2.5, d);
          vec2 ndc = gl_Position.xy / gl_Position.w; vLit = smoothstep(.55, 0., length((ndc - uMouse) * vec2(1.6, 1.)));
          vSeed = aSeed; vY = p.y; }`,
      fragmentShader: `uniform float uTime; varying float vA, vSeed, vY, vLit; ${frag}`,
    });
    const pts = new THREE.Points(g, m); pts.frustumCulled = false; scene.add(pts); return pts;
  }

  // marine snow: sinks slowly everywhere below the surface, catches the pointer's light
  const snow = wrapPoints({
    count: lite ? 1600 : 4200, box: 56, size: 0.085,
    uniforms: { uTint: { value: new THREE.Color(0xbfefff) }, uBio: { value: 0 } },
    motion: `p.y -= uTime * (.12 + aSeed * .25); p.x += sin(uTime * .25 + aSeed * 50.) * .5; p.z += cos(uTime * .2 + aSeed * 31.) * .5;`,
    frag: `uniform vec3 uTint; uniform float uBio;
      void main(){ vec2 c = gl_PointCoord - .5; float r = length(c); float a = smoothstep(.5, .0, r); a *= a;
        float tw = .55 + .45 * sin(uTime * (1. + vSeed * 3.) + vSeed * 90.);
        vec3 bio = mix(vec3(.2, 1., .85), vec3(.3, .55, 1.), fract(vSeed * 7.3));
        vec3 col = mix(uTint, bio * (step(.72, vSeed) * 2.4 * tw + .25), uBio);
        float al = a * vA * smoothstep(-.2, -1.5, vY) * (.34 + vLit * .9);
        gl_FragColor = vec4(col * al, 1.); }`,
  });

  // bubbles: rise through the upper zones
  const bubbles = wrapPoints({
    count: lite ? 160 : 420, box: 44, size: 0.2, uniforms: { uFade: { value: 1 } },
    motion: `p.y += uTime * (1.2 + aSeed * 2.4); p.x += sin(uTime * 1.3 + aSeed * 40.) * .25; p.z += cos(uTime * 1.1 + aSeed * 23.) * .25;`,
    frag: `uniform float uFade;
      void main(){ vec2 c = gl_PointCoord - .5; float r = length(c);
        float ring = smoothstep(.5, .44, r) * smoothstep(.3, .46, r) + smoothstep(.16, .0, length(c - vec2(-.14, -.16))) * .9;
        float al = ring * vA * smoothstep(-.1, -1., vY) * uFade * .5;
        gl_FragColor = vec4(vec3(.8, .97, 1.) * al, 1.); }`,
  });

  /* ---------- fish schools (sunlight zone) ---------- */
  function fishGeometry() {
    const body = new THREE.SphereGeometry(1, 10, 6);
    const pos = body.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i), t = (z + 1) / 2; // 0 tail .. 1 head
      const w = 0.2 + 0.8 * Math.sin(Math.PI * Math.pow(t, 0.75));
      pos.setXYZ(i, pos.getX(i) * 0.2 * w, pos.getY(i) * 0.34 * w, z);
    }
    const tail = new THREE.BufferGeometry();
    tail.setAttribute("position", new THREE.BufferAttribute(new Float32Array([0, 0, -0.8, 0, 0.3, -1.42, 0, -0.3, -1.42]), 3));
    tail.setAttribute("normal", new THREE.BufferAttribute(new Float32Array([1, 0, 0, 1, 0, 0, 1, 0, 0]), 3));
    tail.setAttribute("uv", new THREE.BufferAttribute(new Float32Array(6), 2));
    tail.setIndex([0, 1, 2]);
    const g = mergeGeometries([body.toNonIndexed(), tail.toNonIndexed()]);
    g.computeVertexNormals();
    return g;
  }
  const fishGeo = fishGeometry();
  function school({ count, center, rMin, rMax, spread, speed, scale, squash = 0.75 }) {
    const g = new THREE.InstancedBufferGeometry().copy(fishGeo);
    g.instanceCount = count;
    const o = new Float32Array(count * 4), s = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      o[i * 4] = rand(rMin, rMax); o[i * 4 + 1] = rand(-spread, spread); o[i * 4 + 2] = rand(Math.PI * 2);
      o[i * 4 + 3] = speed * rand(0.75, 1.25); s[i] = scale * rand(0.6, 1.3);
    }
    g.setAttribute("aOrbit", new THREE.InstancedBufferAttribute(o, 4));
    g.setAttribute("aScale", new THREE.InstancedBufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({
      side: THREE.DoubleSide, fog: false,
      uniforms: { uTime: G.uTime, uCenter: { value: center }, uSquash: { value: squash }, uFogColor: G.uFogColor, uFogDensity: G.uFogDensity, uCam: G.uCam },
      vertexShader: /* glsl */ `
        attribute vec4 aOrbit; attribute float aScale; uniform float uTime, uSquash; uniform vec3 uCenter, uCam;
        varying vec3 vN; varying float vDist; varying float vBelly; varying vec3 vWp;
        vec3 path(float a){ return vec3(cos(a) * aOrbit.x, aOrbit.y + sin(a * 2. + aOrbit.z * 3.) * 1.6, sin(a) * aOrbit.x * uSquash); }
        void main(){
          float a = aOrbit.z + uTime * aOrbit.w / aOrbit.x * 6.;
          vec3 c = path(a); vec3 f = normalize(path(a + .02) - c);
          vec3 r = normalize(cross(vec3(0.,1.,0.), f)); vec3 u = cross(f, r);
          vec3 p = position * aScale;
          float wig = sin(position.z * 2.6 - uTime * 9. + aOrbit.z * 20.) * .16 * (1. - position.z) * aScale;
          p.x += wig;
          vec3 w = uCenter + c + r * p.x + u * p.y + f * p.z;
          vN = normalize(r * normal.x + u * normal.y + f * normal.z); vBelly = normal.y; vWp = w;
          vec4 mv = viewMatrix * vec4(w, 1.); vDist = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: /* glsl */ `
        varying vec3 vN; varying float vDist, vBelly; varying vec3 vWp; uniform vec3 uCam; ${FOG_PARS}
        void main(){ vec3 n = normalize(vN); if(!gl_FrontFacing) n = -n;
          vec3 V = normalize(uCam - vWp);
          float top = max(dot(n, vec3(0., 1., 0.)), 0.);
          vec3 base = mix(vec3(.7, .9, .95), vec3(.08, .25, .36), smoothstep(-.4, .6, vBelly));
          vec3 col = base * (.5 + top * .9) + vec3(.8, 1., 1.) * pow(max(dot(reflect(-V, n), normalize(vec3(.2, 1., -.3))), 0.), 22.) * .8;
          gl_FragColor = vec4(applyFog(col, vDist), 1.); }`,
    });
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; scene.add(mesh); return mesh;
  }
  const schools = [
    school({ count: lite ? 140 : 340, center: new THREE.Vector3(0, -24, -4), rMin: 7, rMax: 15, spread: 3.2, speed: 0.55, scale: 0.42 }),
    school({ count: lite ? 90 : 220, center: new THREE.Vector3(-9, -41, -16), rMin: 3, rMax: 8, spread: 2.2, speed: -0.5, scale: 0.34, squash: 1 }),
    school({ count: lite ? 60 : 140, center: new THREE.Vector3(14, -58, -20), rMin: 3, rMax: 7, spread: 2, speed: 0.42, scale: 0.3, squash: 0.9 }),
  ];
  updaters.push((t, cam) => { const v = cam.y < 1 && cam.y > -110; schools.forEach((s) => (s.visible = v)); });

  /* ---------- a whale passing in the blue ---------- */
  const whale = new THREE.Group();
  {
    const prof = [];
    for (let i = 0; i <= 26; i++) { const t = i / 26; const r = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.62)), 0.85) * 2.1 * (1 - t * 0.25) + 0.05; prof.push(new THREE.Vector2(r, (t - 0.5) * 24)); }
    const mat = new THREE.MeshStandardMaterial({ color: 0x0c2a3c, roughness: 0.85, metalness: 0 });
    const body = new THREE.Mesh(new THREE.LatheGeometry(prof, 20).rotateX(-Math.PI / 2).scale(1, 0.86, 1), mat);
    whale.add(body);
    const flukeShape = new THREE.Shape();
    flukeShape.moveTo(0, 0); flukeShape.bezierCurveTo(1.2, 0.4, 3.2, -0.2, 4.4, -2.2); flukeShape.bezierCurveTo(2.8, -1.5, 1.2, -1.6, 0, -1.1);
    flukeShape.bezierCurveTo(-1.2, -1.6, -2.8, -1.5, -4.4, -2.2); flukeShape.bezierCurveTo(-3.2, -0.2, -1.2, 0.4, 0, 0);
    const fluke = new THREE.Mesh(new THREE.ExtrudeGeometry(flukeShape, { depth: 0.18, bevelEnabled: false }).rotateX(Math.PI / 2), mat);
    const tail = new THREE.Group(); tail.position.set(0, 0, 11.6); fluke.position.set(0, 0.09, 0.2); tail.add(fluke); whale.add(tail);
    const finShape = new THREE.Shape(); finShape.moveTo(0, 0); finShape.bezierCurveTo(1.6, 0.3, 3.6, -0.6, 4.6, -2.4); finShape.bezierCurveTo(2.8, -1.8, 1, -1.5, 0, -1.3);
    const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.14, bevelEnabled: false }).rotateX(Math.PI / 2);
    const fl = new THREE.Mesh(finGeo, mat); fl.position.set(1.5, -0.9, -4.2); fl.rotation.set(0, 0, -0.5); whale.add(fl);
    const fr = new THREE.Mesh(finGeo, mat); fr.scale.x = -1; fr.position.set(-1.5, -0.9, -4.2); fr.rotation.set(0, 0, 0.5); whale.add(fr);
    whale.userData.tail = tail; whale.userData.fins = [fl, fr];
    scene.add(whale);
  }
  updaters.push((t, cam) => {
    whale.visible = cam.y < -36 && cam.y > -130;
    if (!whale.visible) return;
    const a = t * 0.05 + 3.6;
    whale.position.set(Math.cos(a) * 17, -84 + Math.sin(t * 0.21) * 2.5, -31 + Math.sin(a) * 9);
    whale.rotation.y = -a + Math.PI; whale.rotation.x = Math.sin(t * 0.42) * 0.06;
    whale.userData.tail.rotation.x = Math.sin(t * 0.84) * 0.32;
    whale.userData.fins[0].rotation.z = -0.5 + Math.sin(t * 0.84 + 1) * 0.12; whale.userData.fins[1].rotation.z = 0.5 - Math.sin(t * 0.84 + 1) * 0.12;
  });

  /* ---------- jellyfish (twilight zone) ---------- */
  const bellGeo = new THREE.SphereGeometry(1, 36, 18, 0, Math.PI * 2, 0, Math.PI * 0.56);
  function ribbons(n, len, width, radius) {
    const parts = [];
    for (let i = 0; i < n; i++) {
      const g = new THREE.PlaneGeometry(width, len, 1, 22); g.translate(0, -len / 2, 0);
      const a = (i / n) * Math.PI * 2; g.rotateY(a); g.translate(Math.cos(a) * radius, 0, -Math.sin(a) * radius);
      const ph = new Float32Array(g.attributes.position.count).fill(i * 1.7 + rand(1));
      g.setAttribute("aPh", new THREE.BufferAttribute(ph, 1)); parts.push(g);
    }
    return mergeGeometries(parts);
  }
  const outerGeo = ribbons(12, 4.6, 0.035, 0.86), innerGeo = ribbons(5, 2.6, 0.2, 0.22);
  const jellyVert = /* glsl */ `
    uniform float uTime, uPhase; varying vec3 vN; varying vec3 vWp; varying vec2 vUv; varying float vPulse;
    void main(){ vUv = uv; float pulse = sin(uTime * 1.5 + uPhase); vPulse = pulse;
      float rim = smoothstep(.25, 1., 1. - uv.y);
      vec3 p = position; p.xz *= 1. + pulse * .2 * rim - .06; p.y *= 1. - pulse * .1; p.y -= rim * rim * .22 * (1. + pulse);
      vec4 w = modelMatrix * vec4(p, 1.); vWp = w.xyz; vN = normalize(mat3(modelMatrix) * normal);
      gl_Position = projectionMatrix * viewMatrix * w; }`;
  const jellyFrag = /* glsl */ `
    uniform vec3 uColor, uCam; uniform float uTime, uPhase; varying vec3 vN, vWp; varying vec2 vUv; varying float vPulse; ${FOG_PARS}
    void main(){ vec3 V = normalize(uCam - vWp); vec3 n = normalize(vN); float f = pow(1. - abs(dot(n, V)), 2.2);
      float veins = pow(abs(sin(vUv.x * 6.2832 * 8.)), 14.) * smoothstep(1., .25, vUv.y) * .7;
      float rim = smoothstep(.12, 0., vUv.y) * 1.3;
      float a = (.1 + f * .95 + veins + rim) * (.8 + vPulse * .2);
      vec3 c = mix(uColor, vec3(1.), f * .35 + rim * .25) * a;
      gl_FragColor = vec4(c * (1. - fogAmount(length(uCam - vWp))), 1.); }`;
  const ribbonVert = /* glsl */ `
    attribute float aPh; uniform float uTime, uPhase; varying float vT; varying vec3 vWp;
    void main(){ vec3 p = position; float t = -p.y; vT = t;
      float pulse = sin(uTime * 1.5 + uPhase - t * .7);
      p.x += sin(t * 1.7 - uTime * 1.3 + aPh) * .1 * t; p.z += cos(t * 1.4 - uTime * 1.1 + aPh * 1.3) * .1 * t;
      p.xz *= 1. + pulse * .14 * smoothstep(1.5, 0., t);
      vec4 w = modelMatrix * vec4(p, 1.); vWp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
  const ribbonFrag = /* glsl */ `
    uniform vec3 uColor, uCam; uniform float uLen, uGain; varying float vT; varying vec3 vWp; ${FOG_PARS}
    void main(){ float a = smoothstep(uLen, uLen * .15, vT) * uGain;
      gl_FragColor = vec4(uColor * a * (1. - fogAmount(length(uCam - vWp))), 1.); }`;
  const jellies = [];
  const jellyColors = [0x7fe9ff, 0xff8fd0, 0xb09cff, 0x7dffc8, 0xffb37a];
  const jellyBase = { transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false };
  function jelly(x, y, z, s, colorHex) {
    const color = new THREE.Color(colorHex), phase = rand(10);
    const u = () => ({ uTime: G.uTime, uPhase: { value: phase }, uColor: { value: color }, uCam: G.uCam, uFogColor: G.uFogColor, uFogDensity: G.uFogDensity });
    const grp = new THREE.Group();
    grp.add(new THREE.Mesh(bellGeo, new THREE.ShaderMaterial({ ...jellyBase, uniforms: u(), vertexShader: jellyVert, fragmentShader: jellyFrag })));
    const o = new THREE.Mesh(outerGeo, new THREE.ShaderMaterial({ ...jellyBase, uniforms: { ...u(), uLen: { value: 4.6 }, uGain: { value: 0.55 } }, vertexShader: ribbonVert, fragmentShader: ribbonFrag }));
    const inn = new THREE.Mesh(innerGeo, new THREE.ShaderMaterial({ ...jellyBase, uniforms: { ...u(), uLen: { value: 2.6 }, uGain: { value: 0.3 } }, vertexShader: ribbonVert, fragmentShader: ribbonFrag }));
    o.position.y = inn.position.y = 0.42; grp.add(o, inn);
    grp.position.set(x, y, z); grp.scale.setScalar(s);
    grp.userData = { base: new THREE.Vector3(x, y, z), phase, tilt: rand(-0.25, 0.25) };
    grp.traverse((m) => (m.frustumCulled = false));
    scene.add(grp); jellies.push(grp);
  }
  // a few close "hero" jellies along the path, then a wider field
  jelly(5.5, -66, -9, 1.5, 0x7fe9ff); jelly(-7, -82, -12, 1.9, 0xff8fd0); jelly(6.5, -101, -8, 1.3, 0xb09cff);
  jelly(-5, -117, -10, 1.6, 0x7dffc8); jelly(9, -132, -13, 2.1, 0xff8fd0);
  for (let i = 0; i < (lite ? 8 : 20); i++) {
    const a = rand(Math.PI * 2), d = rand(13, 36);
    jelly(Math.cos(a) * d, rand(-150, -56), Math.sin(a) * d - 8, rand(0.6, 1.7), jellyColors[i % jellyColors.length]);
  }
  // deeper, sparser, colder: company for the midnight zone
  const deepColors = [0x4fe3ff, 0x6d8dff, 0x6dffb8, 0xc08bff];
  [[8, -158, -11, 1.7], [-9, -181, -14, 2.2], [10, -203, -12, 1.4], [7, -226, -10, 1.9], [-8, -247, -15, 2.4]].forEach(([x, y, z, sc], i) => jelly(x, y, z, sc, deepColors[i % 4]));
  for (let i = 0; i < (lite ? 4 : 10); i++) {
    const a = rand(Math.PI * 2), d = rand(15, 34);
    jelly(Math.cos(a) * d, rand(-258, -152), Math.sin(a) * d - 8, rand(0.7, 1.8), deepColors[i % 4]);
  }
  updaters.push((t, cam) => {
    const vis = cam.y < -28 && cam.y > -290;
    for (const j of jellies) {
      j.visible = vis && Math.abs(j.userData.base.y - cam.y) < 55;
      if (!j.visible) continue;
      const ph = j.userData.phase;
      j.position.y = j.userData.base.y + Math.sin(t * 0.3 + ph) * 1.1 + (Math.sin(t * 1.5 + ph) * 0.5 + 0.5) * 0.25;
      j.position.x = j.userData.base.x + Math.sin(t * 0.17 + ph * 2) * 0.9;
      j.rotation.z = j.userData.tilt + Math.sin(t * 0.4 + ph) * 0.12; j.rotation.x = Math.cos(t * 0.33 + ph) * 0.1;
    }
  });

  /* ---------- midnight zone: glowing strands and a bioluminescent field ---------- */
  const strands = new THREE.Group();
  const strandMat = (color, seed) => new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
    uniforms: { uTime: G.uTime, uColor: { value: new THREE.Color(color) }, uSeed: { value: seed }, uCam: G.uCam, uFogColor: G.uFogColor, uFogDensity: G.uFogDensity },
    vertexShader: `varying vec2 vUv; varying vec3 vWp; uniform float uTime, uSeed;
      void main(){ vUv = uv; vec3 p = position; p.x += sin(p.y * .13 + uTime * .3 + uSeed) * 1.2; p.z += cos(p.y * .11 + uTime * .25 + uSeed * 2.) * 1.2;
        vec4 w = modelMatrix * vec4(p, 1.); vWp = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `varying vec2 vUv; varying vec3 vWp; uniform float uTime, uSeed; uniform vec3 uColor, uCam; ${FOG_PARS}
      void main(){ float u = vUv.x * 46.;
        float beads = pow(.5 + .5 * sin(u * 6.2832), 6.);
        float pulse = pow(.5 + .5 * sin(vUv.x * 30. - uTime * 1.4 + uSeed), 18.) * 4.;
        float a = (.06 + beads * .3 + pulse) * smoothstep(0., .08, vUv.x) * smoothstep(1., .92, vUv.x);
        gl_FragColor = vec4(uColor * a * (1. - fogAmount(length(uCam - vWp))), 1.); }`,
  });
  const strandColors = [0x4fe3ff, 0x6dffb8, 0x6d8dff, 0xff9d5c, 0x4fe3ff, 0xc08bff, 0x6dffb8];
  for (let i = 0; i < (lite ? 4 : 7); i++) {
    const a = (i / 7) * Math.PI * 2 + 0.5, d = rand(12, 24), pts = [];
    for (let k = 0; k <= 9; k++) pts.push(new THREE.Vector3(Math.cos(a) * d + rand(-3, 3), -128 - k * 16, Math.sin(a) * d - 9 + rand(-3, 3)));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 0.05, 5, false), strandMat(strandColors[i], i * 3.1));
    tube.frustumCulled = false; strands.add(tube);
  }
  scene.add(strands);

  const bioCount = lite ? 700 : 1900;
  const bioGeo = new THREE.BufferGeometry();
  {
    const p = new Float32Array(bioCount * 3), c = new Float32Array(bioCount * 3), s = new Float32Array(bioCount);
    const pal = [0x4fe3ff, 0x6dffb8, 0x5d7dff, 0x4fe3ff, 0xffa25c, 0xc08bff].map((h) => new THREE.Color(h));
    for (let i = 0; i < bioCount; i++) {
      const cl = Math.random() < 0.6; const a = rand(Math.PI * 2); const d = cl ? rand(4, 16) : rand(10, 46);
      p[i * 3] = Math.cos(a) * d; p[i * 3 + 1] = rand(-322, -124); p[i * 3 + 2] = Math.sin(a) * d - 8;
      const col = pal[(Math.random() * pal.length) | 0]; c[i * 3] = col.r; c[i * 3 + 1] = col.g; c[i * 3 + 2] = col.b; s[i] = Math.random();
    }
    bioGeo.setAttribute("position", new THREE.BufferAttribute(p, 3)); bioGeo.setAttribute("color", new THREE.BufferAttribute(c, 3)); bioGeo.setAttribute("aSeed", new THREE.BufferAttribute(s, 1));
  }
  const bio = new THREE.Points(bioGeo, new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, vertexColors: true,
    uniforms: { uTime: G.uTime, uPointScale: G.uPointScale, uFogDensity: G.uFogDensity },
    vertexShader: `attribute float aSeed; uniform float uTime, uPointScale, uFogDensity; varying vec3 vC; varying float vA;
      void main(){ vec3 p = position; p.x += sin(uTime * .3 + aSeed * 40.) * .8; p.y += sin(uTime * .22 + aSeed * 70.) * .8; p.z += cos(uTime * .27 + aSeed * 55.) * .8;
        vec4 mv = modelViewMatrix * vec4(p, 1.); float d = -mv.z; gl_Position = projectionMatrix * mv;
        float tw = pow(.5 + .5 * sin(uTime * (.6 + aSeed * 2.) + aSeed * 100.), 3.);
        gl_PointSize = (.12 + aSeed * .3) * uPointScale / max(d, .1);
        vA = (.15 + tw) * exp(-uFogDensity * uFogDensity * d * d) * smoothstep(.5, 3., d); vC = color; }`,
    fragmentShader: `varying vec3 vC; varying float vA; void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., r); a = a * a * a + smoothstep(.12, 0., r);
      gl_FragColor = vec4(vC * a * vA, 1.); }`,
  }));
  bio.frustumCulled = false; scene.add(bio);
  updaters.push((t, cam) => { const v = cam.y < -95; strands.visible = v && cam.y > -300; bio.visible = v; });

  /* ---------- abyssal zone: a living network (the skills graph) ---------- */
  const net = new THREE.Group();
  {
    const N = lite ? 60 : 110, nodes = [];
    for (let i = 0; i < N; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(Math.cbrt(Math.random()) * 15); v.y *= 0.75; nodes.push(v);
    }
    const lp = [], lu = [];
    for (let i = 0; i < N; i++) {
      const near = nodes.map((n, j) => [n.distanceTo(nodes[i]), j]).sort((a, b) => a[0] - b[0]).slice(1, 4);
      for (const [d, j] of near) if (j > i || near.length) { lp.push(...nodes[i].toArray(), ...nodes[j].toArray()); lu.push(0, i * 0.37, 1, i * 0.37); }
    }
    const lg = new THREE.BufferGeometry();
    lg.setAttribute("position", new THREE.Float32BufferAttribute(lp, 3)); lg.setAttribute("aU", new THREE.Float32BufferAttribute(lu, 2));
    const lines = new THREE.LineSegments(lg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: G.uTime, uCam: G.uCam, uFogColor: G.uFogColor, uFogDensity: G.uFogDensity },
      vertexShader: `attribute vec2 aU; varying vec2 vU; varying float vD; void main(){ vU = aU; vec4 mv = modelViewMatrix * vec4(position,1.); vD = -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `varying vec2 vU; varying float vD; uniform float uTime; ${FOG_PARS}
        void main(){ float p = pow(.5 + .5 * sin((vU.x - uTime * .35 - vU.y) * 6.2832), 24.);
          vec3 c = vec3(.1, .5, .62) * .32 + vec3(.5, 1., .9) * p * 1.6; gl_FragColor = vec4(c * (1. - fogAmount(vD)), 1.); }`,
    }));
    const ng = new THREE.BufferGeometry().setFromPoints(nodes);
    ng.setAttribute("aSeed", new THREE.Float32BufferAttribute(nodes.map(() => Math.random()), 1));
    const dots = new THREE.Points(ng, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: G.uTime, uPointScale: G.uPointScale, uFogDensity: G.uFogDensity },
      vertexShader: `attribute float aSeed; uniform float uTime, uPointScale, uFogDensity; varying float vA; varying float vS;
        void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); float d = -mv.z; gl_Position = projectionMatrix * mv;
          gl_PointSize = (.35 + aSeed * .5) * uPointScale / max(d, .1); vS = aSeed;
          vA = (.6 + .4 * sin(uTime * 1.3 + aSeed * 30.)) * exp(-uFogDensity * uFogDensity * d * d); }`,
      fragmentShader: `varying float vA, vS; void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., r); a = a*a*a*.8 + smoothstep(.1, 0., r) * 1.4;
        vec3 c = mix(vec3(.3, .95, 1.), vec3(.5, 1., .7), vS); gl_FragColor = vec4(c * a * vA, 1.); }`,
    }));
    lines.frustumCulled = dots.frustumCulled = false;
    net.add(lines, dots); net.position.set(9, -292, -24); scene.add(net);
  }
  updaters.push((t, cam) => { net.visible = cam.y < -225 && cam.y > -345; net.rotation.y = t * 0.05; net.rotation.x = Math.sin(t * 0.07) * 0.2; });

  /* ---------- the trench floor ---------- */
  const floorH = (x, z) => {
    const n = Math.sin(x * 0.05 + 1.3) * Math.cos(z * 0.045) * 3.2 + Math.sin(x * 0.13 + z * 0.09) * 1.1 + Math.sin(x * 0.31 - z * 0.27) * 0.35 + Math.cos(z * 0.5 + x * 0.21) * 0.16;
    const ridge = Math.pow(smooth(18, 90, Math.hypot(x, z + 10)), 1.5) * 16;
    return SEABED_Y + n * smooth(4, 22, Math.hypot(x, z)) + ridge;
  };
  const seabed = new THREE.Group();
  {
    const g = new THREE.PlaneGeometry(260, 260, lite ? 90 : 170, lite ? 90 : 170).rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, floorH(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
    const ground = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x4a4038, roughness: 1, metalness: 0 }));
    seabed.add(ground);

    const rockGeo = new THREE.IcosahedronGeometry(1, 1);
    const rp = rockGeo.attributes.position;
    for (let i = 0; i < rp.count; i++) { const v = new THREE.Vector3().fromBufferAttribute(rp, i); const k = 1 + Math.sin(v.x * 5.1 + v.y * 3.3) * 0.16 + Math.cos(v.z * 4.7) * 0.12; rp.setXYZ(i, v.x * k, v.y * k * 0.7, v.z * k); }
    rockGeo.computeVertexNormals();
    const rocks = new THREE.InstancedMesh(rockGeo, new THREE.MeshStandardMaterial({ color: 0x3a342f, roughness: 1, flatShading: true }), lite ? 70 : 170);
    const dm = new THREE.Object3D();
    for (let i = 0; i < rocks.count; i++) {
      const a = rand(Math.PI * 2), d = rand(4, 70); const x = Math.cos(a) * d, z = Math.sin(a) * d - 6; const s = rand(0.15, 1.5) * (Math.random() < 0.1 ? 2.4 : 1);
      dm.position.set(x, floorH(x, z) + s * 0.2, z); dm.rotation.set(rand(3), rand(3), rand(3)); dm.scale.setScalar(s); dm.updateMatrix(); rocks.setMatrixAt(i, dm.matrix);
    }
    seabed.add(rocks);

    // hydrothermal vents: chimneys, a warm glow, and a rising plume
    const ventSpots = [[8.5, -19, 1.25], [12.5, -24, 0.9], [5.5, -27, 0.75], [-15, -32, 1.1]];
    const chimMat = new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 1, flatShading: true, emissive: 0xff5a1a, emissiveIntensity: 0.0 });
    const tips = [];
    ventSpots.forEach(([x, z, s], vi) => {
      const y0 = floorH(x, z) - 0.4;
      for (let k = 0; k < 3; k++) {
        const h = (k === 0 ? 5.2 : rand(1.8, 3.4)) * s, r = (k === 0 ? 0.8 : 0.5) * s;
        const cg = new THREE.CylinderGeometry(r * 0.38, r, h, 9, 7, true); const cp = cg.attributes.position;
        for (let i = 0; i < cp.count; i++) { const yy = cp.getY(i); const w = 1 + Math.sin(yy * 3.1 + i) * 0.13 + Math.sin(yy * 7 + vi) * 0.08; cp.setX(i, cp.getX(i) * w); cp.setZ(i, cp.getZ(i) * w); }
        cg.computeVertexNormals();
        const ox = k === 0 ? 0 : rand(-1.2, 1.2) * s, oz = k === 0 ? 0 : rand(-1.2, 1.2) * s;
        const c = new THREE.Mesh(cg, chimMat); c.position.set(x + ox, y0 + h / 2, z + oz); c.rotation.z = rand(-0.08, 0.08); seabed.add(c);
        if (k === 0) tips.push(new THREE.Vector3(x, y0 + h, z));
      }
      const l = new THREE.PointLight(0xff6a22, 38 * s, 24, 1.8); l.position.set(x, y0 + 5.6 * s, z + 0.6); seabed.add(l);
      l.userData.base = 38 * s; (seabed.userData.lights ||= []).push(l);
    });
    // plume particles
    const per = lite ? 110 : 240, pc = tips.length * per;
    const pg = new THREE.BufferGeometry(); const pp = new Float32Array(pc * 3), ps = new Float32Array(pc);
    tips.forEach((tp, i) => { for (let k = 0; k < per; k++) { const j = i * per + k; pp[j * 3] = tp.x; pp[j * 3 + 1] = tp.y; pp[j * 3 + 2] = tp.z; ps[j] = Math.random(); } });
    pg.setAttribute("position", new THREE.BufferAttribute(pp, 3)); pg.setAttribute("aSeed", new THREE.BufferAttribute(ps, 1));
    const plume = new THREE.Points(pg, new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false,
      uniforms: { uTime: G.uTime, uPointScale: G.uPointScale },
      vertexShader: `attribute float aSeed; uniform float uTime, uPointScale; varying float vL; varying float vS;
        void main(){ float life = fract(uTime * (.07 + aSeed * .05) + aSeed * 17.); vL = life; vS = aSeed;
          vec3 p = position; float sp = life * life * 3.2 + life * .5;
          p.y += life * 15.; p.x += (sin(aSeed * 91.) * sp) + sin(uTime * .8 + aSeed * 30. + life * 6.) * .35 * life + life * life * 2.;
          p.z += (cos(aSeed * 57.) * sp) + cos(uTime * .7 + aSeed * 44. + life * 5.) * .35 * life;
          vec4 mv = modelViewMatrix * vec4(p, 1.); gl_Position = projectionMatrix * mv;
          gl_PointSize = (.5 + life * 3.2) * (.5 + aSeed) * uPointScale / max(-mv.z, .1); }`,
      fragmentShader: `varying float vL, vS; void main(){ float r = length(gl_PointCoord - .5); float a = smoothstep(.5, 0., r); a *= a;
        vec3 hot = vec3(1., .5, .14), smoke = vec3(.035, .04, .05);
        vec3 c = mix(hot * 1.5, smoke, smoothstep(0., .3, vL));
        gl_FragColor = vec4(c * a * smoothstep(0., .04, vL) * smoothstep(1., .5, vL) * .6, 1.); }`,
    }));
    plume.frustumCulled = false; seabed.add(plume);

    // the beacon: something left at the bottom, still signalling
    const bx = 4.4, bz = -11.5, by = floorH(bx, bz);
    const metal = new THREE.MeshStandardMaterial({ color: 0x1b2126, roughness: 0.5, metalness: 0.8 });
    const beacon = new THREE.Group(); beacon.position.set(bx, by, bz);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.4, 8), metal); pole.position.y = 1.7; beacon.add(pole);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.8, 0.35, 6), metal); foot.position.y = 0.1; beacon.add(foot);
    [1.1, 2.1].forEach((h) => { const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.035, 6, 16), metal); ring.rotation.x = Math.PI / 2; ring.position.y = h; beacon.add(ring); });
    const lampMat = new THREE.MeshBasicMaterial({ color: 0x8ffcff });
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), lampMat); lamp.position.y = 3.55; beacon.add(lamp);
    const bl = new THREE.PointLight(0x5ef2ff, 30, 30, 1.6); bl.position.y = 3.6; beacon.add(bl);
    // expanding signal rings
    const ringMat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false, uniforms: { uTime: G.uTime },
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
      fragmentShader: `varying vec2 vUv; uniform float uTime; void main(){ float r = length(vUv - .5) * 2.; float a = 0.;
        for(int i = 0; i < 3; i++){ float ph = fract(uTime * .22 + float(i) / 3.); a += smoothstep(.012, 0., abs(r - ph)) * (1. - ph) * (1. - ph); }
        gl_FragColor = vec4(vec3(.37, .95, 1.) * a * .8, 1.); }` });
    const sig = new THREE.Mesh(new THREE.PlaneGeometry(26, 26), ringMat); sig.rotation.x = -Math.PI / 2; sig.position.y = 0.5; beacon.add(sig);
    seabed.add(beacon); seabed.userData.beacon = { lampMat, bl };
    scene.add(seabed);
  }
  updaters.push((t, cam) => {
    seabed.visible = cam.y < -295;
    if (!seabed.visible) return;
    const k = 0.5 + 0.5 * Math.sin(t * 2.2), b = seabed.userData.beacon;
    b.bl.intensity = 14 + 55 * Math.pow(k, 6); b.lampMat.color.setRGB(0.25 + 2.6 * Math.pow(k, 6), 1.5 + 2.5 * Math.pow(k, 6), 1.7 + 2.5 * Math.pow(k, 6));
    seabed.userData.lights.forEach((l, i) => (l.intensity = l.userData.base * (0.8 + 0.2 * Math.sin(t * 3.1 + i * 2) + 0.1 * Math.sin(t * 7.7 + i))));
  });

  /* ---------- lights ---------- */
  const hemi = new THREE.HemisphereLight(0x9fdcff, 0x06202e, 1); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xbfefff, 1.4); sun.position.set(0.2, 1, -0.3); scene.add(sun);
  const head = new THREE.SpotLight(0xdff6ff, 0, 60, 0.62, 0.7, 1.35); // the submersible's lamp
  head.position.set(0.6, -0.5, 0.2); head.target.position.set(0, -0.6, -10); camera.add(head, head.target);

  /* ---------- post ---------- */
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.7, 0.7, 0.72);
  if (!lite) composer.addPass(bloom);
  const lens = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uTime: { value: 0 }, uUnder: { value: 0 }, uSplash: { value: 0 }, uSpeed: { value: 0 }, uAspect: { value: 1 }, uVig: { value: 0.5 } },
    vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse; uniform float uTime, uUnder, uSplash, uSpeed, uAspect, uVig; varying vec2 vUv; ${NOISE}
      void main(){
        vec2 uv = vUv; vec2 c = uv - .5;
        // water refraction wobble, stronger right at the waterline
        float w = uUnder * .0022 + uSplash * .03;
        uv += vec2(sin(uv.y * 26. + uTime * 1.6), cos(uv.x * 22. + uTime * 1.3)) * w;
        // speed: pull the edges outward a little while descending fast
        uv += c * dot(c, c) * (-.06 * uSpeed);
        float ca = (.0009 + uSpeed * .004 + uSplash * .01) * (.4 + dot(c, c) * 4.);
        vec3 col = vec3(texture2D(tDiffuse, uv + c * ca).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - c * ca).b);
        // foam and bubbles as the camera breaks the surface
        float foam = vnoise(vec2(uv.x * uAspect * 9., uv.y * 9. + uTime * 3.)) * vnoise(vec2(uv.x * uAspect * 31., uv.y * 31. - uTime * 5.));
        col = mix(col, vec3(.85, .97, 1.), clamp(uSplash * (.35 + foam * 2.2), 0., 1.) * .85);
        float v = smoothstep(.95, .25, length(c * vec2(1., 1.15)));
        col *= mix(1., v, uVig);
        col += (hash21(uv * vec2(1920., 1080.) + fract(uTime) * 100.) - .5) * .028;
        gl_FragColor = vec4(col, 1.);
      }`,
  });
  composer.addPass(lens);
  composer.addPass(new OutputPass());

  /* ---------- frame ---------- */
  const state = { y: 2.4, pitch: 0, yaw: 0, speed: 0, mx: 0, my: 0, smx: 0, smy: 0, lastY: 2.4, time: 0 };
  const fogCol = new THREE.Color();

  function sampleFog(y) {
    if (y >= STOPS[0].y) return [STOPS[0].c, STOPS[0].d];
    for (let i = 1; i < STOPS.length; i++) {
      if (y >= STOPS[i].y) { const a = STOPS[i - 1], b = STOPS[i], t = (a.y - y) / (a.y - b.y); fogCol.copy(a.c).lerp(b.c, t); return [fogCol, lerp(a.d, b.d, t)]; }
    }
    const l = STOPS[STOPS.length - 1]; return [l.c, l.d];
  }

  function resize() {
    const w = canvas.clientWidth || window.innerWidth, h = canvas.clientHeight || window.innerHeight;
    renderer.setSize(w, h, false); composer.setSize(w, h);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 68 : 52; // wider on portrait screens
    camera.updateProjectionMatrix();
    G.uPointScale.value = (h * renderer.getPixelRatio()) / (2 * Math.tan((camera.fov * Math.PI) / 360)) ;
    lens.uniforms.uAspect.value = w / h;
  }

  function render(dt) {
    state.time += dt; const t = state.time; G.uTime.value = t; lens.uniforms.uTime.value = t;
    state.smx = lerp(state.smx, state.mx, 1 - Math.exp(-dt * 3)); state.smy = lerp(state.smy, state.my, 1 - Math.exp(-dt * 3));
    G.uMouse.value.set(state.mx, state.my);

    const y = state.y, under = y < 0;
    const bob = under ? Math.sin(t * 0.5) * 0.12 : Math.sin(t * 0.8) * 0.06;
    camera.position.set(Math.sin(t * 0.13) * 0.35 + state.smx * 0.5, y + bob, Math.cos(t * 0.11) * 0.25);
    camera.rotation.set(state.pitch + state.smy * 0.05 + Math.sin(t * 0.31) * 0.008, state.yaw - state.smx * 0.085, Math.sin(t * 0.23) * 0.012 * (under ? 1 : 0.3));

    const vel = (y - state.lastY) / Math.max(dt, 1e-3); state.lastY = y;
    state.speed = lerp(state.speed, clamp(Math.abs(vel) / 60, 0, 1), 1 - Math.exp(-dt * 5));

    const [fc, fd] = sampleFog(y);
    scene.fog.color.copy(fc); scene.fog.density = fd; G.uFogDensity.value = fd; scene.background.copy(fc);
    sky.visible = !under; sky.position.copy(camera.position);
    water.visible = y > -70; water.position.set(camera.position.x, 0, camera.position.z);

    const deep = smooth(-70, -170, y);
    snow.material.uniforms.uBio.value = deep;
    bubbles.material.uniforms.uFade.value = smooth(-90, -20, y); bubbles.visible = y > -90 && under;
    snow.visible = y < 1.5;

    hemi.intensity = under ? lerp(1.5, 0.05, smooth(-5, -150, y)) : 1.2;
    sun.intensity = under ? lerp(1.6, 0, smooth(-5, -120, y)) : 1.2;
    head.intensity = lerp(0, 520, smooth(-90, -180, y));

    lens.uniforms.uUnder.value = under ? 1 : 0;
    lens.uniforms.uSplash.value = Math.exp(-Math.pow((y + 0.25) / 0.7, 2));
    lens.uniforms.uSpeed.value = state.speed;
    lens.uniforms.uVig.value = under ? lerp(0.45, 0.8, deep) : 0.35;
    bloom.strength = under ? lerp(0.55, 0.95, deep) : 0.5;
    bloom.threshold = under ? lerp(0.8, 0.3, deep) : 0.82;

    for (const u of updaters) u(t, camera.position);
    composer.render(dt);
  }

  resize();
  return {
    state, render, resize,
    setPointer(x, y) { state.mx = x; state.my = y; },
    dispose() { renderer.dispose(); disposables.forEach((d) => d.dispose()); },
  };
}
