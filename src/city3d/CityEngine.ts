import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { BUILDINGS } from '../game/constants';
import { DEFAULT_PERF_STATS, resolveNumericFpsCap } from '../game/graphics';
import { getConstructionQueue } from '../game/rules';
import type {
  CityTimeMode,
  CityWeatherMode,
  GameState,
  GraphicsSettings,
  RuntimePerfStats,
} from '../game/types';
import { getDiamondAssetBonuses } from '../game/cosmetics';
import {
  buildDiamondLandmarkGroup,
  buildPlotGroup,
  createCityMaterialLibrary,
  type AnimatedCityPart,
  type CityMaterialLibrary,
} from './buildingModels';
import { CITY_PLOTS, CITY_ROADS, PLOT_BY_ID, VEHICLE_LANES } from './cityLayout';

export type CameraPresetMode = 'overview' | 'aerial' | 'closeup' | 'harbor';

export interface CityEngineCallbacks {
  onSelectBuilding: (buildingId: string | null) => void;
  onHoverBuilding: (buildingId: string | null, clientX: number, clientY: number) => void;
  onPerfStats: (stats: RuntimePerfStats) => void;
  onWebglLostChange: (lost: boolean) => void;
}

// Pre-allocated scratch math helpers (zero allocations inside render loop)
const _v1 = new THREE.Vector3();
const _v2 = new THREE.Vector3();
const _v3 = new THREE.Vector3();
const _mat4 = new THREE.Matrix4();
const _quat = new THREE.Quaternion();
const _euler = new THREE.Euler();
const _scale = new THREE.Vector3();
const _color = new THREE.Color();
const _sunsetColor = new THREE.Color(0xd97d6b);
const _nightColor = new THREE.Color(0x13102e);
const _overcastColor = new THREE.Color(0x4f5b75);
const _rayMouse = new THREE.Vector2();

const BUILDING_BY_ID = Object.fromEntries(BUILDINGS.map((b) => [b.id, b]));

function detectSoftwareWebGL(): { isSoftware: boolean; rendererName: string; webglSupported: boolean } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) {
      return { isSoftware: true, rendererName: 'WebGL Unavailable', webglSupported: false };
    }
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || 'WebGL Renderer');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    const isSoftware = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    return { isSoftware, rendererName: gpu, webglSupported: true };
  } catch {
    return { isSoftware: true, rendererName: 'WebGL Unavailable', webglSupported: false };
  }
}

interface VehicleActor {
  laneIdx: number;
  pos: number;
  speedMult: number;
}

interface PedestrianActor {
  cx: number;
  cz: number;
  radius: number;
  angle: number;
  speed: number;
}

export class CityEngine {
  private container: HTMLElement;
  private callbacks: CityEngineCallbacks;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private lib: CityMaterialLibrary;
  private pmremTex: THREE.Texture | null = null;
  private envRt: THREE.WebGLRenderTarget | null = null;

  private hemiLight: THREE.HemisphereLight;
  private sunLight: THREE.DirectionalLight;
  private rimLight: THREE.DirectionalLight;
  private fog: THREE.FogExp2;

  private plotGroups = new Map<string, THREE.Group>();
  private plotSignatures = new Map<string, string>();
  private diamondLandmarkGroups = new Map<string, THREE.Group>();
  private diamondAssetSig = '';
  private hitMeshes: THREE.Object3D[] = [];
  private animatedParts: AnimatedCityPart[] = [];

  private hoverRing: THREE.Mesh;
  private selectRing: THREE.Mesh;
  private selectedId: string | null = null;
  private hoveredId: string | null = null;

  private carMesh: THREE.InstancedMesh;
  private cars: VehicleActor[] = [];
  private pedMesh: THREE.InstancedMesh;
  private peds: PedestrianActor[] = [];
  private rainPoints: THREE.Points;
  private rainPositions: Float32Array;

  private raycaster = new THREE.Raycaster();
  private isSoftwareGl: boolean;
  private rendererName: string;
  private settings: GraphicsSettings;
  private timeMode: CityTimeMode = 'auto';
  private weatherMode: CityWeatherMode = 'clear';
  private activeTimePhase = 0.28; // 0..1 day cycle (0.25 noon, 0.52 sunset, 0.78 night)
  private paused = false;
  private visible = true;
  private disposed = false;

  // Frame loop & FPS pacing
  private frameId = 0;
  private loopScheduled = false;
  private loopKind: 'raf' | 'timeout' | null = null;
  private lastTickMs = performance.now();
  private lastRenderMs = performance.now();
  private fpsSamples: number[] = [];
  private lastStatsPushMs = 0;
  private adaptiveStepDown = 0;
  private slowFrameStreak = 0;
  private fastFrameStreak = 0;

  // Camera transition target
  private camGoalPos: THREE.Vector3 | null = null;
  private camGoalTarget: THREE.Vector3 | null = null;

  // Input state
  private keysPressed = new Set<string>();
  private pointerDownPos = { x: 0, y: 0, t: 0 };
  private lastHoverRaycastMs = 0;
  private resizeObserver: ResizeObserver | null = null;
  private modalObserver: MutationObserver | null = null;

  // Bound listeners for clean removal
  private onPointerDownBound: (e: PointerEvent) => void;
  private onPointerMoveBound: (e: PointerEvent) => void;
  private onPointerUpBound: (e: PointerEvent) => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onVisibilityChangeBound: () => void;
  private onContextLostBound: (e: Event) => void;
  private onContextRestoredBound: () => void;
  private onResizeBound: () => void;

