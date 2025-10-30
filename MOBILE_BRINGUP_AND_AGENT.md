# Mobile Bring‑Up & Continuous FPS Guard — Three.js/R3F

**Owner:** Andrew  
**Mission:** Mobile works **reliably** on real devices with smooth UX (target 50–60 FPS), **no crashes**, and a **gradual feature ladder** that re‑enables shadows/FX only when budget allows. Includes a Claude Code terminal agent to automate checks and fixes.

---

## 0) Non‑negotiable targets
- **Boot reliability:** no WebGL context loss on first load; no fatal errors in console.
- **FPS floor:** ≥ **50 FPS** on mid‑tier mobile; brief dips allowed during scene swaps.
- **Memory safety:** textures ≤ 1024 on mobile by default; DPR hard cap 1.0 on iOS.
- **Network budget:** initial payload ≤ **6–8 MB** gz (scripts+assets) for first interactive paint; heavy assets lazy‑loaded.
- **Feature gating:** shadows/AO/Bloom **off by default** on mobile; agent decides when to enable.

> We do **real** device tests: Android via Chrome Remote Debugging (USB), iOS via Safari Web Inspector (macOS) **or** real‑device cloud (e.g., BrowserStack). Emulated Device Toolbar alone is **not** sufficient.

---

## 1) Perf flags & feature ladder
Create `src/config/PerfFlags.ts`:
```ts
export const PerfFlags = {
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
  isMobileUA: /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent),
  DPRCapMobile: 1.0,        // iOS hard cap
  anisotropyMobile: 2,
  maxTexSizeMobile: 1024,
  shadowsMobile: false,     // default OFF; agent may raise
  aoMobile: false,
  bloomMobile: false,
  hdriOnBootMobile: false,  // start LDR skybox; swap later if safe
  powerPreference: 'low-power',
};
```

**Renderer init (`utils/makeRenderer.ts`):**
```ts
const renderer = new THREE.WebGLRenderer({
  canvas,
  alpha: false,
  antialias: false,
  powerPreference: PerfFlags.powerPreference,
  preserveDrawingBuffer: false,
});
const DPR = PerfFlags.isMobileUA ? PerfFlags.DPRCapMobile : Math.min(1.5, window.devicePixelRatio);
renderer.setPixelRatio(DPR);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;

function resize() {
  const w = Math.floor(window.innerWidth);
  const h = Math.floor(window.innerHeight);
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => requestAnimationFrame(resize), { passive: true });
resize();
```

**Effects gating (`scene/Effects.tsx`):**
```tsx
if (PerfFlags.isMobileUA) {
  return null; // tone mapping only via renderer
}
return (
  <EffectComposer>
    {/* AO/Bloom for desktop; agent can toggle on mobile later */}
  </EffectComposer>
);
```

**Lighting ladder (`scene/Lighting.tsx`):**
```ts
if (!PerfFlags.isMobileUA) {
  dirLight.castShadow = true;
  dirLight.shadow.mapSize.set(4096, 4096);
}
// Agent can promote: set shadows on mobile with 1024 map when budget allows.
```

**Material slimming hook (run once per mesh):**
```ts
if (PerfFlags.isMobileUA) {
  const m = mat as THREE.MeshStandardMaterial;
  [m.normalMap, m.roughnessMap, m.metalnessMap].forEach((t) => { if (t) t.dispose(); });
  m.normalMap = m.roughnessMap = m.metalnessMap = null as any;
  m.envMapIntensity = 0.6; m.needsUpdate = true;
}
```

**Context‑loss safety:**
```ts
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
canvas.addEventListener('webglcontextrestored', () => { location.reload(); });

document.addEventListener('visibilitychange', () => {
  if (document.hidden) renderer.setAnimationLoop(null);
  else renderer.setAnimationLoop(render);
}, { passive: true });
```

---

## 2) Asset & build budgets
- **Textures:** ship 512–1024px for mobile variants; limit anisotropy to 2.
- **HDRI:** mobile boots with **LDR JPG sky (512–1024px)**; optionally swap to 1–2k HDRI *after* stable FPS.
- **Geometry:** enforce LOD or decimate meshes > 50k verts on mobile.
- **Code target:** in `vite.config.ts` set `target: 'safari14'`, `cssTarget: 'safari14'`.
- **Initial bundle:** keep JS < 300–400 KB gz when possible; lazy‑load heavy routes/sidebars.

---

