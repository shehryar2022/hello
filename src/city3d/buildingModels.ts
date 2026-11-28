import * as THREE from 'three';
import type { BuildingDef, TextureQuality } from '../game/types';
import type { CityPlotDef } from './cityLayout';

export interface AnimatedCityPart {
  obj: THREE.Object3D;
  kind: 'rotor' | 'radar' | 'beacon';
  speed: number;
  phase: number;
}

export interface CityMaterialLibrary {
  textures: THREE.Texture[];
  materials: THREE.Material[];
  geometries: THREE.BufferGeometry[];
  glassFacade: THREE.MeshPhysicalMaterial;
  resFacade: THREE.MeshStandardMaterial;
  industrialFacade: THREE.MeshStandardMaterial;
  concreteBase: THREE.MeshStandardMaterial;
  darkSteel: THREE.MeshStandardMaterial;
  brightSteel: THREE.MeshStandardMaterial;
  goldAccent: THREE.MeshStandardMaterial;
  solarMat: THREE.MeshPhysicalMaterial;
  roofSlate: THREE.MeshStandardMaterial;
  roofRed: THREE.MeshStandardMaterial;
  roofBlue: THREE.MeshStandardMaterial;
  foliageGreen: THREE.MeshStandardMaterial;
  trunkBrown: THREE.MeshStandardMaterial;
  cropMat: THREE.MeshStandardMaterial;
  tarmacMat: THREE.MeshStandardMaterial;
  roadMat: THREE.MeshStandardMaterial;
  waterMat: THREE.MeshPhysicalMaterial;
  plotPadMat: THREE.MeshStandardMaterial;
  plotOutlineMat: THREE.MeshBasicMaterial;
  beaconMat: THREE.MeshStandardMaterial;
  emissiveGlassMat: THREE.MeshStandardMaterial;
  emissiveWarmMat: THREE.MeshStandardMaterial;
  setTextureQuality: (q: TextureQuality, maxAniso: number) => void;
  setNightFactor: (night: number) => void;
  setReflections: (enabled: boolean) => void;
  dispose: () => void;
}

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  return [c, ctx];
}

function createCurtainWallTextures(): { colorMap: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const [cc, cctx] = makeCanvas(256, 256);
  const [ec, ectx] = makeCanvas(256, 256);

  cctx.fillStyle = '#1f2b49';
  cctx.fillRect(0, 0, 256, 256);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, 256, 256);

  const cols = 8;
  const rows = 12;
  const cw = 256 / cols;
  const rh = 256 / rows;

  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const seed = ((r * 31 + col * 17) % 13) / 13;
      const lit = seed > 0.34;
      const x = col * cw + 3;
      const y = r * rh + 3;
      const w = cw - 6;
      const h = rh - 5;

      cctx.fillStyle = lit ? '#4a70a8' : '#2a416e';
      cctx.fillRect(x, y, w, h);

      // Subtle sky reflection band inside glass pane
      cctx.fillStyle = 'rgba(200, 232, 255, 0.22)';
      cctx.fillRect(x, y, w, Math.max(2, h * 0.28));

      if (lit) {
        const warm = seed > 0.72;
        ectx.fillStyle = warm ? '#ffd88a' : '#8fd8ff';
        ectx.fillRect(x + 1, y + 1, w - 2, h - 2);
      }
    }
    // Horizontal spandrel slab
    cctx.fillStyle = '#14192e';
    cctx.fillRect(0, r * rh, 256, 2);
  }

  const colorMap = new THREE.CanvasTexture(cc);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;

  const emissiveMap = new THREE.CanvasTexture(ec);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;

  return { colorMap, emissiveMap };
}

function createResFacadeTextures(): { colorMap: THREE.CanvasTexture; emissiveMap: THREE.CanvasTexture } {
  const [cc, cctx] = makeCanvas(256, 256);
  const [ec, ectx] = makeCanvas(256, 256);

  cctx.fillStyle = '#c8c2dc';
  cctx.fillRect(0, 0, 256, 256);
  ectx.fillStyle = '#000000';
  ectx.fillRect(0, 0, 256, 256);

  const cols = 6;
  const rows = 8;
  const cw = 256 / cols;
  const rh = 256 / rows;

  for (let r = 0; r < rows; r++) {
    cctx.fillStyle = 'rgba(70, 58, 102, 0.28)';
    cctx.fillRect(0, r * rh, 256, 2);
    for (let col = 0; col < cols; col++) {
      const seed = ((r * 19 + col * 29) % 11) / 11;
      const x = col * cw + 6;
      const y = r * rh + 6;
      const w = cw - 12;
      const h = rh - 10;
      cctx.fillStyle = '#334066';
      cctx.fillRect(x, y, w, h);
      if (seed > 0.35) {
        ectx.fillStyle = seed > 0.65 ? '#ffdf9e' : '#ffeec4';
        ectx.fillRect(x + 1, y + 1, w - 2, h - 2);
      }
    }
  }

  const colorMap = new THREE.CanvasTexture(cc);
  colorMap.colorSpace = THREE.SRGBColorSpace;
  colorMap.wrapS = colorMap.wrapT = THREE.RepeatWrapping;

  const emissiveMap = new THREE.CanvasTexture(ec);
  emissiveMap.colorSpace = THREE.SRGBColorSpace;
  emissiveMap.wrapS = emissiveMap.wrapT = THREE.RepeatWrapping;

  return { colorMap, emissiveMap };
}

function createRoadTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(256, 128);
  ctx.fillStyle = '#25263a';
  ctx.fillRect(0, 0, 256, 128);

  // Subtle asphalt grain
  for (let i = 0; i < 650; i++) {
    const gx = (i * 73) % 256;
    const gy = (i * 41) % 128;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.08)';
    ctx.fillRect(gx, gy, 2, 2);
  }
  // Edge curbs
  ctx.fillStyle = '#606285';
  ctx.fillRect(0, 0, 256, 6);
  ctx.fillRect(0, 122, 256, 6);
  // Center dashed line
  ctx.fillStyle = '#f5cb5c';
  for (let x = 8; x < 256; x += 40) {
    ctx.fillRect(x, 62, 22, 4);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(8, 1);
  return tex;
}

function createSolarTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#132752';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#60a5fa';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 128; i += 16) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 128);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(128, i);
    ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function createCropTexture(): THREE.CanvasTexture {
  const [c, ctx] = makeCanvas(128, 128);
  ctx.fillStyle = '#5c7c2c';
  ctx.fillRect(0, 0, 128, 128);
  for (let y = 0; y < 128; y += 12) {
    ctx.fillStyle = y % 24 === 0 ? '#749b36' : '#4a6620';
    ctx.fillRect(0, y, 128, 6);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export function createCityMaterialLibrary(maxAniso: number): CityMaterialLibrary {
  const glassTex = createCurtainWallTextures();
  const resTex = createResFacadeTextures();
  const roadTex = createRoadTexture();
  const solarTex = createSolarTexture();
  const cropTex = createCropTexture();

  const textures: THREE.Texture[] = [
    glassTex.colorMap,
    glassTex.emissiveMap,
    resTex.colorMap,
    resTex.emissiveMap,
    roadTex,
    solarTex,
    cropTex,
  ];
  const aniso = Math.min(4, Math.max(1, maxAniso));
  for (const t of textures) t.anisotropy = aniso;

  const glassFacade = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: glassTex.colorMap,
    emissive: new THREE.Color(0xffffff),
    emissiveMap: glassTex.emissiveMap,
    emissiveIntensity: 0.15,
    roughness: 0.16,
    metalness: 0.72,
    clearcoat: 0.85,
    clearcoatRoughness: 0.12,
    envMapIntensity: 1.25,
  });

  const resFacade = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: resTex.colorMap,
    emissive: new THREE.Color(0xffdfa3),
    emissiveMap: resTex.emissiveMap,
    emissiveIntensity: 0.12,
    roughness: 0.72,
    metalness: 0.08,
  });

  const industrialFacade = new THREE.MeshStandardMaterial({
    color: 0x677189,
    roughness: 0.56,
    metalness: 0.42,
  });

  const concreteBase = new THREE.MeshStandardMaterial({
    color: 0xc2bfd6,
    roughness: 0.84,
    metalness: 0.05,
  });

  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x2b3048,
    roughness: 0.36,
    metalness: 0.82,
  });

  const brightSteel = new THREE.MeshStandardMaterial({
    color: 0xd9e1f2,
    roughness: 0.25,
    metalness: 0.78,
  });

  const goldAccent = new THREE.MeshStandardMaterial({
    color: 0xf4be47,
    roughness: 0.26,
    metalness: 0.85,
    emissive: new THREE.Color(0x523400),
    emissiveIntensity: 0.12,
  });

  const solarMat = new THREE.MeshPhysicalMaterial({
    color: 0xffffff,
    map: solarTex,
    roughness: 0.14,
    metalness: 0.65,
    clearcoat: 1.0,
  });

  const roofSlate = new THREE.MeshStandardMaterial({
    color: 0x454969,
    roughness: 0.76,
    metalness: 0.15,
  });

  const roofRed = new THREE.MeshStandardMaterial({
    color: 0xb94a5b,
    roughness: 0.72,
    metalness: 0.08,
  });

  const roofBlue = new THREE.MeshStandardMaterial({
    color: 0x3b82f6,
    roughness: 0.45,
    metalness: 0.22,
  });

  const foliageGreen = new THREE.MeshStandardMaterial({
    color: 0x2ea66f,
    roughness: 0.85,
    metalness: 0.0,
  });

  const trunkBrown = new THREE.MeshStandardMaterial({
    color: 0x6b4730,
    roughness: 0.92,
    metalness: 0.0,
  });

  const cropMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: cropTex,
    roughness: 0.9,
    metalness: 0,
  });

  const tarmacMat = new THREE.MeshStandardMaterial({
    color: 0x23253a,
    roughness: 0.86,
    metalness: 0.06,
  });

  const roadMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: roadTex,
    roughness: 0.82,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const waterMat = new THREE.MeshPhysicalMaterial({
    color: 0x165f9e,
    roughness: 0.12,
    metalness: 0.18,
    clearcoat: 0.9,
    clearcoatRoughness: 0.08,
    envMapIntensity: 1.3,
  });

  const plotPadMat = new THREE.MeshStandardMaterial({
    color: 0x241d4e,
    roughness: 0.88,
    metalness: 0.08,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1,
  });

  const plotOutlineMat = new THREE.MeshBasicMaterial({
    color: 0x8b6eff,
    transparent: true,
    opacity: 0.48,
  });

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xff6fa5,
    emissive: new THREE.Color(0xff4785),
    emissiveIntensity: 1.1,
    roughness: 0.2,
  });

  const emissiveGlassMat = new THREE.MeshStandardMaterial({
    color: 0x8fe3ff,
    emissive: new THREE.Color(0x52c7ff),
    emissiveIntensity: 0.4,
    roughness: 0.18,
    metalness: 0.5,
  });

  const emissiveWarmMat = new THREE.MeshStandardMaterial({
    color: 0xffe09c,
    emissive: new THREE.Color(0xffbb45),
    emissiveIntensity: 0.35,
    roughness: 0.3,
  });

  const materials: THREE.Material[] = [
    glassFacade,
    resFacade,
    industrialFacade,
    concreteBase,
    darkSteel,
    brightSteel,
    goldAccent,
    solarMat,
    roofSlate,
    roofRed,
    roofBlue,
    foliageGreen,
    trunkBrown,
    cropMat,
    tarmacMat,
    roadMat,
    waterMat,
    plotPadMat,
    plotOutlineMat,
    beaconMat,
    emissiveGlassMat,
    emissiveWarmMat,
  ];

  return {
    textures,
    materials,
    geometries: [],
    glassFacade,
    resFacade,
    industrialFacade,
    concreteBase,
    darkSteel,
    brightSteel,
    goldAccent,
    solarMat,
    roofSlate,
    roofRed,
    roofBlue,
    foliageGreen,
    trunkBrown,
    cropMat,
    tarmacMat,
    roadMat,
    waterMat,
    plotPadMat,
    plotOutlineMat,
    beaconMat,
    emissiveGlassMat,
    emissiveWarmMat,
    setTextureQuality(q: TextureQuality, maxAnisoCap: number) {
      const targetAniso = q === 'low' ? 1 : q === 'medium' ? Math.min(2, maxAnisoCap) : Math.min(4, maxAnisoCap);
      const minF = q === 'low' ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter;
      for (const tex of textures) {
        tex.anisotropy = targetAniso;
        tex.minFilter = minF;
        tex.needsUpdate = true;
      }
    },
    setNightFactor(night: number) {
      const clamped = Math.max(0, Math.min(1, night));
      glassFacade.emissiveIntensity = 0.08 + clamped * 1.15;
      resFacade.emissiveIntensity = 0.04 + clamped * 1.05;
      emissiveGlassMat.emissiveIntensity = 0.25 + clamped * 0.95;
      emissiveWarmMat.emissiveIntensity = 0.18 + clamped * 1.1;
      beaconMat.emissiveIntensity = 0.65 + clamped * 1.3;
    },
    setReflections(enabled: boolean) {
      const mult = enabled ? 1.0 : 0.12;
      glassFacade.envMapIntensity = 1.25 * mult;
      waterMat.envMapIntensity = 1.3 * mult;
      brightSteel.envMapIntensity = 1.0 * mult;
      goldAccent.envMapIntensity = 1.0 * mult;
    },
    dispose() {
      for (const g of this.geometries) g.dispose();
      for (const m of materials) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}

// Helper to add a grounded box mesh anchored by bottom-center at (x, yBottom, z)
function addBox(
  group: THREE.Group,
  w: number,
  h: number,
  d: number,
  x: number,
  yBottom: number,
  z: number,
  mat: THREE.Material,
  castShadow = true,
  receiveShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, yBottom + h * 0.5, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  group.add(mesh);
  return mesh;
}

function addCyl(
  group: THREE.Group,
  rt: number,
  rb: number,
  h: number,
  seg: number,
  x: number,
  yBottom: number,
  z: number,
  mat: THREE.Material,
  castShadow = true,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  mesh.position.set(x, yBottom + h * 0.5, z);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  group.add(mesh);
  return mesh;
}

function addTrimBase(group: THREE.Group, w: number, d: number, tintHex: string, lib: CityMaterialLibrary) {
  // Grounded concrete plaza apron
  addBox(group, w - 0.6, 0.28, d - 0.6, 0, 0, 0, lib.concreteBase, false, true);
  // Subtle accent curb around front edge
  const accent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(tintHex),
    roughness: 0.45,
    metalness: 0.35,
  });
  lib.materials.push(accent);
  addBox(group, w - 0.4, 0.14, 0.35, 0, 0.02, d * 0.5 - 0.35, accent, false, true);
  return accent;
}