  constructor(
    container: HTMLElement,
    initialSettings: GraphicsSettings,
    callbacks: CityEngineCallbacks,
  ) {
    this.container = container;
    this.settings = { ...initialSettings };
    this.callbacks = callbacks;

    const probe = detectSoftwareWebGL();
    this.isSoftwareGl = probe.isSoftware;
    this.rendererName = probe.rendererName;
    if (!probe.webglSupported) {
      throw new Error('WEBGL_UNSUPPORTED');
    }

    const width = Math.max(300, container.clientWidth || 800);
    const height = Math.max(220, container.clientHeight || 360);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl && initialSettings.antiAliasing !== 'off',
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setSize(width, height, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.setAttribute('data-testid', 'city3d-canvas');
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x88b4e6);
    this.fog = new THREE.FogExp2(0x88b4e6, 0.0028);
    this.scene.fog = this.fog;

    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.8, 520);
    this.camera.position.set(56, 48, 72);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 2, -6);
    this.controls.minDistance = 14;
    this.controls.maxDistance = 175;
    this.controls.maxPolarAngle = Math.PI * 0.46;
    this.controls.minPolarAngle = 0.14;
    this.controls.enableDamping = !this.isSoftwareGl;
    this.controls.dampingFactor = 0.075;
    this.controls.panSpeed = 0.9;
    this.controls.rotateSpeed = 0.85;
    this.controls.zoomSpeed = 0.95;
    this.controls.addEventListener('start', () => {
      // Cancel automated preset fly-to if user touches controls
      this.camGoalPos = null;
      this.camGoalTarget = null;
    });

    // Studio IBL environment map (required for realistic PBR metals/glass on ALL devices)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.envRt = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    this.pmremTex = this.envRt.texture;
    this.scene.environment = this.pmremTex;
    pmremGenerator.dispose();

    // Warm key + Cool fill + Rim 3-point atmospheric lighting rig
    this.hemiLight = new THREE.HemisphereLight(0xaad2ff, 0x3b3556, 0.72);
    this.scene.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.1);
    this.sunLight.position.set(58, 76, 44);
    this.sunLight.shadow.camera.left = -88;
    this.sunLight.shadow.camera.right = 88;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 230;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    this.rimLight = new THREE.DirectionalLight(0x9b8bff, 0.55);
    this.rimLight.position.set(-60, 32, -55);
    this.scene.add(this.rimLight);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.lib = createCityMaterialLibrary(maxAniso);

    this.buildStaticTerrainAndInfrastructure();

    // Hover & Selection ring markers
    const ringGeo = new THREE.RingGeometry(4.8, 5.5, 32);
    ringGeo.rotateX(-Math.PI * 0.5);
    this.hoverRing = new THREE.Mesh(
      ringGeo,
      new THREE.MeshBasicMaterial({ color: 0x5ccbff, transparent: true, opacity: 0.72, side: THREE.DoubleSide }),
    );
    this.hoverRing.visible = false;
    this.hoverRing.position.y = 0.24;
    this.scene.add(this.hoverRing);

    const selGeo = new THREE.RingGeometry(5.2, 6.1, 32);
    selGeo.rotateX(-Math.PI * 0.5);
    this.selectRing = new THREE.Mesh(
      selGeo,
      new THREE.MeshBasicMaterial({ color: 0xffc23d, transparent: true, opacity: 0.92, side: THREE.DoubleSide }),
    );
    this.selectRing.visible = false;
    this.selectRing.position.y = 0.27;
    this.scene.add(this.selectRing);

    // Instanced dynamic vehicles
    const carGeo = new THREE.BoxGeometry(1.15, 0.52, 0.62);
    const carMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3, metalness: 0.55 });
    this.carMesh = new THREE.InstancedMesh(carGeo, carMat, 48);
    this.carMesh.frustumCulled = false;
    this.carMesh.castShadow = false;
    const carPalette = [0x5ccbff, 0xffc23d, 0xf8fafc, 0xff6fa5, 0x3fe0b0, 0xa58cff];
    for (let i = 0; i < 48; i++) {
      this.cars.push({
        laneIdx: i % VEHICLE_LANES.length,
        pos: ((i * 29) % 130) - 65,
        speedMult: 0.82 + ((i * 7) % 5) * 0.1,
      });
      _color.setHex(carPalette[i % carPalette.length]);
      this.carMesh.setColorAt(i, _color);
    }
    this.scene.add(this.carMesh);

    // Instanced pedestrians around civic plaza & boulevards
    const pedGeo = new THREE.CapsuleGeometry(0.16, 0.36, 4, 6);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.7 });
    this.pedMesh = new THREE.InstancedMesh(pedGeo, pedMat, 40);
    this.pedMesh.frustumCulled = false;
    for (let i = 0; i < 40; i++) {
      const zoneIdx = i % 4;
      const cx = zoneIdx === 0 ? 0 : zoneIdx === 1 ? 30 : zoneIdx === 2 ? -16 : 46;
      const cz = zoneIdx === 0 ? 4 : zoneIdx === 1 ? 25 : zoneIdx === 2 ? 12 : 10;
      this.peds.push({
        cx,
        cz,
        radius: 3.5 + (i % 6) * 1.4,
        angle: (i * 0.7) % (Math.PI * 2),
        speed: (i % 2 === 0 ? 1 : -1) * (0.35 + (i % 4) * 0.12),
      });
      _color.setHex(i % 3 === 0 ? 0xffc23d : i % 3 === 1 ? 0x9bd6ff : 0xf1f5f9);
      this.pedMesh.setColorAt(i, _color);
    }
    this.scene.add(this.pedMesh);

    // Weather rain particle cloud
    const rainCount = 420;
    this.rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 150;
      this.rainPositions[i * 3 + 1] = Math.random() * 48;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 130;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0xaad8ff,
      size: 0.45,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });
    this.rainPoints = new THREE.Points(rainGeo, rainMat);
    this.rainPoints.visible = false;
    this.scene.add(this.rainPoints);

    // Raycaster strictly on layer 1 (invisible plot hitboxes only)
    this.raycaster.layers.set(1);

    // Bind events cleanly
    this.onPointerDownBound = (e) => this.handlePointerDown(e);
    this.onPointerMoveBound = (e) => this.handlePointerMove(e);
    this.onPointerUpBound = (e) => this.handlePointerUp(e);
    this.onKeyDownBound = (e) => this.handleKeyDown(e);
    this.onKeyUpBound = (e) => this.handleKeyUp(e);
    this.onBlurBound = () => this.keysPressed.clear();
    this.onVisibilityChangeBound = () => {
      if (!document.hidden && this.shouldAnimate()) {
        this.resumeLoop(true);
      }
    };
    this.onContextLostBound = (e) => {
      e.preventDefault();
      this.callbacks.onWebglLostChange(true);
    };
    this.onContextRestoredBound = () => {
      this.callbacks.onWebglLostChange(false);
      this.resumeLoop(true);
    };
    this.onResizeBound = () => this.handleResize();

    const dom = this.renderer.domElement;
    dom.addEventListener('pointerdown', this.onPointerDownBound);
    dom.addEventListener('pointermove', this.onPointerMoveBound);
    dom.addEventListener('pointerup', this.onPointerUpBound);
    dom.addEventListener('webglcontextlost', this.onContextLostBound);
    dom.addEventListener('webglcontextrestored', this.onContextRestoredBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    document.addEventListener('visibilitychange', this.onVisibilityChangeBound);

    if (typeof MutationObserver !== 'undefined' && typeof document !== 'undefined') {
      this.modalObserver = new MutationObserver(() => {
        if (this.shouldAnimate()) {
          this.resumeLoop(true);
        }
      });
      this.modalObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.handleResize());
      this.resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', this.onResizeBound);
    }

    this.applyGraphicsSettings(this.settings);
    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    this.resumeLoop(true);
  }

  private buildStaticTerrainAndInfrastructure(): void {
    // Expansive grass / urban ground plane + outer rolling hills
    const groundGeo = new THREE.PlaneGeometry(420, 420);
    groundGeo.rotateX(-Math.PI * 0.5);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x355c47,
      roughness: 0.94,
      metalness: 0.02,
    });
    this.lib.materials.push(groundMat);
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.scene.add(ground);

    // Urban concrete district slab under main city grid (y=0.01)
    const citySlabGeo = new THREE.PlaneGeometry(164, 122);
    citySlabGeo.rotateX(-Math.PI * 0.5);
    const citySlabMat = new THREE.MeshStandardMaterial({
      color: 0x2c2748,
      roughness: 0.9,
      metalness: 0.05,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    this.lib.materials.push(citySlabMat);
    const citySlab = new THREE.Mesh(citySlabGeo, citySlabMat);
    citySlab.position.set(0, 0.01, -12);
    citySlab.receiveShadow = true;
    this.scene.add(citySlab);

    // Waterfront sea bay (South z = 47..200)
    const seaGeo = new THREE.PlaneGeometry(420, 160);
    seaGeo.rotateX(-Math.PI * 0.5);
    const sea = new THREE.Mesh(seaGeo, this.lib.waterMat);
    sea.position.set(0, -0.08, 127);
    sea.receiveShadow = true;
    this.scene.add(sea);

    // Concrete harbor seawall promenade
    const wall = new THREE.Mesh(new THREE.BoxGeometry(164, 0.9, 2.0), this.lib.concreteBase);
    wall.position.set(0, 0.35, 47.2);
    wall.receiveShadow = true;
    this.scene.add(wall);

    // Coastal Suspension Bridge spanning southern bay at x = 23
    const bridgeDeck = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.55, 58), this.lib.tarmacMat);
    bridgeDeck.position.set(23, 2.8, 72);
    bridgeDeck.castShadow = true;
    this.scene.add(bridgeDeck);
    for (const bz of [56, 86]) {
      const pylonL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 11, 0.65), this.lib.goldAccent);
      pylonL.position.set(21.1, 5.5, bz);
      const pylonR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 11, 0.65), this.lib.goldAccent);
      pylonR.position.set(24.9, 5.5, bz);
      this.scene.add(pylonL, pylonR);
    }

    // Road segments at y = 0.035 (disjoint Y offset eliminates Z-fighting)
    for (const r of CITY_ROADS) {
      const roadMesh = new THREE.Mesh(new THREE.BoxGeometry(r.w, 0.05, r.d), this.lib.roadMat);
      roadMesh.position.set(r.x, 0.035, r.z);
      if (r.axis === 'z') {
        roadMesh.rotation.y = Math.PI * 0.5;
        roadMesh.geometry.dispose();
        roadMesh.geometry = new THREE.BoxGeometry(r.d, 0.05, r.w);
      }
      roadMesh.receiveShadow = true;
      this.scene.add(roadMesh);
    }

    // Elevated Railway Viaduct along North corridor (z = -30)
    const viaduct = new THREE.Mesh(new THREE.BoxGeometry(148, 0.45, 1.8), this.lib.darkSteel);
    viaduct.position.set(0, 2.35, -30);
    viaduct.castShadow = true;
    this.scene.add(viaduct);
    for (let px = -68; px <= 68; px += 14) {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 2.35, 6), this.lib.concreteBase);
      pier.position.set(px, 1.17, -30);
      this.scene.add(pier);
    }

    // Central National Emerald Park (x = 30, z = 25)
    const park = new THREE.Mesh(new THREE.BoxGeometry(12, 0.14, 10), this.lib.foliageGreen);
    park.position.set(30, 0.07, 25);
    park.receiveShadow = true;
    this.scene.add(park);
    const pond = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.3, 0.12, 18), this.lib.waterMat);
    pond.position.set(30, 0.12, 25);
    this.scene.add(pond);

    // Instanced foliage trees around parks, suburbs, and perimeter ridges (110 trees)
    const treePositions: [number, number, number][] = [];
    for (let i = 0; i < 110; i++) {
      let tx = 0;
      let tz = 0;
      if (i < 16) {
        // Park & civic trees
        tx = 25 + (i % 4) * 3.2;
        tz = 21 + Math.floor(i / 4) * 2.5;
        if (Math.hypot(tx - 30, tz - 25) < 2.8) continue;
      } else if (i < 54) {
        // Perimeter green hills (North, West, East)
        const angle = ((i - 16) / 38) * Math.PI * 1.45 + Math.PI * 0.78;
        const rad = 86 + (i % 5) * 6.5;
        tx = Math.cos(angle) * rad;
        tz = Math.sin(angle) * rad * 0.78 - 10;
      } else {
        // Boulevard avenue medians
        tx = -68 + ((i - 54) % 19) * 7.5;
        tz = Math.floor((i - 54) / 19) * 24 - 22;
      }
      treePositions.push([tx, tz, 0.85 + (i % 5) * 0.11]);
    }

    const trunkMesh = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.16, 0.24, 1.3, 6),
      this.lib.trunkBrown,
      treePositions.length,
    );
    const canopyMesh = new THREE.InstancedMesh(
      new THREE.ConeGeometry(0.95, 2.2, 7),
      this.lib.foliageGreen,
      treePositions.length,
    );
    treePositions.forEach(([tx, tz, sc], idx) => {
      _v1.set(tx, 0.65 * sc, tz);
      _quat.identity();
      _scale.set(sc, sc, sc);
      _mat4.compose(_v1, _quat, _scale);
      trunkMesh.setMatrixAt(idx, _mat4);

      _v1.set(tx, 1.9 * sc, tz);
      _mat4.compose(_v1, _quat, _scale);
      canopyMesh.setMatrixAt(idx, _mat4);
      _color.setHSL(0.39 + (idx % 4) * 0.015, 0.56, 0.34 + (idx % 3) * 0.05);
      canopyMesh.setColorAt(idx, _color);
    });
    trunkMesh.computeBoundingSphere();
    canopyMesh.computeBoundingSphere();
    canopyMesh.castShadow = true;
    this.scene.add(trunkMesh, canopyMesh);

    // Horizon Perimeter Hills (North, West, East)
    const hillMat = new THREE.MeshStandardMaterial({ color: 0x2a4b3c, roughness: 0.96, metalness: 0 });
    this.lib.materials.push(hillMat);
    for (let h = 0; h < 14; h++) {
      const a = (h / 13) * Math.PI * 1.28 + Math.PI * 0.86;
      const dist = 128 + (h % 3) * 14;
      const rad = 24 + (h % 4) * 8;
      const mound = new THREE.Mesh(new THREE.ConeGeometry(rad, 14 + (h % 3) * 7, 10), hillMat);
      mound.position.set(Math.cos(a) * dist, 5.5, Math.sin(a) * dist * 0.82 - 12);
      this.scene.add(mound);
    }
  }

  public syncState(state: GameState, serverOffsetMs = 0): void {
    if (this.disposed) return;

    this.timeMode = state.cityTimeMode || 'auto';
    this.weatherMode = state.cityWeather || 'clear';

    let rebuiltAny = false;
    const now = Date.now() + serverOffsetMs;
    const queuedIds = new Set(getConstructionQueue(state, now).map((q) => q.buildingId));

    for (const plot of CITY_PLOTS) {
      const count = Math.max(0, Math.floor(state.b?.[plot.id] || 0));
      const level = Math.max(1, Math.min(5, Math.floor(state.gx?.lvl?.[plot.id] || 1)));
      const underConstruction = queuedIds.has(plot.id);
      const tierBucket = count === 0 ? 0 : count < 4 ? 1 : count < 10 ? 2 : 3;
      const sig = `${tierBucket}:${level}:${underConstruction ? 1 : 0}`;

      if (this.plotSignatures.get(plot.id) === sig) continue;
      this.plotSignatures.set(plot.id, sig);
      rebuiltAny = true;

      const prevGroup = this.plotGroups.get(plot.id);
      if (prevGroup) {
        this.scene.remove(prevGroup);
        this.disposeObjectChildren(prevGroup);
      }

      const def = BUILDING_BY_ID[plot.id] || BUILDINGS[0];
      const nextGroup = buildPlotGroup({
        plot,
        def,
        count,
        level,
        underConstruction,
        lib: this.lib,
        animatedParts: this.animatedParts,
      });
      this.scene.add(nextGroup);
      this.plotGroups.set(plot.id, nextGroup);
    }

    // Sync owned Diamond Landmarks / Exclusive Assets on the capital esplanade
    const ownedAssets = getDiamondAssetBonuses(state).ownedAssetIds;
    const nextAssetSig = ownedAssets.join(',');
    if (nextAssetSig !== this.diamondAssetSig) {
      this.diamondAssetSig = nextAssetSig;
      rebuiltAny = true;
      const ownedSet = new Set(ownedAssets);
      for (const [id, grp] of Array.from(this.diamondLandmarkGroups.entries())) {
        if (!ownedSet.has(id)) {
          this.scene.remove(grp);
          this.disposeObjectChildren(grp, true);
          this.diamondLandmarkGroups.delete(id);
        }
      }
      for (const assetId of ownedAssets) {
        if (this.diamondLandmarkGroups.has(assetId)) continue;
        const grp = buildDiamondLandmarkGroup({
          assetId,
          lib: this.lib,
          animatedParts: this.animatedParts,
        });
        if (grp) {
          this.scene.add(grp);
          this.diamondLandmarkGroups.set(assetId, grp);
        }
      }
    }

    if (rebuiltAny) {
      // Refresh raycast hitMeshes & animatedParts cleanly without stale references
      const freshHits: THREE.Object3D[] = [];
      for (const grp of this.plotGroups.values()) {
        for (const child of grp.children) {
          if (child.userData?.plotId) freshHits.push(child);
        }
      }
      this.hitMeshes = freshHits;
      this.animatedParts = this.animatedParts.filter((ap) => this.isDescendantOfScene(ap.obj));
    }

    this.updateSelectionVisuals();
    if (this.shouldAnimate()) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private isDescendantOfScene(obj: THREE.Object3D): boolean {
    let cur: THREE.Object3D | null = obj;
    while (cur) {
      if (cur === this.scene) return true;
      cur = cur.parent;
    }
    return false;
  }

  private disposeObjectChildren(group: THREE.Group, disposeOwnedMaterials = false): void {
    const sharedMats = new Set<THREE.Material>(this.lib.materials);
    group.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        mesh.geometry?.dispose();
        if (Array.isArray(mesh.material)) {
          if (disposeOwnedMaterials) {
            for (const mat of mesh.material) {
              if (!sharedMats.has(mat)) mat.dispose();
            }
          }
        } else if (mesh.userData?.plotId || (disposeOwnedMaterials && !sharedMats.has(mesh.material))) {
          mesh.material?.dispose();
        }
      }
    });
  }

  public applyGraphicsSettings(next: GraphicsSettings): void {
    this.settings = { ...next };
    const effectiveScale = this.isSoftwareGl
      ? Math.min(1.0, next.renderScale)
      : Math.max(0.5, next.renderScale * Math.pow(0.86, this.adaptiveStepDown));
    const baseDpr = this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(Math.max(0.5, baseDpr * effectiveScale));

    // Shadows
    const allowShadows = !this.isSoftwareGl && next.shadowQuality !== 'off' && this.adaptiveStepDown < 2;
    this.renderer.shadowMap.enabled = allowShadows;
    this.sunLight.castShadow = allowShadows;
    const shadowRes =
      next.shadowQuality === 'high' ? 2048 : next.shadowQuality === 'medium' ? 1024 : 512;
    if (allowShadows && this.sunLight.shadow.mapSize.width !== shadowRes) {
      this.sunLight.shadow.mapSize.set(shadowRes, shadowRes);
      this.sunLight.shadow.map?.dispose();
      this.sunLight.shadow.map = null;
    }

    // View distance & fog
    const farDist = next.viewDistance === 'near' ? 220 : next.viewDistance === 'medium' ? 340 : 520;
    this.camera.far = farDist;
    this.camera.updateProjectionMatrix();
    this.fog.density = next.viewDistance === 'near' ? 0.0052 : next.viewDistance === 'medium' ? 0.0034 : 0.0022;

    // Texture anisotropy & Reflections & Ambient Fill
    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    this.lib.setTextureQuality(next.textureQuality, maxAniso);
    this.lib.setReflections(next.reflections);
    this.hemiLight.intensity = next.ambientOcclusion ? 0.8 : 0.56;
    this.rimLight.intensity = next.ambientOcclusion ? 0.62 : 0.35;

    // Dynamic actor counts
    const densityCount = (d: GraphicsSettings['trafficDensity'], maxCount: number) =>
      d === 'off' ? 0 : d === 'low' ? Math.ceil(maxCount * 0.35) : d === 'medium' ? Math.ceil(maxCount * 0.68) : maxCount;
    const scaleFactor = this.isSoftwareGl ? 0.5 : 1;
    this.carMesh.count = Math.floor(densityCount(next.trafficDensity, 48) * scaleFactor);
    this.pedMesh.count = Math.floor(densityCount(next.pedestrianDensity, 40) * scaleFactor);
  }

  public setSelectedBuilding(buildingId: string | null): void {
    this.selectedId = buildingId;
    this.updateSelectionVisuals();
  }

  private updateSelectionVisuals(): void {
    if (this.selectedId && PLOT_BY_ID[this.selectedId]) {
      const p = PLOT_BY_ID[this.selectedId];
      this.selectRing.position.set(p.x, 0.27, p.z);
      const rScale = Math.max(p.w, p.d) / 11;
      this.selectRing.scale.set(rScale, 1, rScale);
      this.selectRing.visible = true;
    } else {
      this.selectRing.visible = false;
    }
    if (this.hoveredId && PLOT_BY_ID[this.hoveredId] && this.hoveredId !== this.selectedId) {
      const p = PLOT_BY_ID[this.hoveredId];
      this.hoverRing.position.set(p.x, 0.24, p.z);
      const rScale = Math.max(p.w, p.d) / 11;
      this.hoverRing.scale.set(rScale, 1, rScale);
      this.hoverRing.visible = true;
    } else {
      this.hoverRing.visible = false;
    }
  }

  public setCameraPreset(preset: CameraPresetMode): void {
    if (preset === 'overview') {
      this.camGoalPos = new THREE.Vector3(56, 48, 72);
      this.camGoalTarget = new THREE.Vector3(0, 2, -6);
    } else if (preset === 'aerial') {
      this.camGoalPos = new THREE.Vector3(0, 118, 42);
      this.camGoalTarget = new THREE.Vector3(0, 0, -10);
    } else if (preset === 'closeup') {
      this.camGoalPos = new THREE.Vector3(24, 18, 28);
      this.camGoalTarget = new THREE.Vector3(0, 4, 0);
    } else if (preset === 'harbor') {
      this.camGoalPos = new THREE.Vector3(-42, 24, 72);
      this.camGoalTarget = new THREE.Vector3(-18, 2, 34);
    }
  }

  public focusBuilding(buildingId: string): void {
    const plot = PLOT_BY_ID[buildingId];
    if (!plot) return;
    this.setSelectedBuilding(buildingId);
    this.camGoalTarget = new THREE.Vector3(plot.x, 2.5, plot.z);
    this.camGoalPos = new THREE.Vector3(plot.x + 18, 17, plot.z + 24);
  }

  public zoomBy(deltaScale: number): void {
    _v1.subVectors(this.camera.position, this.controls.target);
    const len = _v1.length();
    const nextLen = THREE.MathUtils.clamp(len * deltaScale, this.controls.minDistance, this.controls.maxDistance);
    _v1.setLength(nextLen);
    this.camera.position.copy(this.controls.target).add(_v1);
  }

  private shouldAnimate(): boolean {
    if (this.disposed || this.paused || !this.visible) return false;
    if (typeof document !== 'undefined') {
      if (document.hidden || document.body.classList.contains('modal-open')) return false;
    }
    return true;
  }

  public setPaused(paused: boolean): void {
    const wasPaused = this.paused;
    this.paused = paused;
    if (wasPaused && !paused && this.shouldAnimate()) {
      this.resumeLoop(true);
    }
  }

  public setVisible(visible: boolean): void {
    const wasVisible = this.visible;
    this.visible = visible;
    if (!wasVisible && visible && !this.disposed) {
      this.lastTickMs = performance.now();
      this.handleResize();
      if (this.shouldAnimate()) {
        this.resumeLoop(true);
      }
    }
  }

  private handleResize(): void {
    if (this.disposed || !this.visible) return;
    const rawW = this.container.clientWidth;
    const rawH = this.container.clientHeight;
    if (rawW < 10 || rawH < 10) return;
    const w = Math.max(280, rawW);
    const h = Math.max(200, rawH);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h, false);
    if (!this.paused) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  private updateRayMouse(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    _rayMouse.x = ((e.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    _rayMouse.y = -((e.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
  }

  private pickPlotAtPointer(e: PointerEvent): string | null {
    if (!this.hitMeshes.length) return null;
    this.updateRayMouse(e);
    this.raycaster.setFromCamera(_rayMouse, this.camera);
    const hits = this.raycaster.intersectObjects(this.hitMeshes, false);
    return hits.length > 0 ? String(hits[0].object.userData?.plotId || '') || null : null;
  }

  private handlePointerDown(e: PointerEvent): void {
    this.pointerDownPos = { x: e.clientX, y: e.clientY, t: performance.now() };
  }

  private handlePointerMove(e: PointerEvent): void {
    const now = performance.now();
    if (now - this.lastHoverRaycastMs < 55) return;
    this.lastHoverRaycastMs = now;
    if (e.buttons !== 0) return;

    const plotId = this.pickPlotAtPointer(e);
    if (plotId !== this.hoveredId) {
      this.hoveredId = plotId;
      this.updateSelectionVisuals();
      this.renderer.domElement.style.cursor = plotId ? 'pointer' : 'grab';
    }
    this.callbacks.onHoverBuilding(plotId, e.clientX, e.clientY);
  }

  private handlePointerUp(e: PointerEvent): void {
    const dx = e.clientX - this.pointerDownPos.x;
    const dy = e.clientY - this.pointerDownPos.y;
    const dt = performance.now() - this.pointerDownPos.t;
    if (Math.hypot(dx, dy) > 6 || dt > 450) return;

    const plotId = this.pickPlotAtPointer(e);
    this.setSelectedBuilding(plotId);
    this.callbacks.onSelectBuilding(plotId);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
    if (!this.visible || this.paused) return;
    const code = e.code;
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
      this.keysPressed.add(code);
    } else if (code === 'KeyR') {
      this.setCameraPreset('overview');
    } else if (code === 'Equal' || code === 'NumpadAdd') {
      this.zoomBy(0.85);
    } else if (code === 'Minus' || code === 'NumpadSubtract') {
      this.zoomBy(1.18);
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keysPressed.delete(e.code);
  }

  private applyKeyboardPan(dt: number): void {
    if (this.keysPressed.size === 0) return;
    const speed = 38 * dt;
    this.camera.getWorldDirection(_v1);
    _v1.y = 0;
    if (_v1.lengthSq() < 1e-4) _v1.set(0, 0, -1);
    _v1.normalize();
    _v2.crossVectors(_v1, this.camera.up).normalize(); // right

    _v3.set(0, 0, 0);
    if (this.keysPressed.has('KeyW') || this.keysPressed.has('ArrowUp')) _v3.addScaledVector(_v1, speed);
    if (this.keysPressed.has('KeyS') || this.keysPressed.has('ArrowDown')) _v3.addScaledVector(_v1, -speed);
    if (this.keysPressed.has('KeyD') || this.keysPressed.has('ArrowRight')) _v3.addScaledVector(_v2, speed);
    if (this.keysPressed.has('KeyA') || this.keysPressed.has('ArrowLeft')) _v3.addScaledVector(_v2, -speed);

    if (_v3.lengthSq() > 0) {
      this.camGoalPos = null;
      this.camGoalTarget = null;
      this.camera.position.add(_v3);
      this.controls.target.add(_v3);
      this.controls.target.x = THREE.MathUtils.clamp(this.controls.target.x, -75, 75);
      this.controls.target.z = THREE.MathUtils.clamp(this.controls.target.z, -65, 55);
    }

    if (this.keysPressed.has('KeyQ') || this.keysPressed.has('KeyE')) {
      const yaw = (this.keysPressed.has('KeyQ') ? 1 : -1) * 1.15 * dt;
      _v1.subVectors(this.camera.position, this.controls.target);
      _v1.applyAxisAngle(this.camera.up, yaw);
      this.camera.position.copy(this.controls.target).add(_v1);
    }
  }

  private updateAtmosphere(dt: number): void {
    if (this.timeMode === 'day') {
      this.activeTimePhase = 0.25;
    } else if (this.timeMode === 'sunset') {
      this.activeTimePhase = 0.52;
    } else if (this.timeMode === 'night') {
      this.activeTimePhase = 0.82;
    } else if (this.settings.dayNightCycle) {
      this.activeTimePhase = (this.activeTimePhase + dt * 0.008) % 1;
    } else {
      this.activeTimePhase = 0.25;
    }

    const p = this.activeTimePhase;
    // Day peak at 0.25, sunset ~0.5, night ~0.75..0.95
    const sunElev = Math.sin(p * Math.PI * 2); // +1 noon, 0 sunset/dawn, -1 midnight
    const dayFactor = THREE.MathUtils.clamp((sunElev + 0.25) / 1.25, 0, 1);
    const sunsetFactor = Math.max(0, 1 - Math.abs(sunElev) * 3.4);
    const nightFactor = THREE.MathUtils.clamp(1 - dayFactor * 1.25, 0, 1);

    const isRain = this.settings.weatherEffects && this.weatherMode === 'rain';
    const isOvercast =
      this.settings.weatherEffects && (this.weatherMode === 'overcast' || isRain);

    // Sky & fog color blend (reuses pre-allocated scratch colors; 0 per-frame allocations)
    _color.setHex(0x88b4e6); // crisp clear day
    if (sunsetFactor > 0.05) {
      _color.lerp(_sunsetColor, sunsetFactor * 0.72);
    }
    if (nightFactor > 0.05) {
      _color.lerp(_nightColor, nightFactor * 0.94);
    }
    if (isOvercast) {
      _color.lerp(_overcastColor, 0.48);
    }

    (this.scene.background as THREE.Color).copy(_color);
    this.fog.color.copy(_color);

    // Sun position & warmth
    const orbitAngle = p * Math.PI * 2;
    this.sunLight.position.set(Math.cos(orbitAngle) * 78, Math.max(14, sunElev * 82), 42);
    this.sunLight.intensity = isOvercast ? 0.95 + dayFactor * 0.65 : 0.48 + dayFactor * 1.85;
    this.sunLight.color.setHex(sunsetFactor > 0.35 ? 0xffb37a : nightFactor > 0.5 ? 0x9ab8ff : 0xfff3db);
    this.hemiLight.intensity = (this.settings.ambientOcclusion ? 0.78 : 0.56) * (0.45 + 0.55 * dayFactor);

    this.lib.setNightFactor(nightFactor);

    // Rain particles
    this.rainPoints.visible = Boolean(isRain && this.settings.particles);
    if (this.rainPoints.visible) {
      const arr = this.rainPositions;
      for (let i = 0; i < arr.length; i += 3) {
        arr[i + 1] -= 34 * dt;
        if (arr[i + 1] < 0) {
          arr[i + 1] = 44 + (i % 7);
        }
      }
      this.rainPoints.geometry.attributes.position.needsUpdate = true;
    }
  }

  private updateActors(dt: number, elapsedSec: number): void {
    // Wind rotors, radar dishes, beacon pulse
    for (const part of this.animatedParts) {
      if (part.kind === 'rotor') {
        part.obj.rotation.z += dt * part.speed;
      } else if (part.kind === 'radar') {
        part.obj.rotation.y += dt * part.speed;
      } else if (part.kind === 'beacon') {
        const s = 0.85 + 0.35 * Math.sin(elapsedSec * part.speed + part.phase);
        part.obj.scale.set(s, s, s);
      }
    }

    // Instanced traffic along avenues
    const carCount = this.carMesh.count;
    if (carCount > 0) {
      for (let i = 0; i < carCount; i++) {
        const c = this.cars[i];
        const lane = VEHICLE_LANES[c.laneIdx];
        c.pos += lane.dir * lane.speed * c.speedMult * dt;
        if (c.pos > lane.max) c.pos = lane.min;
        if (c.pos < lane.min) c.pos = lane.max;
        if (lane.axis === 'x') {
          _v1.set(c.pos, 0.34, lane.coord);
          _euler.set(0, 0, 0);
        } else {
          _v1.set(lane.coord, 0.34, c.pos);
          _euler.set(0, Math.PI * 0.5, 0);
        }
        _quat.setFromEuler(_euler);
        _scale.set(1, 1, 1);
        _mat4.compose(_v1, _quat, _scale);
        this.carMesh.setMatrixAt(i, _mat4);
      }
      this.carMesh.instanceMatrix.needsUpdate = true;
    }

    // Instanced pedestrians
    const pedCount = this.pedMesh.count;
    if (pedCount > 0) {
      for (let i = 0; i < pedCount; i++) {
        const p = this.peds[i];
        p.angle += p.speed * dt;
        _v1.set(p.cx + Math.cos(p.angle) * p.radius, 0.38, p.cz + Math.sin(p.angle) * p.radius);
        _quat.identity();
        _scale.set(1, 1, 1);
        _mat4.compose(_v1, _quat, _scale);
        this.pedMesh.setMatrixAt(i, _mat4);
      }
      this.pedMesh.instanceMatrix.needsUpdate = true;
    }
  }

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    if (typeof gl.fenceSync === 'function') {
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (this.disposed) {
          if (sync) gl.deleteSync(sync);
          return;
        }
        const st = sync ? gl.getSyncParameter(sync, gl.SYNC_STATUS) : gl.SIGNALED;
        if (st === gl.UNSIGNALED) {
          this.frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          this.frameId = window.setTimeout(cb, 80);
        }
      };
      this.frameId = window.setTimeout(poll, 5);
    } else {
      gl.finish();
      this.frameId = window.setTimeout(cb, 80);
    }
  }

  private resumeLoop(renderImmediate = false): void {
    if (this.disposed) return;
    this.lastTickMs = performance.now();
    if (renderImmediate && this.visible) {
      this.handleResize();
      this.updateAtmosphere(0);
      this.renderer.render(this.scene, this.camera);
    }
    if (this.loopScheduled || !this.shouldAnimate()) return;
    this.startLoop();
  }

  private clearScheduledFrame(): void {
    if (this.loopKind === 'raf') {
      cancelAnimationFrame(this.frameId);
    } else if (this.loopKind === 'timeout') {
      window.clearTimeout(this.frameId);
    }
    this.loopScheduled = false;
    this.loopKind = null;
  }

  private startLoop(): void {
    if (this.disposed || this.loopScheduled) return;

    const tick = () => {
      this.loopScheduled = false;
      this.loopKind = null;
      if (this.disposed) return;

      const scheduleNext = () => {
        if (this.disposed || this.loopScheduled || !this.shouldAnimate()) return;
        this.loopScheduled = true;
        if (this.isSoftwareGl) {
          this.loopKind = 'timeout';
          this.afterDraw(tick);
        } else {
          this.loopKind = 'raf';
          this.frameId = requestAnimationFrame(tick);
        }
      };

      const now = performance.now();
      if (!this.shouldAnimate()) {
        // Stop scheduling cleanly until visible/modal/visibilitychange wakes resumeLoop()
        this.lastTickMs = now;
        return;
      }

      const fpsCap = resolveNumericFpsCap(this.settings.fpsTarget, this.isSoftwareGl);
      const minIntervalMs = 1000 / fpsCap;
      if (!this.isSoftwareGl && now - this.lastRenderMs < minIntervalMs - 1.5) {
        this.loopScheduled = true;
        this.loopKind = 'raf';
        this.frameId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.08, Math.max(0.001, (now - this.lastTickMs) / 1000));
      this.lastTickMs = now;
      this.lastRenderMs = now;

      // Smooth damped camera preset transitions
      if (this.camGoalPos && this.camGoalTarget) {
        const lambda = 1 - Math.exp(-6.5 * dt);
        this.camera.position.lerp(this.camGoalPos, lambda);
        this.controls.target.lerp(this.camGoalTarget, lambda);
        if (
          this.camera.position.distanceTo(this.camGoalPos) < 0.2 &&
          this.controls.target.distanceTo(this.camGoalTarget) < 0.2
        ) {
          this.camGoalPos = null;
          this.camGoalTarget = null;
        }
      }

      this.applyKeyboardPan(dt);
      this.controls.update();
      this.updateAtmosphere(dt);
      this.updateActors(dt, now / 1000);

      const renderStart = performance.now();
      this.renderer.render(this.scene, this.camera);
      const frameTimeMs = Math.max(0.5, performance.now() - renderStart);

      // FPS & adaptive optimization telemetry (throttled ~1Hz to React)
      const measuredFps = Math.min(144, Math.round(1000 / Math.max(8, frameTimeMs, minIntervalMs)));
      this.fpsSamples.push(measuredFps);
      if (this.fpsSamples.length > 20) this.fpsSamples.shift();

      if (this.settings.adaptiveOptimization && !this.isSoftwareGl) {
        if (frameTimeMs > minIntervalMs * 1.45) {
          this.slowFrameStreak += 1;
          this.fastFrameStreak = 0;
          if (this.slowFrameStreak >= 18 && this.adaptiveStepDown < 2) {
            this.adaptiveStepDown += 1;
            this.slowFrameStreak = 0;
            this.applyGraphicsSettings(this.settings);
          }
        } else if (frameTimeMs < minIntervalMs * 0.6) {
          this.fastFrameStreak += 1;
          this.slowFrameStreak = 0;
          if (this.fastFrameStreak >= 45 && this.adaptiveStepDown > 0) {
            this.adaptiveStepDown -= 1;
            this.fastFrameStreak = 0;
            this.applyGraphicsSettings(this.settings);
          }
        }
      }

      if (now - this.lastStatsPushMs >= 950) {
        this.lastStatsPushMs = now;
        const avgFps = Math.round(
          this.fpsSamples.reduce((a, b) => a + b, 0) / Math.max(1, this.fpsSamples.length),
        );
        this.callbacks.onPerfStats({
          ...DEFAULT_PERF_STATS,
          fps: measuredFps,
          avgFps,
          frameTimeMs: Math.round(frameTimeMs * 10) / 10,
          webglActive: true,
          isSoftwareGl: this.isSoftwareGl,
          rendererName: this.rendererName,
          effectiveScale: this.isSoftwareGl
            ? Math.min(1, this.settings.renderScale)
            : Math.round(this.settings.renderScale * Math.pow(0.86, this.adaptiveStepDown) * 100) / 100,
          pixelRatio: Math.round(this.renderer.getPixelRatio() * 100) / 100,
          activePreset: this.settings.preset,
          adaptiveActive: this.settings.adaptiveOptimization,
          adaptiveStepDown: this.adaptiveStepDown,
          drawCalls: this.renderer.info.render.calls,
          triangles: this.renderer.info.render.triangles,
        });
      }

      scheduleNext();
    };

    this.loopScheduled = true;
    if (this.isSoftwareGl) {
      this.loopKind = 'timeout';
      this.frameId = window.setTimeout(tick, 16);
    } else {
      this.loopKind = 'raf';
      this.frameId = requestAnimationFrame(tick);
    }
  }

  public dispose(): void {
    this.disposed = true;
    this.clearScheduledFrame();

    const dom = this.renderer.domElement;
    dom.removeEventListener('pointerdown', this.onPointerDownBound);
    dom.removeEventListener('pointermove', this.onPointerMoveBound);
    dom.removeEventListener('pointerup', this.onPointerUpBound);
    dom.removeEventListener('webglcontextlost', this.onContextLostBound);
    dom.removeEventListener('webglcontextrestored', this.onContextRestoredBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    document.removeEventListener('visibilitychange', this.onVisibilityChangeBound);
    this.modalObserver?.disconnect();
    this.resizeObserver?.disconnect();
    window.removeEventListener('resize', this.onResizeBound);

    this.controls.dispose();
    for (const grp of this.plotGroups.values()) {
      this.disposeObjectChildren(grp);
    }
    this.plotGroups.clear();
    for (const grp of this.diamondLandmarkGroups.values()) {
      this.disposeObjectChildren(grp, true);
    }
    this.diamondLandmarkGroups.clear();

    this.carMesh.geometry.dispose();
    (this.carMesh.material as THREE.Material).dispose();
    this.pedMesh.geometry.dispose();
    (this.pedMesh.material as THREE.Material).dispose();
    this.rainPoints.geometry.dispose();
    (this.rainPoints.material as THREE.Material).dispose();
    this.hoverRing.geometry.dispose();
    (this.hoverRing.material as THREE.Material).dispose();
    this.selectRing.geometry.dispose();
    (this.selectRing.material as THREE.Material).dispose();

    this.lib.dispose();
    this.envRt?.dispose();
    this.pmremTex?.dispose();
    this.renderer.dispose();
    if (dom.parentElement === this.container) {
      this.container.removeChild(dom);
    }
  }
}
