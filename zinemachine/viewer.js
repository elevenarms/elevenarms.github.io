// Zine Machine v3 viewer: the assembly from zinemachine0 (mech/fitcheck_board_full.glb: the routed KiCad
// main board + the FreeCAD tray, display chassis, battery, PocketBeagle envelope and legend keycaps),
// regrouped by assembly layer and meshopt-compressed (assets/zine.glb).
// Units are metres. glTF frame: x = case x, y = case z (up), z = -case y (front edge at z = 0).
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Assembly layers. lift = exploded offset in metres (the same values as mech/render/zine_render.py).
export const LAYERS = [
  { id: 'tray',    label: 'Tray',            lift: 0.000, groups: ['tray'] },
  { id: 'board',   label: 'Main board',      lift: 0.035, groups: ['board'] },
  { id: 'pb2',     label: 'PocketBeagle 2',  lift: 0.058, groups: ['pb2'] },
  { id: 'battery', label: 'Battery',         lift: 0.062, groups: ['battery'] },
  { id: 'caps',    label: 'Keycaps',         lift: 0.080, groups: ['caps', 'legends', 'mode'] },
  { id: 'chassis', label: 'Display chassis', lift: 0.095, groups: ['chassis'] },
  { id: 'panel',   label: 'Display',         lift: 0.125, groups: ['panel'] },
];

// Case coordinates (mm, x right, y to the rear, z up from the tray underside) -> scene metres
export const caseToWorld = (x, y, z) => new THREE.Vector3(x / 1000, z / 1000, -y / 1000);

// Camera directions from the model centre (scene frame), distance factor, target offset (m)
export const VIEWS = {
  hero:     { dir: [-0.45, 0.62, 1.0],  dist: 0.66, off: [0, 0, 0] },
  top:      { dir: [0.0, 1.0, 0.18],    dist: 0.70, off: [0, 0, 0] },
  rear:     { dir: [0.55, 0.42, -1.0],  dist: 0.62, off: [0.012, 0, -0.03] },
  side:     { dir: [-1.0, 0.25, 0.02],  dist: 0.62,  off: [0, 0, 0] },
  exploded: { dir: [-0.5, 0.75, 1.0],  dist: 1.08, off: [0, 0.06, 0] },
  detail:   { dir: [0.75, 0.45, 0.75],  dist: 0.34, off: [0.05, 0, -0.02] },
};

function lin(r, g, b) { return new THREE.Color().setRGB(r, g, b, THREE.LinearSRGBColorSpace); }

function restyle(group, mesh) {
  const old = mesh.material;
  const c = old.color ? old.color.clone() : new THREE.Color(0.5, 0.5, 0.5);
  const P = (o) => new THREE.MeshPhysicalMaterial(Object.assign({ color: c, roughness: 0.45, metalness: 0 }, o));
  let m;
  switch (group) {
    case 'tray': m = P({ color: lin(0.0, 0.62, 0.80), roughness: 0.38, clearcoat: 0.15, clearcoatRoughness: 0.3 }); break;
    case 'caps': m = P({ color: lin(0.80, 0.77, 0.66), roughness: 0.62, sheen: 0.2 }); break;
    case 'legends': m = P({ roughness: 0.5 }); break;
    case 'mode': m = P({ roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.08 }); break;
    case 'chassis': m = P({ color: lin(0.85, 0.50, 0.05), roughness: 0.55 }); break;
    case 'panel': m = P({ color: lin(0.005, 0.006, 0.008), roughness: 0.12, clearcoat: 0.4, clearcoatRoughness: 0.08 }); break;
    case 'battery': m = P({ color: lin(0.75, 0.76, 0.78), roughness: 0.32, metalness: 0.85 }); break;
    default: {                                   // board + PocketBeagle: KiCad / model colours, tuned by hue
      const { r, g, b } = c;
      if (mesh.name.startsWith('PB2_PCB')) m = P({ color: lin(0.45, 0.02, 0.02), roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.12 });
      else if (mesh.name.startsWith('B_bancouver40')) m = P({ color: lin(0.02, 0.18, 0.06), roughness: 0.32, clearcoat: 0.5, clearcoatRoughness: 0.12 });
      else if (Math.abs(r - g) < 0.06 && Math.abs(g - b) < 0.08 && r > 0.5) m = P({ color: lin(0.80, 0.80, 0.82), roughness: 0.25, metalness: 1 });
      else if (r < 0.12 && g < 0.12 && b < 0.12) m = P({ color: lin(0.02, 0.02, 0.022), roughness: 0.45 });
      else m = P({ roughness: 0.45 });
    }
  }
  m.name = old.name; old.dispose();
  mesh.material = m;
  mesh.castShadow = true; mesh.receiveShadow = true;
}