/**
 * Constructs a rich 3-12 part procedural 3D architectural model for any plot + level (1..5) + count.
 * Also supports vacant zoned plots (`count === 0`) so players can visually explore and build directly in 3D!
 */
export function buildPlotGroup(params: {
  plot: CityPlotDef;
  def: BuildingDef;
  count: number;
  level: number;
  underConstruction: boolean;
  lib: CityMaterialLibrary;
  animatedParts: AnimatedCityPart[];
}): THREE.Group {
  const { plot, def, count, level, underConstruction, lib, animatedParts } = params;
  const g = new THREE.Group();
  g.position.set(plot.x, 0, plot.z);
  g.name = `plot:${plot.id}`;

  const { w, d, archetype } = plot;
  const rawLvl = Math.max(1, Math.min(50, Math.floor(level || 1)));
  // Smooth logarithmic progression across Lv 1..50 so upgrades visibly enrich the skyline up to Lv 50 without skybox clipping
  const lv = 1 + Math.log1p(rawLvl - 1) * 0.85;
  const tierScale = count > 0 ? 1 + Math.min(0.32, Math.log1p(count) * 0.08) + (lv - 1) * 0.14 : 1;

  // Vacant lot (count === 0): crisp architectural survey pad + corner bollards + center marker
  if (count <= 0) {
    addBox(g, w - 0.8, 0.12, d - 0.8, 0, 0, 0, lib.plotPadMat, false, true);
    const frameW = w - 1.0;
    const frameD = d - 1.0;
    addBox(g, frameW, 0.08, 0.16, 0, 0.09, -frameD * 0.5, lib.plotOutlineMat, false, false);
    addBox(g, frameW, 0.08, 0.16, 0, 0.09, frameD * 0.5, lib.plotOutlineMat, false, false);
    addBox(g, 0.16, 0.08, frameD, -frameW * 0.5, 0.09, 0, lib.plotOutlineMat, false, false);
    addBox(g, 0.16, 0.08, frameD, frameW * 0.5, 0.09, 0, lib.plotOutlineMat, false, false);
    const corners: [number, number][] = [
      [-frameW * 0.45, -frameD * 0.45],
      [frameW * 0.45, -frameD * 0.45],
      [-frameW * 0.45, frameD * 0.45],
      [frameW * 0.45, frameD * 0.45],
    ];
    for (const [cx, cz] of corners) {
      addCyl(g, 0.14, 0.18, 0.65, 6, cx, 0.1, cz, lib.goldAccent, false);
    }
    // Low central hologram plinth showing zoned status
    addCyl(g, 0.55, 0.72, 0.25, 8, 0, 0.12, 0, lib.darkSteel, false);
    attachPlotProxy(g, plot, 2.4);
    return g;
  }

  const accent = addTrimBase(g, w, d, def.c, lib);

  switch (archetype) {
    case 'skyscraper':
    case 'corporate':
    case 'financial':
    case 'trade':
    case 'hotel': {
      const hMain = (archetype === 'financial' ? 14 : archetype === 'corporate' ? 12.5 : 10.5) * tierScale;
      // Podium lobby + glass entrance canopy
      addBox(g, w * 0.78, 2.2, d * 0.78, 0, 0.28, 0, lib.concreteBase);
      addBox(g, w * 0.42, 0.28, 1.8, 0, 1.75, d * 0.42, lib.emissiveGlassMat, false);
      // Main glass curtain wall tower
      addBox(g, w * 0.54, hMain, d * 0.54, 0, 2.48, 0, lib.glassFacade);
      // Vertical structural fins
      addBox(g, 0.35, hMain + 0.3, d * 0.58, -w * 0.26, 2.48, 0, lib.brightSteel);
      addBox(g, 0.35, hMain + 0.3, d * 0.58, w * 0.26, 2.48, 0, lib.brightSteel);
      // Crown setback + glowing rim & spire
      addBox(g, w * 0.4, 1.5 + lv * 0.35, d * 0.4, 0, 2.48 + hMain, 0, accent);
      if (lv >= 2) {
        const crownY = 2.48 + hMain + 1.5 + lv * 0.35;
        addBox(g, w * 0.26, 0.35, d * 0.26, 0, crownY, 0, lib.emissiveGlassMat, false);
        addCyl(g, 0.08, 0.22, 2.2 + lv * 0.6, 8, 0, crownY + 0.35, 0, lib.brightSteel);
        const beacon = addCyl(g, 0.16, 0.16, 0.24, 8, 0, crownY + 2.55 + lv * 0.6, 0, lib.beaconMat, false);
        animatedParts.push({ obj: beacon, kind: 'beacon', speed: 2.2, phase: plot.x * 0.3 });
      }
      // Secondary companion tower when count >= 5
      if (count >= 5) {
        addBox(g, w * 0.24, hMain * 0.65, d * 0.26, -w * 0.29, 2.48, -d * 0.12, lib.glassFacade);
      }
      break;
    }

    case 'capitol':
    case 'bank': {
      // Grand neoclassical colonnade + steps + golden dome
      addBox(g, w * 0.85, 0.8, d * 0.78, 0, 0.28, 0, lib.concreteBase);
      addBox(g, w * 0.74, 3.0 + lv * 0.35, d * 0.62, 0, 1.08, -0.3, lib.concreteBase);
      // Side legislative wings
      addBox(g, w * 0.24, 2.4, d * 0.52, -w * 0.28, 1.08, 0.2, lib.concreteBase);
      addBox(g, w * 0.24, 2.4, d * 0.52, w * 0.28, 1.08, 0.2, lib.concreteBase);
      // Front Corinthian columns
      for (let i = -2; i <= 2; i++) {
        addCyl(g, 0.22, 0.25, 2.8, 8, i * 1.1, 1.08, d * 0.29, lib.brightSteel);
      }
      // Pediment & Dome
      const roofY = 4.08 + lv * 0.35;
      addCyl(g, 2.1, 2.35, 1.4, 16, 0, roofY, -0.2, lib.brightSteel);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(2.05, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
        archetype === 'capitol' ? lib.goldAccent : lib.brightSteel,
      );
      dome.position.set(0, roofY + 1.35, -0.2);
      dome.castShadow = true;
      g.add(dome);
      addCyl(g, 0.08, 0.16, 1.6, 8, 0, roofY + 3.3, -0.2, lib.goldAccent);
      break;
    }

    case 'house_small':
    case 'apartment':
    case 'res_tower':
    case 'luxury_res':
    case 'smart_res': {
      if (archetype === 'house_small' || archetype === 'luxury_res') {
        const numHouses = count >= 4 ? 4 : 2;
        const offsets: [number, number][] =
          numHouses === 4
            ? [
                [-w * 0.23, -d * 0.22],
                [w * 0.23, -d * 0.22],
                [-w * 0.23, d * 0.22],
                [w * 0.23, d * 0.22],
              ]
            : [
                [-w * 0.22, 0],
                [w * 0.22, 0],
              ];
        for (const [ox, oz] of offsets) {
          const bw = archetype === 'luxury_res' ? 3.8 : 3.2;
          const bh = (archetype === 'luxury_res' ? 2.5 : 1.7) + lv * 0.25;
          addBox(g, bw, bh, 3.0, ox, 0.28, oz, lib.resFacade);
          const roof = new THREE.Mesh(
            new THREE.ConeGeometry(bw * 0.78, 1.35, 4),
            archetype === 'luxury_res' ? lib.roofBlue : lib.roofRed,
          );
          roof.rotation.y = Math.PI * 0.25;
          roof.position.set(ox, 0.28 + bh + 0.67, oz);
          roof.castShadow = true;
          g.add(roof);
          if (archetype === 'luxury_res') {
            addBox(g, 1.4, 0.08, 1.1, ox, 0.3, oz + 2.0, lib.waterMat, false);
          }
        }
      } else {
        const towers = count >= 4 ? 2 : 1;
        const baseH = archetype === 'res_tower' ? 9.2 : archetype === 'smart_res' ? 8.4 : 5.4;
        const th = baseH + lv * 1.1;
        for (let t = 0; t < towers; t++) {
          const ox = towers === 2 ? (t === 0 ? -w * 0.21 : w * 0.21) : 0;
          addBox(g, w * 0.38, th, d * 0.56, ox, 0.28, 0, lib.resFacade);
          addBox(g, w * 0.41, 0.35, d * 0.59, ox, 0.28 + th, 0, lib.roofSlate);
          if (archetype === 'smart_res') {
            addBox(g, w * 0.34, 0.25, d * 0.44, ox, 0.65 + th, 0, lib.solarMat, false);
            addBox(g, w * 0.3, 0.18, d * 0.3, ox, 0.9 + th, 0, lib.foliageGreen, false);
          }
        }
      }
      break;
    }

    case 'market':
    case 'mall':
    case 'convention': {
      addBox(g, w * 0.84, 2.2 + lv * 0.45, d * 0.74, 0, 0.28, 0, lib.concreteBase);
      // Skylight glass atrium
      addBox(g, w * 0.62, 1.1 + lv * 0.2, d * 0.44, 0, 2.48 + lv * 0.45, 0, lib.glassFacade);
      // Accent signage marquee band
      addBox(g, w * 0.86, 0.5, d * 0.76, 0, 2.1 + lv * 0.45, 0, accent);
      if (archetype === 'market') {
        for (let s = -2; s <= 2; s++) {
          addBox(g, 1.3, 0.9, 1.3, s * 1.7, 0.28, d * 0.42, s % 2 === 0 ? lib.roofRed : lib.goldAccent);
        }
      }
      break;
    }

    case 'stadium': {
      // Elliptical arena bowl + illuminated turf + roof ring + floodlights
      addCyl(g, w * 0.42, w * 0.45, 2.6 + lv * 0.35, 24, 0, 0.28, 0, lib.concreteBase);
      addCyl(g, w * 0.3, w * 0.3, 0.3, 24, 0, 0.32, 0, lib.foliageGreen, false);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(w * 0.38, 0.55, 8, 24),
        accent,
      );
      ring.rotation.x = Math.PI * 0.5;
      ring.position.set(0, 2.9 + lv * 0.35, 0);
      ring.castShadow = true;
      g.add(ring);
      for (const [fx, fz] of [
        [-w * 0.35, -d * 0.32],
        [w * 0.35, -d * 0.32],
        [-w * 0.35, d * 0.32],
        [w * 0.35, d * 0.32],
      ]) {
        addCyl(g, 0.14, 0.2, 4.4, 6, fx, 0.28, fz, lib.brightSteel);
        addBox(g, 0.9, 0.4, 0.3, fx, 4.65, fz, lib.emissiveWarmMat, false);
      }
      break;
    }

    case 'factory_small':
    case 'factory':
    case 'steel_plant':
    case 'auto_factory':
    case 'electronics_factory':
    case 'heavy_industry':
    case 'robotics_plant':
    case 'food_plant': {
      const hHall = (archetype === 'heavy_industry' || archetype === 'steel_plant' ? 3.8 : 2.8) + lv * 0.35;
      addBox(g, w * 0.78, hHall, d * 0.66, -0.3, 0.28, 0, lib.industrialFacade);
      // Sawtooth roof bays
      for (let b = -1; b <= 1; b++) {
        addBox(g, w * 0.22, 0.85, d * 0.62, b * (w * 0.24) - 0.3, 0.28 + hHall, 0, accent);
      }
      // Smokestacks / Cooling vents
      const numStacks = archetype === 'heavy_industry' || archetype === 'steel_plant' ? 3 : 2;
      for (let s = 0; s < numStacks; s++) {
        const sx = w * 0.34;
        const sz = -d * 0.2 + s * 2.0;
        addCyl(g, 0.32, 0.45, 5.2 + lv * 0.7, 10, sx, 0.28, sz, lib.darkSteel);
        addCyl(g, 0.34, 0.34, 0.45, 10, sx, 5.48 + lv * 0.7, sz, lib.roofRed, false);
      }
      if (archetype === 'electronics_factory' || archetype === 'robotics_plant') {
        addBox(g, w * 0.46, 0.24, d * 0.46, -0.3, 1.2 + hHall, 0, lib.emissiveGlassMat, false);
      }
      if (archetype === 'robotics_plant') {
        const arm = addBox(g, 0.36, 2.2, 0.36, -w * 0.26, 1.44 + hHall, 0, lib.goldAccent);
        animatedParts.push({ obj: arm, kind: 'radar', speed: 1.4, phase: plot.x * 0.2 });
      }
      break;
    }

    case 'solar': {
      addBox(g, w * 0.22, 1.4, d * 0.3, -w * 0.32, 0.28, 0, lib.concreteBase);
      for (let rx = -1; rx <= 2; rx++) {
        for (let rz = -1; rz <= 1; rz++) {
          const panel = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.14, 2.2), lib.solarMat);
          panel.position.set(rx * 2.7 + 0.6, 1.15, rz * 2.9);
          panel.rotation.x = 0.42;
          panel.castShadow = true;
          g.add(panel);
          addCyl(g, 0.1, 0.12, 0.9, 6, rx * 2.7 + 0.6, 0.28, rz * 2.9, lib.darkSteel);
        }
      }
      break;
    }

    case 'wind': {
      const turbines = count >= 4 ? 4 : 3;
      for (let i = 0; i < turbines; i++) {
        const tx = (i - (turbines - 1) * 0.5) * 3.1;
        const tz = (i % 2 === 0 ? -1.4 : 1.4);
        const hTower = 6.8 + lv * 0.8;
        addCyl(g, 0.18, 0.34, hTower, 10, tx, 0.28, tz, lib.brightSteel);
        addBox(g, 0.6, 0.55, 1.1, tx, 0.28 + hTower, tz, lib.brightSteel);
        const hub = new THREE.Group();
        hub.position.set(tx, 0.55 + hTower, tz + 0.6);
        for (let b = 0; b < 3; b++) {
          const bladePivot = new THREE.Group();
          bladePivot.rotation.z = (b * Math.PI * 2) / 3;
          const blade = new THREE.Mesh(new THREE.BoxGeometry(0.22, 2.7, 0.08), lib.brightSteel);
          blade.position.y = 1.35;
          blade.castShadow = true;
          bladePivot.add(blade);
          hub.add(bladePivot);
        }
        g.add(hub);
        animatedParts.push({ obj: hub, kind: 'rotor', speed: 2.1 + i * 0.25, phase: i * 1.1 });
      }
      break;
    }

    case 'power_station':
    case 'nuclear':
    case 'hydro':
    case 'battery': {
      if (archetype === 'battery') {
        for (const bx of [-w * 0.28, 0, w * 0.28]) {
          addBox(g, w * 0.22, 2.2 + lv * 0.35, d * 0.64, bx, 0.28, 0, lib.darkSteel);
          addBox(g, w * 0.18, 0.25, d * 0.56, bx, 2.5 + lv * 0.35, 0, lib.emissiveGlassMat, false);
        }
      } else if (archetype === 'hydro') {
        addBox(g, w * 0.82, 3.6 + lv * 0.4, d * 0.36, 0, 0.28, -d * 0.16, lib.concreteBase);
        addBox(g, w * 0.78, 0.35, d * 0.42, 0, 0.3, d * 0.22, lib.waterMat, false);
        addBox(g, w * 0.36, 1.8, d * 0.24, 0, 3.9 + lv * 0.4, -d * 0.16, lib.roofBlue);
      } else if (archetype === 'nuclear') {
        addCyl(g, 2.0, 2.25, 4.4 + lv * 0.45, 16, -w * 0.18, 0.28, 0, lib.concreteBase);
        const dome = new THREE.Mesh(new THREE.SphereGeometry(2.0, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), lib.brightSteel);
        dome.position.set(-w * 0.18, 4.65 + lv * 0.45, 0);
        dome.castShadow = true;
        g.add(dome);
        addCyl(g, 1.2, 1.65, 5.2 + lv * 0.5, 14, w * 0.24, 0.28, 0, lib.concreteBase);
        addCyl(g, 1.25, 1.25, 0.35, 14, w * 0.24, 5.48 + lv * 0.5, 0, lib.emissiveGlassMat, false);
      } else {
        addBox(g, w * 0.42, 3.4 + lv * 0.3, d * 0.52, -w * 0.2, 0.28, 0, lib.industrialFacade);
        // Hyperboloid-like cooling towers
        for (const tz of [-d * 0.18, d * 0.18]) {
          addCyl(g, 1.25, 1.75, 5.4 + lv * 0.6, 14, w * 0.22, 0.28, tz, lib.concreteBase);
          addCyl(g, 1.3, 1.25, 0.5, 14, w * 0.22, 5.68 + lv * 0.6, tz, lib.goldAccent, false);
        }
      }
      break;
    }

    case 'airport': {
      // Runway tarmac + markings + passenger terminal + ATC tower + parked airliner
      addBox(g, w * 0.94, 0.22, d * 0.42, 0, 0.16, -d * 0.22, lib.tarmacMat, false, true);
      for (let m = -3; m <= 3; m++) {
        addBox(g, 1.6, 0.04, 0.22, m * 2.6, 0.38, -d * 0.22, lib.brightSteel, false, false);
      }
      // Terminal building
      addBox(g, w * 0.54, 2.3 + lv * 0.3, d * 0.28, -w * 0.12, 0.28, d * 0.24, lib.glassFacade);
      addBox(g, w * 0.56, 0.25, d * 0.3, -w * 0.12, 2.58 + lv * 0.3, d * 0.24, lib.brightSteel);
      // Control tower
      addCyl(g, 0.5, 0.72, 6.2 + lv * 0.6, 10, w * 0.28, 0.28, d * 0.24, lib.concreteBase);
      addCyl(g, 1.1, 0.75, 1.1, 10, w * 0.28, 6.48 + lv * 0.6, d * 0.24, lib.emissiveGlassMat, false);
      const radar = addBox(g, 1.3, 0.28, 0.18, w * 0.28, 7.7 + lv * 0.6, d * 0.24, lib.goldAccent);
      animatedParts.push({ obj: radar, kind: 'radar', speed: 1.6, phase: 0 });
      // Parked jet
      addCyl(g, 0.32, 0.32, 3.6, 8, -w * 0.22, 0.55, -d * 0.12, lib.brightSteel).rotation.z = Math.PI * 0.5;
      addBox(g, 0.9, 0.08, 3.4, -w * 0.22, 0.6, -d * 0.12, lib.roofBlue);
      break;
    }

    case 'port':
    case 'logistics': {
      // Concrete quay + stacked colorful shipping containers + gantry cranes + docked vessel
      addBox(g, w * 0.9, 0.45, d * 0.65, 0, 0.12, -d * 0.1, lib.concreteBase, false, true);
      const containerMats = [lib.roofRed, lib.roofBlue, lib.goldAccent, lib.foliageGreen];
      for (let c = 0; c < 6; c++) {
        const cx = -w * 0.3 + (c % 3) * 2.5;
        const cz = -d * 0.2 + Math.floor(c / 3) * 1.8;
        addBox(g, 2.0, 1.0, 1.1, cx, 0.57, cz, containerMats[c % containerMats.length]);
        if (lv >= 2) {
          addBox(g, 2.0, 1.0, 1.1, cx, 1.57, cz, containerMats[(c + 1) % containerMats.length]);
        }
      }
      // Gantry cranes
      for (const gx of [-w * 0.22, w * 0.22]) {
        addBox(g, 0.4, 4.8 + lv * 0.4, 0.4, gx, 0.57, d * 0.12, lib.roofRed);
        addBox(g, 0.45, 0.45, 5.2, gx, 5.2 + lv * 0.4, d * 0.16, lib.goldAccent);
      }
      if (archetype === 'port') {
        // Cargo ship moored alongside south quay
        addBox(g, 7.6, 1.1, 2.3, w * 0.16, 0.1, d * 0.42, lib.darkSteel);
        addBox(g, 1.6, 1.6, 1.9, w * 0.3, 1.2, d * 0.42, lib.brightSteel);
        addBox(g, 4.2, 0.9, 1.7, w * 0.08, 1.2, d * 0.42, lib.roofRed);
      }
      break;
    }

    case 'hospital': {
      // Medical cruciform pavilion + H-helipad + glowing beacon
      addBox(g, w * 0.72, 3.8 + lv * 0.75, d * 0.44, 0, 0.28, 0, lib.brightSteel);
      addBox(g, w * 0.44, 3.2 + lv * 0.65, d * 0.72, 0, 0.28, 0, lib.glassFacade);
      const topY = 4.08 + lv * 0.75;
      addBox(g, 2.2, 0.22, 0.65, 0, topY, 0, lib.roofRed, false);
      addBox(g, 0.65, 0.22, 2.2, 0, topY, 0, lib.roofRed, false);
      break;
    }

    case 'school':
    case 'university': {
      const isUni = archetype === 'university';
      addBox(g, w * 0.74, isUni ? 3.6 + lv * 0.5 : 2.6 + lv * 0.3, d * 0.58, 0, 0.28, 0, lib.resFacade);
      addBox(g, w * 0.78, 0.45, d * 0.62, 0, (isUni ? 3.88 + lv * 0.5 : 2.88 + lv * 0.3), 0, lib.roofRed);
      if (isUni) {
        addBox(g, 1.8, 5.2 + lv * 0.6, 1.8, 0, 0.28, -d * 0.1, lib.concreteBase);
        addBox(g, 1.95, 0.5, 1.95, 0, 5.48 + lv * 0.6, -d * 0.1, lib.goldAccent);
        addBox(g, 1.2, 0.8, 0.15, 0, 4.4 + lv * 0.6, -d * 0.1 + 0.95, lib.emissiveWarmMat, false);
      }
      break;
    }

    case 'police':
    case 'fire': {
      const isPolice = archetype === 'police';
      addBox(g, w * 0.68, 2.8 + lv * 0.4, d * 0.6, 0, 0.28, 0, lib.concreteBase);
      addBox(g, w * 0.7, 0.55, d * 0.62, 0, 3.08 + lv * 0.4, 0, isPolice ? lib.roofBlue : lib.roofRed);
      const siren = addCyl(g, 0.35, 0.4, 0.5, 8, 0, 3.65 + lv * 0.4, 0, isPolice ? lib.emissiveGlassMat : lib.beaconMat, false);
      animatedParts.push({ obj: siren, kind: 'beacon', speed: 3.4, phase: 0.4 });
      break;
    }

    case 'lab':
    case 'tech_park':
    case 'data_center':
    case 'ai_campus':
    case 'cyber_ops':
    case 'telecom': {
      if (archetype === 'data_center') {
        for (const ox of [-w * 0.22, w * 0.22]) {
          addBox(g, w * 0.36, 3.4 + lv * 0.55, d * 0.66, ox, 0.28, 0, lib.darkSteel);
          addBox(g, w * 0.38, 0.3, d * 0.68, ox, 2.1, 0, lib.emissiveGlassMat, false);
        }
      } else if (archetype === 'ai_campus') {
        addBox(g, w * 0.72, 2.4, d * 0.68, 0, 0.28, 0, lib.glassFacade);
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(1.75 + lv * 0.18, 0), lib.emissiveGlassMat);
        core.position.set(0, 4.8 + lv * 0.45, 0);
        g.add(core);
        animatedParts.push({ obj: core, kind: 'radar', speed: 1.05, phase: plot.z * 0.15 });
      } else if (archetype === 'cyber_ops') {
        addBox(g, w * 0.68, 3.2 + lv * 0.45, d * 0.58, 0, 0.28, 0, lib.darkSteel);
        addBox(g, w * 0.72, 0.28, d * 0.62, 0, 2.0, 0, accent, false);
        const dish = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.7, 10), lib.emissiveGlassMat);
        dish.position.set(w * 0.16, 4.2 + lv * 0.45, 0);
        dish.rotation.x = Math.PI * 0.3;
        g.add(dish);
        animatedParts.push({ obj: dish, kind: 'radar', speed: 1.2, phase: 0.4 });
      } else if (archetype === 'telecom') {
        addBox(g, w * 0.5, 2.4, d * 0.5, 0, 0.28, 0, lib.darkSteel);
        addCyl(g, 0.25, 0.75, 8.5 + lv * 1.1, 10, 0, 2.68, 0, lib.brightSteel);
        const dish = new THREE.Mesh(new THREE.ConeGeometry(1.4, 0.9, 12), lib.emissiveGlassMat);
        dish.position.set(0, 9.2 + lv * 1.1, 0.5);
        dish.rotation.x = Math.PI * 0.35;
        g.add(dish);
        animatedParts.push({ obj: dish, kind: 'radar', speed: 0.9, phase: 0.2 });
      } else {
        addBox(g, w * 0.7, 3.2 + lv * 0.55, d * 0.62, 0, 0.28, 0, lib.glassFacade);
        const dome = new THREE.Mesh(
          new THREE.SphereGeometry(2.1, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.5),
          lib.brightSteel,
        );
        dome.position.set(0, 3.48 + lv * 0.55, 0);
        dome.castShadow = true;
        g.add(dome);
      }
      break;
    }

    case 'monument': {
      addBox(g, w * 0.62, 1.2, d * 0.62, 0, 0.28, 0, lib.concreteBase);
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 1.25, 8.5 + lv * 1.1, 4), lib.goldAccent);
      obelisk.rotation.y = Math.PI * 0.25;
      obelisk.position.set(0, 1.48 + (8.5 + lv * 1.1) * 0.5, 0);
      obelisk.castShadow = true;
      g.add(obelisk);
      const beacon = addCyl(g, 0.25, 0.25, 0.35, 8, 0, 10.1 + lv * 1.1, 0, lib.beaconMat, false);
      animatedParts.push({ obj: beacon, kind: 'beacon', speed: 2.0, phase: 0.7 });
      break;
    }

    case 'space': {
      // Mission control wing + gantry launch tower + upright rocket
      addBox(g, w * 0.45, 2.6 + lv * 0.3, d * 0.55, -w * 0.22, 0.28, 0, lib.glassFacade);
      // Launchpad plinth
      addBox(g, 4.6, 0.7, 4.6, w * 0.2, 0.28, 0, lib.darkSteel);
      // Truss gantry
      addBox(g, 0.7, 10.5 + lv * 0.9, 0.7, w * 0.32, 0.98, -0.8, lib.roofRed);
      // Rocket body + fairing + boosters
      addCyl(g, 0.58, 0.62, 8.2 + lv * 0.8, 12, w * 0.16, 0.98, 0.4, lib.brightSteel);
      const cone = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1.8, 12), lib.goldAccent);
      cone.position.set(w * 0.16, 10.0 + lv * 0.8, 0.4);
      cone.castShadow = true;
      g.add(cone);
      break;
    }

    case 'farm':
    case 'greenhouse':
    case 'aquaculture': {
      if (archetype === 'aquaculture') {
        addBox(g, w * 0.86, 0.35, d * 0.7, 0, 0.14, 0, lib.concreteBase, false, true);
        for (const px of [-w * 0.24, w * 0.24]) {
          addCyl(g, 2.0, 2.1, 0.7, 16, px, 0.45, 0, lib.waterMat, false);
        }
        addBox(g, w * 0.26, 2.0 + lv * 0.2, d * 0.36, 0, 0.48, -d * 0.18, lib.roofBlue);
      } else if (archetype === 'farm') {
        addBox(g, w * 0.55, 0.12, d * 0.75, -w * 0.16, 0.24, 0, lib.cropMat, false, true);
        addBox(g, 3.2, 2.1 + lv * 0.2, 2.6, w * 0.24, 0.28, -d * 0.14, lib.roofRed);
        addCyl(g, 0.75, 0.75, 3.8 + lv * 0.4, 12, w * 0.32, 0.28, d * 0.2, lib.brightSteel);
      } else {
        for (const gx of [-w * 0.22, w * 0.22]) {
          addBox(g, w * 0.36, 1.8 + lv * 0.25, d * 0.66, gx, 0.28, 0, lib.emissiveGlassMat);
          addBox(g, w * 0.38, 0.24, d * 0.68, gx, 2.08 + lv * 0.25, 0, lib.foliageGreen);
        }
      }
      break;
    }

    case 'water_plant': {
      addBox(g, w * 0.35, 2.2 + lv * 0.3, d * 0.55, -w * 0.24, 0.28, 0, lib.concreteBase);
      for (const tz of [-d * 0.18, d * 0.18]) {
        addCyl(g, 1.8, 1.9, 1.0, 16, w * 0.18, 0.28, tz, lib.concreteBase);
        addCyl(g, 1.6, 1.6, 0.16, 16, w * 0.18, 1.25, tz, lib.waterMat, false);
      }
      break;
    }

    case 'road_hub':
    case 'highway':
    case 'railway':
    case 'transit':
    default: {
      // Elevated viaduct arch / transit canopy
      addBox(g, w * 0.85, 0.55, d * 0.44, 0, 2.2 + lv * 0.2, 0, lib.darkSteel);
      for (const px of [-w * 0.3, 0, w * 0.3]) {
        addCyl(g, 0.35, 0.45, 2.2 + lv * 0.2, 8, px, 0.28, 0, lib.concreteBase);
      }
      addBox(g, w * 0.55, 1.6 + lv * 0.25, d * 0.3, 0, 2.75 + lv * 0.2, 0, accent);
      break;
    }
  }

  // Construction scaffolding crane indicator while building/upgrading
  if (underConstruction) {
    addBox(g, 0.38, 8.8, 0.38, w * 0.38, 0.28, -d * 0.34, lib.goldAccent);
    const jib = addBox(g, 5.2, 0.34, 0.34, w * 0.22, 8.8, -d * 0.34, lib.goldAccent);
    animatedParts.push({ obj: jib, kind: 'radar', speed: 0.7, phase: 0 });
  }

  // Invisible raycast proxy box sized tightly around the plot + height so hover/clicks are always fast & accurate
  const hitHeight = Math.max(4.5, 4.5 + lv * 1.4);
  const hitBox = new THREE.Mesh(
    new THREE.BoxGeometry(w, hitHeight, d),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitBox.position.set(0, hitHeight * 0.5, 0);
  hitBox.userData = { plotId: plot.id };
  hitBox.layers.set(1);
  g.add(hitBox);

  // Also tag vacant lot hitBox properly
  return g;
}

