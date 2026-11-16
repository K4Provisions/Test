// Scroll-driven 3D hood cleaning story. `t` runs 0..6: 0 = dirty hood, 6 = clean and reassembled.
import * as THREE from './three.module.min.js';

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const u = clamp01((x - a) / (b - a)); return u * u * (3 - 2 * u); };
const lerp = (a, b, u) => a + (b - a) * u;

const GREASE = new THREE.Color('#4a3214');
const STEEL = new THREE.Color('#e6ecf3');

function brushedTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) {
    const y = Math.random() * 256;
    g.strokeStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '150,150,150'},${Math.random() * 0.18})`;
    g.lineWidth = Math.random() * 1.4;
    g.beginPath(); g.moveTo(0, y); g.lineTo(256, y + (Math.random() - 0.5) * 2); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Blotchy grease stains used as an overlay alpha map
function greaseTexture() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * 256, y = Math.random() * 256, r = 10 + Math.random() * 46;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, `rgba(255,255,255,${0.35 + Math.random() * 0.5})`);
    grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  }
  // drip streaks
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * 256, y = Math.random() * 200, h = 20 + Math.random() * 60;
    const grd = g.createLinearGradient(0, y, 0, y + h);
    grd.addColorStop(0, 'rgba(255,255,255,0.7)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(x, y, 2 + Math.random() * 4, h);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

// Rectangular frustum, open top and bottom (hood taper up to the duct)
function frustumGeometry(bw, bd, tw, td, h) {
  const b = [[-bw / 2, 0, bd / 2], [bw / 2, 0, bd / 2], [bw / 2, 0, -bd / 2], [-bw / 2, 0, -bd / 2]];
  const t = [[-tw / 2, h, td / 2], [tw / 2, h, td / 2], [tw / 2, h, -td / 2], [-tw / 2, h, -td / 2]];
  const pos = [], uv = [];
  for (let i = 0; i < 4; i++) {
    const j = (i + 1) % 4;
    pos.push(...b[i], ...b[j], ...t[j], ...b[i], ...t[j], ...t[i]);
    uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  return geo;
}

function makeEnvironment(renderer) {
  const env = new THREE.Scene();
  const room = new THREE.Mesh(new THREE.BoxGeometry(20, 12, 20), new THREE.MeshBasicMaterial({ color: '#0b1220', side: THREE.BackSide }));
  env.add(room);
  const strip = (w, h, color, x, y, z, ry = 0, rx = 0) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); env.add(m);
  };
  strip(14, 1.6, new THREE.Color(5, 5, 5.2), 0, 5.8, 0, 0, Math.PI / 2);   // ceiling light bar
  strip(6, 3, new THREE.Color(0.25, 0.6, 1.6), -9.8, 2, 0, Math.PI / 2); // blue wall wash
  strip(12, 5, new THREE.Color(2.2, 2.3, 2.5), 0, 2, 9.8, Math.PI);
  strip(20, 6, new THREE.Color(0.9, 0.95, 1.05), 0, -5.9, 0, 0, Math.PI / 2); // floor bounce     // soft front fill
  strip(3, 8, new THREE.Color(1.8, 1.8, 1.9), 9.8, 2, -3, -Math.PI / 2); // side window
  const pmrem = new THREE.PMREMGenerator(renderer);
  const tex = pmrem.fromScene(env, 0.04).texture;
  pmrem.dispose();
  return tex;
}

export function createHoodScene(canvas, opts = {}) {
  const lowPower = !!opts.lowPower;
  const reducedMotion = !!opts.reducedMotion;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !lowPower, alpha: true, powerPreference: 'high-performance' });
  const maxDpr = lowPower ? 1.25 : 1.75;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog('#0a1220', 10, 24);
  scene.environment = makeEnvironment(renderer);

  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 60);

  // ---------- Materials ----------
  const brushed = brushedTexture();
  brushed.repeat.set(2, 1);
  const steelMat = (rep = 1) => {
    const m = new THREE.MeshStandardMaterial({ color: STEEL.clone(), metalness: 1, roughness: 0.25, map: brushed, envMapIntensity: 1.1 });
    return m;
  };
  const hoodMat = steelMat();
  const filterMat = steelMat();
  const ductMat = steelMat();
  const fanMat = steelMat();
  const greaseTex = greaseTexture();
  const greaseOverlay = (repeatX = 1, repeatY = 1) => {
    const tex = greaseTex.clone(); tex.needsUpdate = true; tex.repeat.set(repeatX, repeatY);
    return new THREE.MeshStandardMaterial({
      color: '#3a2508', roughness: 0.55, metalness: 0.2, transparent: true, opacity: 1,
      alphaMap: tex, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    });
  };

  const darkMat = new THREE.MeshStandardMaterial({ color: '#1a2333', metalness: 0.6, roughness: 0.5 });
  const wallMat = new THREE.MeshStandardMaterial({ color: '#141e2e', metalness: 0.1, roughness: 0.85 });
  const floorMat = new THREE.MeshStandardMaterial({ color: '#0e1624', metalness: 0.2, roughness: 0.7 });

  // ---------- Kitchen ----------
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(9, 4.2), wallMat);
  wall.position.set(0, 2.1, -0.82);
  scene.add(wall);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.set(0, 0, 1.5);
  scene.add(floor);

  // tile grid lines on wall for scale
  const tileMat = new THREE.MeshBasicMaterial({ color: '#1b273a' });
  for (let i = -8; i <= 8; i++) {
    const v = new THREE.Mesh(new THREE.PlaneGeometry(0.012, 4.2), tileMat);
    v.position.set(i * 0.5, 2.1, -0.815); scene.add(v);
  }
  for (let j = 1; j < 9; j++) {
    const h = new THREE.Mesh(new THREE.PlaneGeometry(9, 0.012), tileMat);
    h.position.set(0, j * 0.5, -0.815); scene.add(h);
  }

  // Cook line
  const range = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.88, 0.85), new THREE.MeshStandardMaterial({ color: '#8a96a6', metalness: 0.9, roughness: 0.35, map: brushed }));
  body.position.y = 0.44; range.add(body);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.04, 0.04, 0.88), darkMat);
  top.position.y = 0.9; range.add(top);
  const grateMat = new THREE.MeshStandardMaterial({ color: '#0b0f16', metalness: 0.4, roughness: 0.6 });
  for (let i = 0; i < 4; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.018, 8, 24), grateMat);
    ring.rotation.x = Math.PI / 2; ring.position.set(-1.05 + i * 0.7, 0.93, 0.02); range.add(ring);
  }
  const knobMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.4 });
  for (let i = 0; i < 8; i++) {
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), knobMat);
    k.rotation.x = Math.PI / 2; k.position.set(-1.3 + i * 0.37, 0.78, 0.44); range.add(k);
  }
  range.position.set(0, 0, -0.36);
  scene.add(range);

  // Plastic sheeting over the cook line (step 1)
  const sheetMat = new THREE.MeshStandardMaterial({ color: '#cfe4ff', transparent: true, opacity: 0, roughness: 0.2, metalness: 0, depthWrite: false, side: THREE.DoubleSide });
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(3.14, 0.98, 0.95), sheetMat);
  sheet.position.set(0, 0.49, -0.34);
  sheet.visible = false;
  scene.add(sheet);

  // ---------- Hood ----------
  const hood = new THREE.Group();
  const HW = 3.3, HD = 1.35, HH = 0.58, HY = 1.95; // canopy width, depth, height, bottom y
  const zc = -0.82 + HD / 2;
  const panel = (w, h, d, x, y, z, mat) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); hood.add(m); return m; };
  const front = panel(HW, HH, 0.03, 0, HY + HH / 2, zc + HD / 2, hoodMat);
  panel(0.03, HH, HD, -HW / 2, HY + HH / 2, zc, hoodMat);
  panel(0.03, HH, HD, HW / 2, HY + HH / 2, zc, hoodMat);
  panel(HW, 0.03, HD, 0, HY + HH, zc, hoodMat);
  // grease trough along the bottom of the filter bank
  const trough = panel(HW - 0.1, 0.06, 0.12, 0, HY + 0.08, -0.62, hoodMat);
  // inner lip
  panel(HW, 0.05, 0.08, 0, HY + 0.025, zc + HD / 2 - 0.04, hoodMat);

  const taper = new THREE.Mesh(frustumGeometry(HW, HD, 0.62, 0.62, 0.5), hoodMat);
  taper.position.set(0, HY + HH, zc);
  hood.add(taper);
  scene.add(hood);

  // grease overlays on the canopy faces
  const overlays = [];
  const addOverlay = (geo, mat, pos, rot) => {
    const m = new THREE.Mesh(geo, mat); m.position.copy(pos); if (rot) m.rotation.copy(rot); scene.add(m); overlays.push(m); return m;
  };
  const hoodGrease = greaseOverlay(2.5, 1);
  addOverlay(new THREE.PlaneGeometry(HW, HH), hoodGrease, new THREE.Vector3(0, HY + HH / 2, zc + HD / 2 + 0.017));
  addOverlay(new THREE.PlaneGeometry(HW, HH), hoodGrease, new THREE.Vector3(0, HY + HH / 2, zc + HD / 2 - 0.017), new THREE.Euler(0, Math.PI, 0));
  addOverlay(new THREE.PlaneGeometry(HW, HD), hoodGrease, new THREE.Vector3(0, HY + HH - 0.017, zc), new THREE.Euler(Math.PI / 2, 0, 0));
  const taperOverlay = new THREE.Mesh(frustumGeometry(HW + 0.01, HD + 0.01, 0.63, 0.63, 0.5), hoodGrease);
  taperOverlay.position.set(0, HY + HH + 0.001, zc); scene.add(taperOverlay); overlays.push(taperOverlay);

  // drips hanging from the lip
  const dripMat = new THREE.MeshStandardMaterial({ color: '#6b4512', roughness: 0.2, metalness: 0.1 });
  const drips = [];
  for (let i = 0; i < 11; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), dripMat);
    const s = 0.009 + Math.random() * 0.007;
    d.userData.base = new THREE.Vector3(s, s * (2.6 + Math.random() * 2.2), s);
    d.scale.copy(d.userData.base);
    d.position.set(-1.5 + i * 0.3 + (Math.random() - 0.5) * 0.12, HY - d.userData.base.y * 0.6, zc + HD / 2 - 0.04);
    scene.add(d); drips.push(d);
  }

  // hood lights
  const lampMat = new THREE.MeshStandardMaterial({ color: '#fff', emissive: '#ffe7c2', emissiveIntensity: 2.2 });
  for (let i = 0; i < 3; i++) {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.1, 16), lampMat);
    lamp.position.set(-1.0 + i * 1.0, HY + HH - 0.07, zc + 0.25); scene.add(lamp);
  }

  // Filters (baffle style), each a group: frame + blades
  const filters = [];
  const FW = 0.6, FH = 0.5, FN = 5;
  const bladeGeo = new THREE.BoxGeometry(0.035, FH - 0.04, 0.05);
  const frameGeoH = new THREE.BoxGeometry(FW, 0.03, 0.06);
  const frameGeoV = new THREE.BoxGeometry(0.03, FH, 0.06);
  const filterGrease = greaseOverlay(1, 1);
  for (let i = 0; i < FN; i++) {
    const f = new THREE.Group();
    [[0, FH / 2 - 0.015], [0, -FH / 2 + 0.015]].forEach(([x, y]) => { const m = new THREE.Mesh(frameGeoH, filterMat); m.position.set(x, y, 0); f.add(m); });
    [[-FW / 2 + 0.015], [FW / 2 - 0.015]].forEach(([x]) => { const m = new THREE.Mesh(frameGeoV, filterMat); m.position.set(x, 0, 0); f.add(m); });
    for (let b = 0; b < 9; b++) {
      const bl = new THREE.Mesh(bladeGeo, filterMat);
      bl.position.set(-FW / 2 + 0.07 + b * 0.058, 0, b % 2 ? -0.012 : 0.012);
      bl.rotation.y = b % 2 ? 0.5 : -0.5;
      f.add(bl);
    }
    const ov = new THREE.Mesh(new THREE.PlaneGeometry(FW - 0.02, FH - 0.02), filterGrease);
    ov.position.z = 0.036; f.add(ov);
    const home = { pos: new THREE.Vector3(-1.24 + i * 0.62, HY + 0.33, -0.6), rotX: -0.55 };
    const out = { pos: new THREE.Vector3(2.35, 0.76 + i * 0.07, 0.55 + (i % 2) * 0.03), rotX: -Math.PI / 2 };
    f.userData = { home, out };
    f.position.copy(home.pos); f.rotation.x = home.rotX;
    scene.add(f); filters.push(f);
  }
  // a cart for the pulled filters
  const cart = new THREE.Group();
  const cartTop = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.64), darkMat);
  cartTop.position.y = 0.72; cart.add(cartTop);
  const shelf = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.03, 0.64), darkMat);
  shelf.position.y = 0.2; cart.add(shelf);
  const legGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.72, 8);
  [[-0.38, -0.3], [0.38, -0.3], [-0.38, 0.3], [0.38, 0.3]].forEach(([x, z]) => { const l = new THREE.Mesh(legGeo, darkMat); l.position.set(x, 0.36, z); cart.add(l); });
  cart.position.set(2.35, 0, 0.55); scene.add(cart);

  // ---------- Duct, ceiling, roof, fan ----------
  const CEIL = 4.1, ROOF = 4.42;
  const duct = new THREE.Mesh(new THREE.BoxGeometry(0.6, ROOF + 0.25 - (HY + HH + 0.5), 0.6), ductMat);
  const ductBottom = HY + HH + 0.5;
  duct.position.set(0, ductBottom + duct.geometry.parameters.height / 2, zc);
  scene.add(duct);
  const ductGrease = greaseOverlay(1, 2.5);
  const dov = new THREE.Mesh(new THREE.BoxGeometry(0.612, duct.geometry.parameters.height - 0.4, 0.612), ductGrease);
  dov.position.copy(duct.position); dov.position.y -= 0.2; scene.add(dov); overlays.push(dov);

  const slabMat = new THREE.MeshStandardMaterial({ color: '#1c2738', roughness: 0.9, metalness: 0.05 });
  const slab = new THREE.Mesh(new THREE.BoxGeometry(7, ROOF - CEIL, 3.4), slabMat);
  slab.position.set(0, (CEIL + ROOF) / 2, 0.2);
  scene.add(slab);
  const roofMat = new THREE.MeshStandardMaterial({ color: '#2a3446', roughness: 0.95 });
  const roofTop = new THREE.Mesh(new THREE.PlaneGeometry(7, 3.4), roofMat);
  roofTop.rotation.x = -Math.PI / 2; roofTop.position.set(0, ROOF + 0.002, 0.2); scene.add(roofTop);

  const fan = new THREE.Group();
  const curb = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.28, 1.0), new THREE.MeshStandardMaterial({ color: '#59677a', metalness: 0.5, roughness: 0.6 }));
  curb.position.y = 0.14; fan.add(curb);
  const housing = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.56, 0.42, 40, 1, true), fanMat);
  housing.position.y = 0.49; fan.add(housing);
  const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.58, 0.46, 0.1, 40, 1, true), fanMat);
  lip.position.y = 0.75; fan.add(lip);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.56, 0.04, 40), fanMat);
  base.position.y = 0.3; fan.add(base);
  const rotor = new THREE.Group();
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.12, 20), darkMat);
  rotor.add(hub);
  for (let i = 0; i < 7; i++) {
    const bl = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.012, 0.11), fanMat);
    bl.position.x = 0.21; bl.rotation.x = 0.4;
    const holder = new THREE.Group(); holder.rotation.y = (i / 7) * Math.PI * 2; holder.add(bl); rotor.add(holder);
  }
  rotor.position.y = 0.66; fan.add(rotor);
  const fanGrease = greaseOverlay(3, 1);
  const fov = new THREE.Mesh(new THREE.CylinderGeometry(0.465, 0.565, 0.42, 40, 1, true), fanGrease);
  fov.position.y = 0.49; fan.add(fov); overlays.push(fov);
  const greasePuddle = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshStandardMaterial({ color: '#3a2508', roughness: 0.3, transparent: true, opacity: 0.85, depthWrite: false }));
  greasePuddle.rotation.x = -Math.PI / 2; greasePuddle.position.set(0.55, 0.005, 0.35); fan.add(greasePuddle);
  fan.position.set(0, ROOF, zc);
  scene.add(fan);

  // ---------- Lights ----------
  scene.add(new THREE.HemisphereLight('#a9c1e6', '#0a0f18', 0.7));
  const key = new THREE.DirectionalLight('#fff4e6', 2.4);
  key.position.set(4, 7, 6); scene.add(key);
  const under = new THREE.PointLight('#ffd9a8', 6, 4, 2);
  under.position.set(0, HY - 0.15, zc + 0.2); scene.add(under);
  const rim = new THREE.PointLight('#3d9bff', 0, 12, 1.4);
  rim.position.set(-3.2, 3.2, 0.6); scene.add(rim);
  const rim2 = new THREE.PointLight('#8fd3ff', 0, 10, 1.4);
  rim2.position.set(3.4, 2.8, 2.0); scene.add(rim2);

  // ---------- Spray particles ----------
  const N = lowPower ? 260 : 520;
  const pGeo = new THREE.BufferGeometry();
  const pPos = new Float32Array(N * 3).fill(-100);
  const pCol = new Float32Array(N * 3);
  const pVel = new Float32Array(N * 3);
  const pLife = new Float32Array(N);
  const pMax = new Float32Array(N);
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  const dot = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d'); const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.4, 'rgba(255,255,255,0.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grd; g.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c);
  })();
  const pMat = new THREE.PointsMaterial({ size: 0.05, map: dot, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true });
  const points = new THREE.Points(pGeo, pMat);
  points.frustumCulled = false;
  scene.add(points);
  let pCursor = 0, emitAcc = 0;

  // pressure wand
  const wand = new THREE.Group();
  const lance = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.9, 8), new THREE.MeshStandardMaterial({ color: '#c9d2dc', metalness: 1, roughness: 0.3 }));
  lance.rotation.x = Math.PI / 2; lance.position.z = 0.45; wand.add(lance);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.14, 0.12), new THREE.MeshStandardMaterial({ color: '#1F74E0', roughness: 0.5 }));
  grip.position.set(0, -0.06, 0.92); wand.add(grip);
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.014, 0.05, 8), new THREE.MeshStandardMaterial({ color: '#f2c14e', metalness: 0.8, roughness: 0.3 }));
  tip.rotation.x = Math.PI / 2; wand.add(tip);
  wand.visible = false;
  scene.add(wand);

  // ---------- Camera path ----------
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const KEYS = [
    { pos: V(5.4, 2.5, 7.8), look: V(0, 2.25, -0.2) },  // 0 hero wide
    { pos: V(3.4, 1.9, 5.0), look: V(0.2, 1.3, -0.3) }, // 1 cook line wrapped
    { pos: V(4.2, 1.35, 3.6), look: V(1.2, 1.45, -0.2) },// 2 filters out
    { pos: V(0.7, 0.95, 2.3), look: V(0, 2.3, -0.6) },  // 3 under the hood
    { pos: V(-1.7, 1.1, 2.9), look: V(0.2, 2.15, -0.5) },// 4 pressure wash
    { pos: V(2.7, 6.0, 3.4), look: V(0, 4.8, -0.2) },   // 5 roof fan
    { pos: V(5.6, 2.4, 7.6), look: V(0, 2.35, -0.2) },  // 6 final wide
  ];
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();

  function cameraAt(t, time) {
    const i = Math.min(5, Math.floor(t));
    const u = smooth(0, 1, t - i);
    camPos.lerpVectors(KEYS[i].pos, KEYS[i + 1].pos, u);
    camLook.lerpVectors(KEYS[i].look, KEYS[i + 1].look, u);
    // lift the path over the canopy when travelling to the roof
    if (i === 4) camPos.y += Math.sin(u * Math.PI) * 0.6;
    if (!reducedMotion) { // gentle hand-held drift
      camPos.x += Math.sin(time * 0.35) * 0.06;
      camPos.y += Math.sin(time * 0.27) * 0.04;
    }
    camera.position.copy(camPos);
    camera.lookAt(camLook);
  }

  // ---------- State ----------
  const _target = new THREE.Vector3(), _nozzle = new THREE.Vector3(), _dir = new THREE.Vector3();
  let fanAngle = 0;
  let width = 1, height = 1;
  let layout = 'desktop';

  function setMaterialClean(mat, c) {
    mat.color.copy(GREASE).lerp(STEEL, c);
    mat.roughness = lerp(0.75, 0.3, c);
    mat.metalness = lerp(0.45, 0.9, c);
  }

  function sprayState(t, time) {
    // returns { intensity, kind } and sets _nozzle/_target
    if (t > 2 && t < 3) {
      const s = t - 2;
      _target.set(lerp(-1.3, 1.3, s) + Math.sin(time * 2.2) * 0.12, 2.3 + Math.sin(time * 3.1) * 0.06, -0.45);
      _nozzle.set(_target.x * 0.6 + 0.25, 1.25, 0.75);
      return { intensity: smooth(0, 0.12, s) * (1 - smooth(0.88, 1, s)), kind: 'foam' };
    }
    if (t > 3 && t < 4) {
      const s = t - 3;
      const sweep = Math.sin(time * 1.6);
      _target.set(lerp(-1.4, 1.4, s) + sweep * 0.3, 2.25 + Math.sin(time * 4.0) * 0.12, -0.5);
      _nozzle.set(_target.x * 0.5 - 0.3, 1.3, 0.85);
      return { intensity: smooth(0, 0.1, s) * (1 - smooth(0.9, 1, s)), kind: 'water' };
    }
    if (t > 4 && t < 5) {
      const s = t - 4;
      const a = time * 1.4;
      _target.set(Math.cos(a) * 0.3, ROOF + 0.62, zc + Math.sin(a) * 0.3);
      _nozzle.set(0.85, ROOF + 1.35, zc + 0.9);
      return { intensity: smooth(0.15, 0.3, s) * (1 - smooth(0.88, 1, s)), kind: 'water' };
    }
    return { intensity: 0, kind: 'none' };
  }

  function emit(count, kind) {
    for (let k = 0; k < count; k++) {
      const i = pCursor; pCursor = (pCursor + 1) % N;
      _dir.subVectors(_target, _nozzle).normalize();
      const spread = kind === 'foam' ? 0.16 : 0.07;
      _dir.x += (Math.random() - 0.5) * spread; _dir.y += (Math.random() - 0.5) * spread; _dir.z += (Math.random() - 0.5) * spread;
      _dir.normalize();
      const speed = kind === 'foam' ? 2.2 + Math.random() : 6 + Math.random() * 2.5;
      pPos[i * 3] = _nozzle.x; pPos[i * 3 + 1] = _nozzle.y; pPos[i * 3 + 2] = _nozzle.z;
      pVel[i * 3] = _dir.x * speed; pVel[i * 3 + 1] = _dir.y * speed; pVel[i * 3 + 2] = _dir.z * speed;
      const dist = _nozzle.distanceTo(_target);
      pMax[i] = pLife[i] = (dist / speed) * (0.85 + Math.random() * 0.3);
      const c = kind === 'foam' ? [1.0, 0.86, 0.6] : [0.55, 0.85, 1.0];
      pCol[i * 3] = c[0]; pCol[i * 3 + 1] = c[1]; pCol[i * 3 + 2] = c[2];
    }
  }

  const baseColors = new Float32Array(N * 3);
  function updateParticles(dt, spray) {
    let alive = 0;
    if (spray.intensity > 0.01 && !reducedMotion) {
      const rate = (spray.kind === 'foam' ? 260 : 900) * spray.intensity * (lowPower ? 0.5 : 1);
      emitAcc += rate * dt;
      const n = Math.floor(emitAcc); emitAcc -= n;
      if (n > 0) {
        const start = pCursor;
        emit(Math.min(n, N), spray.kind);
        for (let k = 0; k < Math.min(n, N); k++) {
          const i = (start + k) % N;
          baseColors[i * 3] = pCol[i * 3]; baseColors[i * 3 + 1] = pCol[i * 3 + 1]; baseColors[i * 3 + 2] = pCol[i * 3 + 2];
        }
      }
    }
    for (let i = 0; i < N; i++) {
      if (pLife[i] <= 0) continue;
      pLife[i] -= dt;
      if (pLife[i] <= 0) { pPos[i * 3 + 1] = -100; pCol[i * 3] = pCol[i * 3 + 1] = pCol[i * 3 + 2] = 0; continue; }
      alive++;
      pVel[i * 3 + 1] -= 2.5 * dt;
      pPos[i * 3] += pVel[i * 3] * dt; pPos[i * 3 + 1] += pVel[i * 3 + 1] * dt; pPos[i * 3 + 2] += pVel[i * 3 + 2] * dt;
      const f = Math.min(1, pLife[i] / pMax[i] * 1.6);
      pCol[i * 3] = baseColors[i * 3] * f; pCol[i * 3 + 1] = baseColors[i * 3 + 1] * f; pCol[i * 3 + 2] = baseColors[i * 3 + 2] * f;
    }
    pGeo.attributes.position.needsUpdate = true;
    pGeo.attributes.color.needsUpdate = true;
    pMat.size = spray.kind === 'foam' ? 0.07 : 0.045;
    return alive;
  }

  function applyState(t, time, dt) {
    const hoodClean = 0.3 * smooth(2.05, 3, t) + 0.7 * smooth(3, 3.95, t);
    const filterClean = smooth(3, 3.9, t);
    const upperClean = smooth(4.25, 4.95, t);

    setMaterialClean(hoodMat, hoodClean);
    setMaterialClean(filterMat, filterClean);
    setMaterialClean(ductMat, upperClean);
    setMaterialClean(fanMat, upperClean);
    hoodGrease.opacity = 1 - hoodClean;
    filterGrease.opacity = 1 - filterClean;
    ductGrease.opacity = 1 - upperClean;
    fanGrease.opacity = 1 - upperClean;
    greasePuddle.material.opacity = 0.85 * (1 - upperClean);
    overlays.forEach((o) => { o.visible = o.material.opacity > 0.01; });
    greasePuddle.visible = greasePuddle.material.opacity > 0.01;

    const dripGone = smooth(2.2, 3.4, t);
    drips.forEach((d) => { d.visible = dripGone < 0.99; d.scale.copy(d.userData.base).multiplyScalar(1 - dripGone); });

    const sheetAmt = smooth(0.35, 0.95, t) * (1 - smooth(5.15, 5.85, t));
    sheetMat.opacity = 0.42 * sheetAmt;
    sheet.visible = sheetAmt > 0.01;

    const pull = smooth(1.15, 1.95, t) * (1 - smooth(5.05, 5.8, t));
    filters.forEach((f, i) => {
      const u = clamp01(pull * 1.5 - (FN - 1 - i) * 0.1);
      const e = smooth(0, 1, u);
      const { home, out } = f.userData;
      f.position.lerpVectors(home.pos, out.pos, e);
      f.position.y += Math.sin(e * Math.PI) * 0.35;
      f.position.z += Math.sin(e * Math.PI) * 0.4;
      f.rotation.x = lerp(home.rotX, out.rotX, e);
    });

    // fan: running at the start, off while we work, test-run at the end
    const fanSpeed = reducedMotion ? 0 : (1 - smooth(0.5, 1.0, t)) * 5 + smooth(5.3, 5.8, t) * 7;
    fanAngle += fanSpeed * dt;
    rotor.rotation.y = fanAngle;

    const shine = smooth(4.8, 6, t);
    rim.intensity = shine * 18;
    rim2.intensity = shine * 10;
    renderer.toneMappingExposure = 1.0 + shine * 0.15;
    under.intensity = 6 * (1 - smooth(0.5, 1.2, t)) + 6 * smooth(5.4, 6, t) + 2.5;

    const spray = reducedMotion ? { intensity: 0, kind: 'none' } : sprayState(t, time);
    const alive = updateParticles(dt, spray);
    if (spray.intensity > 0.01) {
      wand.visible = true;
      wand.position.copy(_nozzle);
      wand.lookAt(_nozzle.clone().multiplyScalar(2).sub(_target)); // lance points back toward the operator
    } else {
      wand.visible = false;
    }
    return { animating: alive > 0 || spray.intensity > 0.01 || fanSpeed > 0.01 };
  }

  function applyViewOffset() {
    // shift the scene so it sits beside (desktop) or above (mobile) the copy
    if (layout === 'desktop') camera.setViewOffset(width, height, -width * 0.2, 0, width, height);
    else camera.setViewOffset(width, height, 0, height * 0.22, width, height);
  }

  function resize(w, h) {
    width = Math.max(1, w); height = Math.max(1, h);
    layout = width >= 900 ? 'desktop' : 'mobile';
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.fov = layout === 'desktop' ? 36 : (width / height < 0.7 ? 52 : 44);
    camera.updateProjectionMatrix();
    applyViewOffset();
  }

  function render(t, time, dt) {
    t = Math.min(6, Math.max(0, t || 0));
    const s = applyState(t, time, dt);
    cameraAt(t, time);
    renderer.render(scene, camera);
    return s;
  }

  function dispose() {
    renderer.dispose();
  }

  return { resize, render, dispose, renderer };
}