## 3) Runtime governors (auto‑adapt)
Add `src/runtime/Governor.ts` and run it each frame on mobile:
```ts
export function govern(renderer: THREE.WebGLRenderer, stats?: { fps: number }) {
  const info = renderer.info.render;
  // Draw call guardrails
  if (info.calls > 250) {
    // e.g., hide distant groups / reduce instancing density / LOD step
    window.dispatchEvent(new CustomEvent('perf/dropLevel'));
  }
  // FPS guardrails
  if (stats && stats.fps < 50) {
    window.dispatchEvent(new CustomEvent('perf/lowFps'));
  }
}
```
In listeners for `perf/*` events, gradually disable optional features (post‑FX, far meshes, reflections) **before** touching DPR.

---

## 4) Real‑device test matrix (run every PR)
**Android (Windows/macOS):**
1. Enable Developer Options + USB debugging.
2. Connect USB → Desktop Chrome `chrome://inspect/#devices` → open your site.
3. Verify FPS (use stats pane or custom meter), watch for GL errors.

**iOS (macOS):**
1. iPhone Settings → Safari → Advanced → **Web Inspector** ON.
2. Plug into Mac → Safari menu **Develop → [iPhone] → Your page** → inspect console/network/GL.

**iOS (no Mac):**
- Use a real‑device cloud (e.g., BrowserStack). Point it at a **Vercel preview URL** or tunnel your localhost (e.g., `npx localtunnel --port 5173`). Validate FPS qualitatively and error‑free boot.

**What to record each run:** device model, OS, browser, first‑interactive time, steady‑state FPS, `renderer.info.render` (calls, triangles), and total texture memory estimate.

---

## 5) CI hooks (automated “don’t regress”)
Add npm scripts:
```json
{
  "scripts": {
    "preflight:mobile": "tsc --noEmit && vite build",
    "analyze:bundle": "vite-bundle-visualizer --open=false",
    "lint": "eslint .",
    "test:smoke": "playwright test --project='Mobile WebKit' || true"
  }
}
```
- **Smoke tests** use Playwright’s Mobile WebKit project for basic navigation (not a replacement for real devices but catches obvious breakage). Gate merges on `preflight:mobile` + `lint`; keep `test:smoke` informative.

---

## 6) Caching & deploy sanity for Vercel
- Version static assets with hashes; set `Cache-Control: public, max-age=31536000, immutable` for hashed assets; short cache for HTML.
- Keep initial HTML lean; defer heavy assets behind interaction.
- Confirm preview build size and first‑interactive payload per PR.

---

## 7) Live log capture (for agent)
Create a tiny log bridge so browser errors stream to a file the agent watches.

**`tools/log-server.mjs`**
```js
import http from 'http'; import fs from 'fs';
const LOG = './browser.log';
http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/log') {
    let body=''; req.on('data', c => body+=c);
    req.on('end', ()=>{ try{ fs.appendFileSync(LOG, body.trim()+"\n"); }catch{}; res.writeHead(204); res.end(); });
  } else { res.writeHead(200); res.end('ok'); }
}).listen(4545,'127.0.0.1',()=>console.log('log-server 127.0.0.1:4545'));
```

**`src/util/log-bridge.ts`** (import once in app root)
```ts
(function(){
  const ENDPOINT='http://127.0.0.1:4545/log';
  const send=(p:any)=>{ try{ navigator.sendBeacon?.(ENDPOINT,new Blob([JSON.stringify(p)],{type:'application/json'}))||
    fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(p),keepalive:true}); }catch{} };
  const wrap=(level:'log'|'warn'|'error'|'info'|'debug')=>{
    const orig=(console as any)[level];
    (console as any)[level]=(...args:any[])=>{ try{ send({t:Date.now(),level,args:args.map(a=>toS(a))}); }catch{}; orig.apply(console,args); };
  };
  ['log','warn','error','info','debug'].forEach(wrap);
  window.addEventListener('error',e=>send({t:Date.now(),level:'error',msg:e.message,stack:(e as any).error?.stack,src:e.filename,line:e.lineno,col:e.colno}));
  window.addEventListener('unhandledrejection',(e:any)=>send({t:Date.now(),level:'error',rej:toS(e.reason)}));
  function toS(x:any){ try{return typeof x==='string'?x:JSON.stringify(x);}catch{return String(x);} }
})();
```

Run:
```bash
node tools/log-server.mjs
# start dev server normally; logs stream into browser.log
```

---