export function attachPlotProxy(group: THREE.Group, plot: CityPlotDef, height = 4.2) {
  const existing = group.children.find((c) => c.userData?.plotId === plot.id);
  if (existing) return;
  const hitBox = new THREE.Mesh(
    new THREE.BoxGeometry(plot.w, height, plot.d),
    new THREE.MeshBasicMaterial({ visible: false }),
  );
  hitBox.position.set(0, height * 0.5, 0);
  hitBox.userData = { plotId: plot.id };
  hitBox.layers.set(1);
  group.add(hitBox);
}

export const DIAMOND_LANDMARK_SLOTS: Record<string, { x: number; z: number; primary: number; accent: number }> = {
  asset_aurora_obelisk: { x: 6, z: 39, primary: 0x37e6a0, accent: 0x38bdf8 },
  asset_royal_fleet: { x: 23, z: 40, primary: 0xffc93c, accent: 0xfb7185 },
  asset_diamond_spire: { x: 38, z: 39, primary: 0x7ee8ff, accent: 0x9b6dff },
  asset_crystal_vault: { x: 54, z: 39, primary: 0xc084fc, accent: 0x7ee8ff },
  asset_solar_monolith: { x: -56, z: 39, primary: 0xfb923c, accent: 0xfde047 },
  asset_quantum_spire: { x: -38, z: 39, primary: 0x22d3ee, accent: 0xa855f7 },
  asset_imperial_pavilion: { x: -20, z: 40, primary: 0xfbbf24, accent: 0x34d399 },
  asset_celestial_observatory: { x: -72, z: 39, primary: 0x818cf8, accent: 0x7ee8ff },
  asset_sovereign_colossus: { x: 70, z: 39, primary: 0xfde047, accent: 0xf472b6 },
};