export async function createViewer(host, opts = {}) {
  const o = Object.assign({ glb: 'assets/zine.glb', background: null, autoRotate: false, controls: true,
    view: 'hero', screenVideo: null, ground: 0x000000, groundOpacity: 0.28, onProgress: null, zoom: true }, opts);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: o.background === null, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.touchAction = o.controls ? 'none' : 'pan-y';
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  if (o.background !== null) scene.background = new THREE.Color(o.background);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.75;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.005, 10);
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-0.25, 0.45, 0.2);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -0.18, right: 0.18, top: 0.18, bottom: -0.18, near: 0.05, far: 1.2 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.0006; key.shadow.radius = 6;
  scene.add(key, key.target);
  const rim = new THREE.DirectionalLight(0xfff2e0, 0.9); rim.position.set(0.1, 0.25, -0.5); scene.add(rim);
  scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x202020, 0.35));

  const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((res, rej) => loader.load(o.glb, res,
    (e) => o.onProgress && e.total && o.onProgress(e.loaded / e.total), rej));
  const model = gltf.scene;
  const groups = {};
  model.children.forEach((g) => { groups[g.name] = g; g.traverse((m) => m.isMesh && restyle(g.name, m)); });
  scene.add(model);

  const box = new THREE.Box3().setFromObject(model);
  const centre = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3()).length();
  const groupBoxes = {};
  for (const k in groups) groupBoxes[k] = new THREE.Box3().setFromObject(groups[k]);
  key.target.position.copy(centre);

  // ground: shadow catcher
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.ShadowMaterial({ color: o.ground, opacity: o.groundOpacity }));
  ground.rotation.x = -Math.PI / 2; ground.position.set(centre.x, box.min.y - 0.0003, centre.z); ground.receiveShadow = true;
  scene.add(ground);

  // screen: the display's 111.1 x 37.37 mm viewing area, centred at case (81.65, 96.2) mm
  let screenVideo = null;
  if (groups.panel) {
    const top = groupBoxes.panel.max.y + 0.00015;
    const geo = new THREE.PlaneGeometry(0.1111, 0.03737);
    let map;
    if (o.screenVideo) {
      screenVideo = document.createElement('video');
      Object.assign(screenVideo, { src: o.screenVideo, muted: true, loop: true, playsInline: true, autoplay: true, crossOrigin: 'anonymous' });
      screenVideo.setAttribute('playsinline', ''); screenVideo.setAttribute('muted', '');
      screenVideo.play().catch(() => {});
      map = new THREE.VideoTexture(screenVideo);
      map.colorSpace = THREE.SRGBColorSpace;
    }
    const mat = new THREE.MeshBasicMaterial({ map: map || null, color: map ? 0xffffff : 0x0a0d10, toneMapped: false });
    const scr = new THREE.Mesh(geo, mat);
    scr.rotation.x = -Math.PI / 2;
    const p = caseToWorld(81.65, 96.2, 0); scr.position.set(p.x, top, p.z);
    scr.name = 'Screen';
    groups.panel.add(scr);                      // group nodes sit at the origin, so world = local here
  }

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true; controls.dampingFactor = 0.08;
  controls.target.copy(centre);
  controls.minDistance = size * 0.35; controls.maxDistance = size * 4;
  controls.enabled = o.controls; controls.enableZoom = o.zoom;
  controls.autoRotate = o.autoRotate; controls.autoRotateSpeed = 0.6;
  controls.maxPolarAngle = Math.PI * 0.62;

  function viewPose(name, aspect) {
    const v = VIEWS[name] || VIEWS.hero;
    const tgt = centre.clone().add(new THREE.Vector3(...v.off));
    const fov = THREE.MathUtils.degToRad(camera.fov);
    const fitW = Math.max(1, 1.5 / Math.max(aspect, 0.2));   // narrow screens: back off so the width fits
    const dist = (size * 0.5 * v.dist * fitW) / Math.tan(fov / 2);
    const pos = tgt.clone().add(new THREE.Vector3(...v.dir).normalize().multiplyScalar(dist));
    return { pos, tgt };
  }

  // state
  let explode = 0, explodeTarget = 0, tween = null, raf = 0, visible = true;
  const hidden = {};
  const hotspots = [];
  const tmp = new THREE.Vector3();

  function layerOf(group) { return LAYERS.find((l) => l.groups.includes(group)); }
  function apply() {
    for (const k in groups) {
      const L = layerOf(k); if (!L) continue;
      groups[k].position.y = L.lift * explode;
      groups[k].visible = !hidden[L.id];
    }
  }

  let shift = 0;                                 // horizontal view shift, fraction of the width (+ = model moves right)
  function project() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    if (Math.abs(shift) > 1e-4) camera.setViewOffset(w, h, -w * shift, 0, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function resize() {
    const w = host.clientWidth || 1, h = host.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; project();
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  const start = viewPose(o.view, camera.aspect);
  camera.position.copy(start.pos); controls.target.copy(start.tgt); controls.update();

  const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const listeners = [];
  function frame() {
    raf = 0;
    if (Math.abs(explodeTarget - explode) > 1e-4) explode += (explodeTarget - explode) * 0.12; else explode = explodeTarget;
    apply();
    if (tween) {
      tween.t = Math.min(1, tween.t + 1 / 50);
      const k = ease(tween.t);
      camera.position.lerpVectors(tween.p0, tween.p1, k);
      controls.target.lerpVectors(tween.t0, tween.t1, k);
      if (tween.t >= 1) tween = null;
    }
    controls.update();
    renderer.render(scene, camera);
    // hotspots: project their anchor (which rides with its layer) to the canvas
    const w = host.clientWidth, h = host.clientHeight;
    for (const hs of hotspots) {
      const L = layerOf(hs.group);
      tmp.copy(hs.anchor); tmp.y += (L ? L.lift : 0) * explode;
      const onLayer = !(L && hidden[L.id]);
      tmp.project(camera);
      const behind = tmp.z > 1;
      hs.el.style.transform = `translate(${((tmp.x + 1) / 2) * w}px, ${((1 - tmp.y) / 2) * h}px)`;
      hs.el.style.visibility = onLayer && !behind && hs.show && explode >= (hs.minExplode || 0) ? 'visible' : 'hidden';
    }
    listeners.forEach((f) => f());
    if (visible) raf = requestAnimationFrame(frame);
  }
  const io = new IntersectionObserver((es) => {
    visible = es[0].isIntersecting;
    if (visible && !raf) raf = requestAnimationFrame(frame);
    if (screenVideo) visible ? screenVideo.play().catch(() => {}) : screenVideo.pause();
  });
  io.observe(host);
  raf = requestAnimationFrame(frame);

  return {
    THREE, scene, camera, controls, renderer, groups, centre, size, box, groupBoxes,
    get explode() { return explode; },
    setExplode(t, instant) { explodeTarget = Math.max(0, Math.min(1, t)); if (instant) explode = explodeTarget; },
    setLayerVisible(id, on) { hidden[id] = !on; },
    isolate(id) { LAYERS.forEach((l) => (hidden[l.id] = id && l.id !== id)); },
    setView(name, instant) {
      const p = viewPose(name, camera.aspect);
      if (instant) { camera.position.copy(p.pos); controls.target.copy(p.tgt); tween = null; return; }
      tween = { t: 0, p0: camera.position.clone(), p1: p.pos, t0: controls.target.clone(), t1: p.tgt };
    },
    // place the camera on an arbitrary orbit (scroll-driven pages): azimuth/elevation in radians, distance factor
    orbit(az, el, distF, targetOff = [0, 0, 0]) {
      const tgt = centre.clone().add(new THREE.Vector3(...targetOff));
      const fov = THREE.MathUtils.degToRad(camera.fov);
      const fitW = Math.max(1, 1.5 / Math.max(camera.aspect, 0.2));
      const d = (size * 0.5 * distF * fitW) / Math.tan(fov / 2);
      camera.position.set(tgt.x + d * Math.cos(el) * Math.sin(az), tgt.y + d * Math.sin(el), tgt.z + d * Math.cos(el) * Math.cos(az));
      controls.target.copy(tgt); tween = null;
    },
    setAutoRotate(on) { controls.autoRotate = on; },
    setShift(f) { if (Math.abs(f - shift) > 1e-4) { shift = f; project(); } },
    // hotspot: { id, group, at: [x, y, z] case mm (z 'top' = top of its group), el }
    addHotspot(hs) {
      const z = hs.at[2] === 'top' ? groupBoxes[hs.group].max.y * 1000 : hs.at[2];
      hs.anchor = caseToWorld(hs.at[0], hs.at[1], z);
      hs.show = true; hotspots.push(hs); return hs;
    },
    showHotspots(on) { hotspots.forEach((h) => (h.show = on)); },
    onFrame(f) { listeners.push(f); },
    screenVideo,
  };
}