## 8) Claude Code — Terminal Agent (drop‑in prompt)
Use this **system prompt** for Claude Code in your terminal session:

**`/prompts/agent-mobile-guardian.system.txt`**
```
You are the **Mobile Guardian Agent** for a Three.js/React-Three-Fiber project.
Objectives:
1) Ensure mobile reliability (no boot errors, no WebGL context loss).
2) Keep steady-state FPS ≥ 50 on real devices by enforcing budgets and runtime governors.
3) Re-enable visual features (shadows, AO, Bloom, HDRI) progressively only when budgets allow.

Authority:
- You may read and modify source files, create new modules, and propose diffs.
- When enabling features, always include a rollback path and a measurable gate (fps, drawCalls).

Constraints & Budgets:
- DPR on iOS ≤ 1.0; mobile texture max 1024; anisotropy 2.
- Initial interactive payload ≤ 6–8 MB gz.
- Draw calls steady-state ≤ 250 on mobile. Triangles budget target ≤ 500k.

Behavior:
- Work in small PR-sized steps. After each change, run the local dev server and tail `browser.log`.
- If `browser.log` shows errors or FPS < 50, revert the last feature and recommend asset/layout changes.
- Prefer code changes that move work from shaders to textures and from runtime to pre-baked data.
- Never enable multiple expensive features in one step.
```

Use this **user prompt** to start a session:

**`/prompts/agent-mobile-guardian.user.txt`**
```
Context:
- Repo is open in this workspace.
- We have `src/config/PerfFlags.ts`, `utils/makeRenderer.ts`, `scene/Effects.tsx`, `scene/Lighting.tsx`.
- A local log bridge writes runtime logs to `browser.log`.

Tasks:
1) Scan the codebase. Ensure all mobile defaults match PerfFlags above.
2) Add `src/runtime/Governor.ts` and wire it so it runs every frame on mobile.
3) Implement event listeners for `perf/dropLevel` and `perf/lowFps` to progressively:
   a) hide distant groups / swap LOD,
   b) disable reflections/postFX,
   c) finally reduce per-material map usage if still necessary.
4) Add a CLI task `npm run mobile:preflight` to run `tsc --noEmit`, build, and report bundle size.
5) Start the dev server, instruct me to test on **real mobile** (Android USB or iOS) and interact for 30s.
6) Tail `browser.log`. If errors or `fps < 50`, propose and apply the smallest safe code diff.
7) If FPS is stable for 30s, propose enabling **shadows** on mobile with conservative settings (shadowMap 1024, single key light, bias tuned). Re-test; if FPS holds, gate AO.
8) Produce a final summary: FPS, draw calls, triangle count, assets enabled, diffs applied.

Rules:
- Always print diffs in unified format.
- Ask only for data you cannot obtain yourself (device model, observed FPS).
- Never enable two heavy features at once.
```

---

## 9) Re‑enabling visual quality (playbook)
1. **Shadows (Stage 1):** one directional light, `shadow.mapSize=1024`, tuned bias; only on primary hero meshes.
2. **AO (Stage 2):** lightweight SSAO with reduced resolution and low samples; disable during motion if needed.
3. **Bloom (Stage 3):** threshold high; disable on interaction; re‑enable on idle.
4. **HDRI swap:** replace LDR sky with 1–2k HDR only after ≥ 60s stable FPS.

Each stage requires: last 30s average FPS ≥ 50, drawCalls ≤ 250, no spikes in `browser.log`.

---

## 10) Developer checklist (per PR)
- [ ] Mobile boots on Android + iOS (cloud/Mac) with no console errors.
- [ ] Steady FPS ≥ 50 for 30s idle + 30s interaction.
- [ ] `renderer.info.render`: calls ≤ 250, triangles ≤ 500k during interaction.
- [ ] Initial payload (gz) within budget; LDR sky on mobile.
- [ ] If enabling new visuals, documented gate and rollback.

---

## 11) Quick commands
```bash
# Start log sink
node tools/log-server.mjs

# Dev
npm run dev

# Preflight mobile build & size report
npm run mobile:preflight

# (Optional) open bundle analysis
npm run analyze:bundle
```

---

## 12) Notes & gotchas
- iOS devices are sensitive to **high DPR and large textures**; keep DPR ≤ 1.0, textures ≤ 1024 for first frame.
- Context loss often follows from rapid tabbing/backgrounding; we pause loops when hidden and reload on restore.
- Device emulation is useful but **never a substitute** for real device runs.

---

**End of document. Ship it.**