/**
 * Multi-part PBR architectural landmark rendered on the capital waterfront esplanade
 * whenever a player owns one of the Exclusive Diamond Assets.
 */
export function buildDiamondLandmarkGroup(params: {
  assetId: string;
  lib: CityMaterialLibrary;
  animatedParts: AnimatedCityPart[];
}): THREE.Group | null {
  const { assetId, lib, animatedParts } = params;
  const slot = DIAMOND_LANDMARK_SLOTS[assetId];
  if (!slot) return null;

  const g = new THREE.Group();
  g.position.set(slot.x, 0, slot.z);
  g.name = `diamond-asset:${assetId}`;

  const crystalMat = new THREE.MeshPhysicalMaterial({
    color: slot.primary,
    emissive: new THREE.Color(slot.primary),
    emissiveIntensity: 0.48,
    roughness: 0.1,
    metalness: 0.3,
    clearcoat: 1,
    envMapIntensity: 1.4,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: slot.accent,
    emissive: new THREE.Color(slot.accent),
    emissiveIntensity: 0.3,
    roughness: 0.25,
    metalness: 0.78,
  });

  // Grand tiered marble plinth
  addBox(g, 8.6, 0.45, 7.4, 0, 0, 0, lib.concreteBase, false, true);
  addBox(g, 6.8, 0.35, 5.8, 0, 0.45, 0, trimMat, false, true);

  if (assetId === 'asset_aurora_obelisk') {
    addBox(g, 2.4, 1.4, 2.4, 0, 0.8, 0, lib.brightSteel);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.15, 11.5, 4), crystalMat);
    shaft.rotation.y = Math.PI * 0.25;
    shaft.position.set(0, 7.95, 0);
    shaft.castShadow = true;
    g.add(shaft);
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.75, 0.14, 8, 24), trimMat);
    halo.position.set(0, 11.6, 0);
    halo.rotation.x = Math.PI * 0.35;
    g.add(halo);
    animatedParts.push({ obj: halo, kind: 'radar', speed: 1.15, phase: 0.2 });
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.95, 0), crystalMat);
    gem.position.set(0, 14.8, 0);
    g.add(gem);
    animatedParts.push({ obj: gem, kind: 'radar', speed: -1.4, phase: 0.5 });
  } else if (assetId === 'asset_royal_fleet') {
    addBox(g, 1.35, 7.8, 1.8, -2.55, 0.8, 0, lib.brightSteel);
    addBox(g, 1.35, 7.8, 1.8, 2.55, 0.8, 0, lib.brightSteel);
    addBox(g, 7.4, 1.3, 2.1, 0, 8.6, 0, trimMat);
    addBox(g, 5.8, 0.7, 1.5, 0, 9.9, 0, lib.goldAccent);
    const crest = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), crystalMat);
    crest.position.set(0, 11.9, 0);
    g.add(crest);
    animatedParts.push({ obj: crest, kind: 'radar', speed: 1.25, phase: 0.9 });
  } else if (assetId === 'asset_diamond_spire') {
    addBox(g, 4.4, 2.8, 4.4, 0, 0.8, 0, lib.glassFacade);
    addBox(g, 3.2, 9.6, 3.2, 0, 3.6, 0, lib.glassFacade);
    addBox(g, 3.4, 0.45, 3.4, 0, 8.2, 0, crystalMat, false);
    addBox(g, 3.4, 0.45, 3.4, 0, 13.0, 0, trimMat, false);
    const crown = new THREE.Mesh(new THREE.OctahedronGeometry(1.45, 0), crystalMat);
    crown.position.set(0, 15.6, 0);
    crown.scale.set(1, 1.55, 1);
    g.add(crown);
    animatedParts.push({ obj: crown, kind: 'radar', speed: 0.95, phase: 0.4 });
  } else if (assetId === 'asset_solar_monolith') {
    addBox(g, 3.2, 8.4, 1.6, 0, 0.8, 0, trimMat);
    addBox(g, 1.6, 10.2, 0.9, 0, 0.8, 0, crystalMat);
    const sunRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.16, 10, 28), crystalMat);
    sunRing.position.set(0, 10.8, 0);
    g.add(sunRing);
    animatedParts.push({ obj: sunRing, kind: 'radar', speed: 0.9, phase: 0.3 });
  } else if (assetId === 'asset_quantum_spire') {
    addCyl(g, 1.4, 2.1, 10.5, 8, 0, 0.8, 0, lib.glassFacade);
    const q1 = new THREE.Mesh(new THREE.TorusGeometry(2.3, 0.12, 8, 28), crystalMat);
    q1.position.set(0, 8.2, 0);
    q1.rotation.x = Math.PI * 0.32;
    g.add(q1);
    const q2 = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.12, 8, 28), trimMat);
    q2.position.set(0, 10.6, 0);
    q2.rotation.z = Math.PI * 0.28;
    g.add(q2);
    animatedParts.push({ obj: q1, kind: 'radar', speed: 1.4, phase: 0.1 });
    animatedParts.push({ obj: q2, kind: 'radar', speed: -1.6, phase: 0.8 });
    addCyl(g, 0.12, 0.35, 4.2, 8, 0, 11.3, 0, trimMat, false);
  } else if (assetId === 'asset_imperial_pavilion') {
    addCyl(g, 3.1, 3.3, 3.8, 12, 0, 0.8, 0, lib.concreteBase);
    for (let i = 0; i < 6; i += 1) {
      const a = (i / 6) * Math.PI * 2;
      addCyl(g, 0.24, 0.26, 3.8, 8, Math.cos(a) * 2.8, 0.8, Math.sin(a) * 2.8, trimMat);
    }
    const goldDome = new THREE.Mesh(
      new THREE.SphereGeometry(2.7, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52),
      crystalMat,
    );
    goldDome.position.set(0, 4.6, 0);
    g.add(goldDome);
    addCyl(g, 0.1, 0.25, 2.2, 6, 0, 7.2, 0, trimMat);
  } else if (assetId === 'asset_celestial_observatory') {
    addBox(g, 5.2, 3.2, 4.6, 0, 0.8, 0, lib.brightSteel);
    const obsDome = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      trimMat,
    );
    obsDome.position.set(0, 4.0, 0);
    g.add(obsDome);
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 4.2, 10), crystalMat);
    scope.position.set(0.6, 6.2, 0.6);
    scope.rotation.z = -Math.PI * 0.22;
    scope.rotation.x = Math.PI * 0.14;
    g.add(scope);
    animatedParts.push({ obj: scope, kind: 'radar', speed: 0.45, phase: 0.5 });
  } else if (assetId === 'asset_sovereign_colossus') {
    addBox(g, 3.6, 3.0, 3.6, 0, 0.8, 0, lib.brightSteel);
    addCyl(g, 0.9, 1.5, 9.8, 8, 0, 3.8, 0, trimMat);
    const torch = new THREE.Mesh(new THREE.OctahedronGeometry(1.55, 0), crystalMat);
    torch.position.set(0, 15.2, 0);
    torch.scale.set(1, 1.4, 1);
    g.add(torch);
    const crownRing = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.14, 8, 28), crystalMat);
    crownRing.position.set(0, 13.8, 0);
    crownRing.rotation.x = Math.PI * 0.5;
    g.add(crownRing);
    animatedParts.push({ obj: torch, kind: 'beacon', speed: 1.8, phase: 0.4 });
    animatedParts.push({ obj: crownRing, kind: 'radar', speed: 1.2, phase: 1.0 });
  } else {
    // asset_crystal_vault
    addBox(g, 6.2, 3.6, 5.0, 0, 0.8, 0, lib.concreteBase);
    for (const px of [-2.4, -0.8, 0.8, 2.4]) {
      addCyl(g, 0.22, 0.24, 3.4, 8, px, 0.8, 2.45, trimMat);
    }
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.35, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
      crystalMat,
    );
    dome.position.set(0, 4.4, 0);
    dome.castShadow = true;
    g.add(dome);
    const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.85, 0), crystalMat);
    beacon.position.set(0, 7.6, 0);
    g.add(beacon);
    animatedParts.push({ obj: beacon, kind: 'beacon', speed: 2.0, phase: 1.3 });
  }

  return g;
}

