import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import * as xb from 'xrblocks';
import {
  analyzeCapability,
  calculateBOM,
  clampAssemblyStep,
  clampGrowthMonth,
  clampTiers,
  clampTimeOfDay,
  clampWidth,
  computeAutoLayoutPoints,
  computeSolarPosition,
  computeTelemetry,
  getOptimalPresetForCrop,
} from './hydro/calculator';
import { DEFAULT_HYDRO_CONFIG } from './hydro/constants';
import {
  HydroBuilder,
  createHydroMaterials,
  disposeHydroMaterials,
  type HydroMaterials,
} from './hydro/HydroBuilder';
import type {
  ArchitectureMode,
  CropType,
  FloorBounds,
  HydroConfig,
  LayoutPoint,
  SpatialToolMode,
} from './hydro/types';
import { HydroUI } from './ui/HydroUI';

const FLOOR_PLANE = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _ray = new THREE.Ray();
const _hitPoint = new THREE.Vector3();
const _box3 = new THREE.Box3();
const _boxSize = new THREE.Vector3();
const _boxCenter = new THREE.Vector3();

function detectSoftwareWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

export class HydroScene extends xb.Script {
  static dependencies = {
    depth: xb.Depth,
    user: xb.User,
    world: xb.World,
    camera: THREE.Camera,
  };

  private depth?: xb.Depth;
  private user?: xb.User;
  private world?: xb.World;
  private camera?: THREE.Camera;

  private config: HydroConfig = { ...DEFAULT_HYDRO_CONFIG };
  private tool: SpatialToolMode = 'PLACE';
  private points: LayoutPoint[] = [{ x: 0, y: 0, z: -2.75 }];

  private isGrowthAnimating = false;
  private isTimeAnimating = false;
  private isScanning = false;
  private scanElapsed = 0;
  private cardsVisible = true;
  private showDiagnostics = false;
  private statusMessage =
    'Point at the floor and click to place units.';

  private isSoftwareGl = false;
  private materials!: HydroMaterials;
  private builder!: HydroBuilder;
  private ui!: HydroUI;

  private readonly assemblyGroup = new THREE.Group();
  private readonly scannerGroup = new THREE.Group();
  private placementReticle!: THREE.Mesh;
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private floorGrid!: THREE.GridHelper;
  private floorRing!: THREE.Mesh;
  private shadowFloor!: THREE.Mesh;
  private envTarget: THREE.WebGLRenderTarget | null = null;

  private rebuildTimer = 0;
  private uiSyncTimer = 0;
  private validatedUiOnce = false;
  private simStarted = false;

  private rotaryDrums: THREE.Object3D[] = [];
  private orbitWheels: THREE.Object3D[] = [];
  private orbitCradles: THREE.Object3D[] = [];
  private driveRollers: THREE.Object3D[] = [];
  private pumpRotorsX: THREE.Object3D[] = [];
  private pumpRotorsZ: THREE.Object3D[] = [];
  private towerSpinners: THREE.Object3D[] = [];
  private gearWheels: THREE.Object3D[] = [];
  private flowTurbines: THREE.Object3D[] = [];
  private siphonFloats: THREE.Object3D[] = [];
  private pistonBobs: THREE.Object3D[] = [];
  private bubbleRises: THREE.Object3D[] = [];
  private elapsedTime = 0;

  init(deps: {
    depth: xb.Depth;
    user: xb.User;
    world: xb.World;
    camera: THREE.Camera;
  }): void {
    this.depth = deps.depth;
    this.user = deps.user;
    this.world = deps.world;
    this.camera = deps.camera;

    this.isSoftwareGl = detectSoftwareWebGL();
    const renderer = xb.core.renderer;
    const scene = xb.core.scene;

    if (renderer && renderer instanceof THREE.WebGLRenderer) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.08;
      renderer.shadowMap.enabled = !this.isSoftwareGl;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      if (this.isSoftwareGl) {
        renderer.setPixelRatio(1);
      }
      const pmrem = new THREE.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      this.envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
      scene.environment = this.envTarget.texture;
      pmrem.dispose();
    }

    const maxAniso =
      renderer instanceof THREE.WebGLRenderer
        ? Math.min(8, renderer.capabilities.getMaxAnisotropy())
        : 4;
    this.materials = createHydroMaterials(maxAniso);
    this.builder = new HydroBuilder(this.materials);

    this.setupLightingAndFloor();
    this.setupScannerAndReticle();

    this.assemblyGroup.name = 'HydroAssemblyRoot';
    this.add(this.assemblyGroup);

    this.ui = new HydroUI({
      onSelectArchitecture: (mode) => this.setArchitecture(mode),
      onSelectCrop: (crop) => this.setCrop(crop),
      onAdjustWidth: (delta) => this.adjustWidth(delta),
      onAdjustTiers: (delta) => this.adjustTiers(delta),
      onChangeGrowthMonth: (month) => this.setGrowthMonth(month),
      onToggleGrowthAnim: () => this.toggleGrowthAnim(),
      onChangeTimeOfDay: (hour) => this.setTimeOfDay(hour),
      onToggleTimeAnim: () => this.toggleTimeAnim(),
      onSelectTool: (tool) => this.setTool(tool),
      onAutoScan: () => this.triggerAutoScan(),
      onResetScene: () => this.resetScene(),
      onSelectAssemblyStep: (step) => this.setAssemblyStep(step),
      onToggleCards: () => this.toggleCards(),
      onToggleDiagnostics: () => this.toggleDiagnostics(),
      onOptimizeForCrop: () => this.optimizeForCrop(),
    });

    this.add(this.ui.architectCard, this.ui.assemblyCard, this.ui.hudOverlay);

    this.rebuildSystems();
    this.updateSolarLighting();
    this.syncUI();
  }

  onSimulatorStarted(): void {
    this.simStarted = true;
    document.body.dataset.hydroSimActive = 'true';
  }

  onXRSessionStarted(): void {
    this.simStarted = true;
    document.body.dataset.hydroSimActive = 'true';
  }

  private setupLightingAndFloor(): void {
    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.4);
    this.add(this.hemiLight);

    this.sunLight = new THREE.DirectionalLight(0xfff5e6, 2.2);
    this.sunLight.castShadow = !this.isSoftwareGl;
    this.sunLight.shadow.mapSize.set(1024, 1024);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 24;
    this.sunLight.shadow.camera.left = -6;
    this.sunLight.shadow.camera.right = 6;
    this.sunLight.shadow.camera.top = 6;
    this.sunLight.shadow.camera.bottom = -6;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.add(this.sunLight);

    this.floorGrid = new THREE.GridHelper(2.6, 13, 0x38bdf8, 0x334155);
    const gridMats = Array.isArray(this.floorGrid.material)
      ? this.floorGrid.material
      : [this.floorGrid.material];
    for (const gm of gridMats) {
      gm.transparent = true;
      gm.opacity = 0.2;
    }
    this.floorGrid.position.set(0, 0.003, -2.75);
    this.floorGrid.xb = { pointerEvents: 'none' };
    this.add(this.floorGrid);

    this.floorRing = new THREE.Mesh(
      new THREE.RingGeometry(1.42, 1.48, 64).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      })
    );
    this.floorRing.position.set(0, 0.005, -2.75);
    this.floorRing.xb = { pointerEvents: 'none' };
    this.add(this.floorRing);

    this.shadowFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(18, 18),
      new THREE.ShadowMaterial({ opacity: 0.28, color: 0x000000 })
    );
    this.shadowFloor.rotation.x = -Math.PI / 2;
    this.shadowFloor.position.y = 0;
    this.shadowFloor.receiveShadow = !this.isSoftwareGl;
    this.shadowFloor.xb = { pointerEvents: 'none' };
    this.add(this.shadowFloor);
  }

  private setupScannerAndReticle(): void {
    this.scannerGroup.visible = false;
    this.scannerGroup.xb = { pointerEvents: 'none' };

    const scanGrid = new THREE.GridHelper(10, 20, 0x38bdf8, 0x0284c7);
    const mats = Array.isArray(scanGrid.material) ? scanGrid.material : [scanGrid.material];
    for (const m of mats) {
      m.transparent = true;
      m.opacity = 0.65;
    }
    scanGrid.position.y = 0.015;
    this.scannerGroup.add(scanGrid);

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.15, 1.24, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.75,
        side: THREE.DoubleSide,
      })
    );
    ring.position.y = 0.02;
    this.scannerGroup.add(ring);
    this.scannerGroup.position.set(0, 0, -2.75);
    this.add(this.scannerGroup);

    this.placementReticle = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.23, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.85,
        side: THREE.DoubleSide,
      })
    );
    this.placementReticle.visible = false;
    this.placementReticle.xb = { pointerEvents: 'none' };
    this.add(this.placementReticle);
  }

  // ===========================================================================
  // STATE ACTIONS
  // ===========================================================================
  public setArchitecture(mode: ArchitectureMode): void {
    if (this.config.architecture === mode) return;
    this.config.architecture = mode;
    if (mode === 'BIOMESH' && this.points.length < 2) {
      this.points = [
        { x: -1.1, y: 0.32, z: -3.1 },
        { x: 1.1, y: 0.24, z: -3.1 },
        { x: 1.1, y: 0.16, z: -2.3 },
        { x: -1.1, y: 0.08, z: -2.3 },
      ];
    } else if (mode !== 'BIOMESH' && this.points.length === 0) {
      this.points = [{ x: 0, y: 0, z: -2.75 }];
    }
    this.statusMessage = `Switched architecture to ${mode}.`;
    this.rebuildSystems();
    this.syncUI();
  }

  public setCrop(crop: CropType): void {
    if (this.config.crop === crop) return;
    this.config.crop = crop;
    this.statusMessage = `Selected botanical crop: ${crop}.`;
    this.rebuildSystems();
    this.syncUI();
  }

  public adjustWidth(delta: number): void {
    const next = clampWidth(this.config.width + delta);
    if (next === this.config.width) return;
    this.config.width = next;
    this.rebuildSystems();
    this.syncUI();
  }

  public adjustTiers(delta: number): void {
    const next = clampTiers(this.config.tiers + delta);
    if (next === this.config.tiers) return;
    this.config.tiers = next;
    this.rebuildSystems();
    this.syncUI();
  }

  public setGrowthMonth(month: number): void {
    this.config.growthMonth = clampGrowthMonth(month);
    this.rebuildSystems();
    this.syncUI();
  }

  public toggleGrowthAnim(): void {
    this.isGrowthAnimating = !this.isGrowthAnimating;
    if (this.isGrowthAnimating && this.config.growthMonth >= 12) {
      this.config.growthMonth = 0.5;
    }
    if (this.config.assemblyStep < 10 && this.isGrowthAnimating) {
      this.config.assemblyStep = 10;
      this.rebuildSystems();
    }
    this.syncUI();
  }

  public setTimeOfDay(hour: number): void {
    this.config.timeOfDay = clampTimeOfDay(hour);
    this.updateSolarLighting();
    this.syncUI();
  }

  public toggleTimeAnim(): void {
    this.isTimeAnimating = !this.isTimeAnimating;
    this.syncUI();
  }

  public setTool(tool: SpatialToolMode): void {
    this.tool = tool;
    this.statusMessage =
      tool === 'PLACE'
        ? 'Place mode: click/pinch floor to add a hydroponic unit.'
        : tool === 'MOVE'
          ? 'Move mode: drag any hydroponic unit to reposition it.'
          : 'Erase mode: click/pinch a hydroponic unit to remove it.';
    this.applyManipulationFlags();
    this.syncUI();
  }

  public setAssemblyStep(step: number): void {
    const next = clampAssemblyStep(step);
    if (next === this.config.assemblyStep) return;
    this.config.assemblyStep = next;
    this.statusMessage = `Assembly Phase ${next} / 10 active.`;
    this.rebuildSystems();
    this.syncUI();
  }

  public toggleCards(): void {
    this.cardsVisible = !this.cardsVisible;
    this.syncUI();
  }

  public toggleDiagnostics(): void {
    this.showDiagnostics = !this.showDiagnostics;
    this.statusMessage = this.showDiagnostics
      ? '3D Clearance Envelope & LED PPFD Coverage active.'
      : '3D Capability Diagnostics overlay hidden.';
    this.rebuildSystems();
    this.syncUI();
  }

  public optimizeForCrop(): void {
    const preset = getOptimalPresetForCrop(this.config.crop);
    this.config.architecture = preset.architecture;
    this.config.width = preset.width;
    this.config.tiers = preset.tiers;
    if (this.points.length === 0) {
      this.points = [{ x: 0, y: 0, z: -2.75 }];
    }
    this.showDiagnostics = true;
    this.statusMessage = `Auto-Fitted ${preset.architecture} (${preset.width.toFixed(1)}m, ${preset.tiers} tiers) for ${this.config.crop}.`;
    this.rebuildSystems();
    this.syncUI();
  }

  public resetScene(): void {
    this.isGrowthAnimating = false;
    this.isTimeAnimating = false;
    this.isScanning = false;
    this.showDiagnostics = false;
    this.scannerGroup.visible = false;
    this.config = { ...DEFAULT_HYDRO_CONFIG };
    this.tool = 'PLACE';
    this.points = [{ x: 0, y: 0, z: -2.75 }];
    this.statusMessage = 'Reset farm layout to single baseline unit.';
    this.rebuildSystems();
    this.updateSolarLighting();
    this.syncUI();
  }

  public triggerAutoScan(): void {
    if (this.isScanning) return;
    this.isScanning = true;
    this.scanElapsed = 0;
    this.scannerGroup.visible = true;
    this.scannerGroup.scale.setScalar(0.15);
    this.statusMessage = 'Scanning spatial floor bounds for optimal layout...';
    this.syncUI();
  }

  private finishAutoScan(): void {
    this.isScanning = false;
    this.scannerGroup.visible = false;

    const bounds = this.detectRealFloorBounds();
    this.points = computeAutoLayoutPoints(
      this.config.architecture,
      this.config.width,
      bounds
    );
    this.statusMessage = bounds
      ? `Matched room bounds: placed ${this.points.length} units.`
      : `Auto-generated ${this.points.length}-unit optimal farm layout.`;
    this.rebuildSystems();
    this.syncUI();
  }

  private detectRealFloorBounds(): FloorBounds | null {
    const floorPlanes = this.world?.planes?.get('floor');
    if (!floorPlanes || floorPlanes.length === 0) return null;

    _box3.makeEmpty();
    for (const plane of floorPlanes) {
      _box3.expandByObject(plane);
    }
    if (_box3.isEmpty()) return null;

    _box3.getSize(_boxSize);
    _box3.getCenter(_boxCenter);
    if (_boxSize.x < 1.2 || _boxSize.z < 1.2) return null;

    return {
      center: { x: _boxCenter.x, z: _boxCenter.z },
      width: _boxSize.x,
      depth: _boxSize.z,
    };
  }

  // ===========================================================================
  // 3D REBUILD & INTERACTION
  // ===========================================================================
  private clearAssemblyGroup(): void {
    this.rotaryDrums.length = 0;
    this.orbitWheels.length = 0;
    this.orbitCradles.length = 0;
    this.driveRollers.length = 0;
    this.pumpRotorsX.length = 0;
    this.pumpRotorsZ.length = 0;
    this.towerSpinners.length = 0;
    this.gearWheels.length = 0;
    this.flowTurbines.length = 0;
    this.siphonFloats.length = 0;
    this.pistonBobs.length = 0;
    this.bubbleRises.length = 0;
    while (this.assemblyGroup.children.length > 0) {
      const child = this.assemblyGroup.children[0];
      child.traverse((node) => {
        if (node instanceof THREE.InstancedMesh) {
          node.dispose();
        }
      });
      this.assemblyGroup.remove(child);
    }
  }

  private rebuildSystems(): void {
    this.clearAssemblyGroup();

    const solar = computeSolarPosition(this.config.timeOfDay);
    const bom = calculateBOM(this.config, this.points.length, this.points);
    const telemetry = computeTelemetry(this.config, solar.lux);
    const capability = analyzeCapability(this.config, bom, telemetry, this.points);

    if (this.config.architecture === 'BIOMESH') {
      const bioGroup = this.builder.buildBioMesh(
        this.config,
        this.points,
        !this.isSoftwareGl,
        this.showDiagnostics,
        capability.rating
      );
      this.assemblyGroup.add(bioGroup);
    } else {
      for (let i = 0; i < this.points.length; i++) {
        const pt = this.points[i];
        const sysGroup = this.builder.buildSystem(
          this.config,
          i,
          !this.isSoftwareGl,
          this.showDiagnostics,
          capability.rating
        );
        sysGroup.position.set(pt.x, pt.y, pt.z);
        this.assemblyGroup.add(sysGroup);
      }
      this.applyManipulationFlags();
    }

    this.assemblyGroup.traverse((node) => {
      const role = node.userData?.animRole;
      if (role === 'rotaryDrum') this.rotaryDrums.push(node);
      else if (role === 'orbitWheel') this.orbitWheels.push(node);
      else if (role === 'orbitCradle') this.orbitCradles.push(node);
      else if (role === 'driveRoller') this.driveRollers.push(node);
      else if (role === 'pumpRotorX') this.pumpRotorsX.push(node);
      else if (role === 'pumpRotorZ') this.pumpRotorsZ.push(node);
      else if (role === 'towerSpinner') this.towerSpinners.push(node);
      else if (role === 'gearWheel') this.gearWheels.push(node);
      else if (role === 'flowTurbine') this.flowTurbines.push(node);
      else if (role === 'siphonFloat') this.siphonFloats.push(node);
      else if (role === 'pistonBob') this.pistonBobs.push(node);
      else if (role === 'bubbleRise') this.bubbleRises.push(node);
    });
  }

  private applyManipulationFlags(): void {
    for (const child of this.assemblyGroup.children) {
      if (!child.userData?.isHydroSystem) continue;
      if (this.tool === 'MOVE') {
        child.xb = {
          manipulation: {
            actions: {
              translate: true,
              rotate: { axis: 'y', space: 'world' },
              scale: false,
            },
          },
        };
      } else {
        child.xb = { manipulation: false };
      }
    }
  }

  private isUiOrSystemTarget(target: THREE.Object3D | undefined): {
    isUi: boolean;
    systemIndex: number;
  } {
    let cur: THREE.Object3D | null | undefined = target;
    while (cur) {
      if (
        cur === this.ui.architectCard ||
        cur === this.ui.assemblyCard ||
        cur === this.ui.hudOverlay
      ) {
        return { isUi: true, systemIndex: -1 };
      }
      if (cur.userData?.isHydroSystem && typeof cur.userData.systemIndex === 'number') {
        return { isUi: false, systemIndex: cur.userData.systemIndex };
      }
      cur = cur.parent;
    }
    return { isUi: false, systemIndex: -1 };
  }

  onSelectStart(event: xb.SelectEvent): void {
    const { isUi, systemIndex } = this.isUiOrSystemTarget(event.target);
    if (isUi) return;

    if (this.tool === 'ERASE') {
      if (systemIndex >= 0 && systemIndex < this.points.length) {
        this.points.splice(systemIndex, 1);
        this.statusMessage = `Removed unit (${this.points.length} remaining).`;
        this.rebuildSystems();
        this.syncUI();
      }
      return;
    }

    if (this.tool === 'MOVE') {
      return; // Handled automatically by child.xb.manipulation
    }

    // PLACE mode: place on depth mesh or floor plane intersection
    if (systemIndex >= 0) return;

    const hit = this.resolveFloorPoint(event);
    if (!hit) return;

    this.points.push({
      x: Math.round(hit.x * 100) / 100,
      y: this.config.architecture === 'BIOMESH' ? Math.max(0.08, Math.round(hit.y * 100) / 100) : 0,
      z: Math.round(hit.z * 100) / 100,
    });
    this.statusMessage = `Added ${this.config.architecture} unit (${this.points.length} total).`;
    this.rebuildSystems();
    this.syncUI();
  }

  onObjectManipulate(event: xb.ManipulationEvent): void {
    if (event.phase !== 'end') return;
    const owner = event.owner;
    if (owner?.userData?.isHydroSystem && typeof owner.userData.systemIndex === 'number') {
      const idx = owner.userData.systemIndex;
      if (idx >= 0 && idx < this.points.length) {
        this.points[idx] = {
          x: Math.round(owner.position.x * 100) / 100,
          y: Math.max(0, Math.round(owner.position.y * 100) / 100),
          z: Math.round(owner.position.z * 100) / 100,
        };
      }
    }
  }

  private resolveFloorPoint(event: xb.SelectEvent): THREE.Vector3 | null {
    if (event.surface === this.depth?.depthMesh && event.intersection) {
      return event.intersection.point.clone();
    }

    const controller = event.source?.controller;
    if (!controller) return null;

    controller.getWorldPosition(_rayOrigin);
    _rayDir.set(0, 0, -1).applyQuaternion(controller.quaternion).normalize();
    _ray.set(_rayOrigin, _rayDir);

    const hit = _ray.intersectPlane(FLOOR_PLANE, _hitPoint);
    if (!hit) return null;

    const dist = _rayOrigin.distanceTo(hit);
    if (dist < 0.5 || dist > 9.0) return null;
    return hit.clone();
  }

  // ===========================================================================
  // FRAME LOOP & SYNC
  // ===========================================================================
  update(): void {
    const dt = Math.min(0.1, xb.getDeltaTime());

    // 1. Validate Spatial UI once after first frame
    if (!this.validatedUiOnce && this.simStarted) {
      const report = xb.ui.validate();
      if (report.ready) {
        this.validatedUiOnce = true;
        document.body.dataset.hydroUiOk = String(
          report.ok && report.issues.length === 0
        );
        document.body.dataset.hydroUiIssues = String(report.issues.length);
        if (!report.ok || report.issues.length > 0) {
          console.warn(
            'HydroSpatial UI validation issues:',
            JSON.stringify(
              report.issues.map((i) => ({
                code: i.code,
                severity: i.severity,
                name: i.element?.name ?? '',
                message: i.message,
              }))
            )
          );
        }
      }
    }

    // 2. Scroll nutrient water-flow texture & animate mechanical mechanisms
    this.elapsedTime += dt;
    this.materials.flowTexture.offset.y -= dt * 1.4;
    for (const drum of this.rotaryDrums) drum.rotation.x += dt * 0.28;
    for (const wheel of this.orbitWheels) wheel.rotation.x += dt * 0.24;
    for (const cradle of this.orbitCradles) cradle.rotation.x -= dt * 0.24;
    for (const roller of this.driveRollers) roller.rotation.x -= dt * 1.6;
    for (const rotor of this.pumpRotorsX) rotor.rotation.x += dt * 8.5;
    for (const rotor of this.pumpRotorsZ) rotor.rotation.z += dt * 3.4;
    for (const spinner of this.towerSpinners) spinner.rotation.y += dt * 3.6;
    for (const gear of this.gearWheels) gear.rotation.z += dt * 1.6;
    for (const turbine of this.flowTurbines) turbine.rotation.z += dt * 7.5;
    for (const fl of this.siphonFloats) {
      const baseY = typeof fl.userData.baseY === 'number' ? fl.userData.baseY : fl.position.y;
      fl.position.y = baseY + Math.sin(this.elapsedTime * 2.2) * 0.025;
    }
    for (const piston of this.pistonBobs) {
      const baseY = typeof piston.userData.baseY === 'number' ? piston.userData.baseY : piston.position.y;
      piston.position.y = baseY + Math.abs(Math.sin(this.elapsedTime * 8.5)) * 0.011;
    }
    for (const bubble of this.bubbleRises) {
      const baseY = typeof bubble.userData.baseY === 'number' ? bubble.userData.baseY : bubble.position.y;
      const phase = typeof bubble.userData.phase === 'number' ? bubble.userData.phase : 0;
      bubble.position.y = baseY + ((this.elapsedTime * 0.14 + phase) % 0.19);
    }

    // 3. Scanning animation
    if (this.isScanning) {
      this.scanElapsed += dt;
      const progress = Math.min(1, this.scanElapsed / 1.4);
      this.scannerGroup.scale.setScalar(0.15 + progress * 1.15);
      this.scannerGroup.rotation.y += dt * 0.8;
      if (this.scanElapsed >= 1.4) {
        this.finishAutoScan();
      }
    }

    // 4. Growth cycle animation (throttled rebuilds <= 8Hz)
    if (this.isGrowthAnimating) {
      this.config.growthMonth = Math.min(12, this.config.growthMonth + dt * 1.1);
      if (this.config.growthMonth >= 12) {
        this.isGrowthAnimating = false;
      }
      this.rebuildTimer += dt;
      if (this.rebuildTimer >= 0.14 || !this.isGrowthAnimating) {
        this.rebuildTimer = 0;
        this.rebuildSystems();
        this.syncUI();
      }
    }

    // 5. Solar cycle animation (throttled UI sync <= 8Hz)
    if (this.isTimeAnimating) {
      this.config.timeOfDay += dt * 0.9;
      if (this.config.timeOfDay > 18) {
        this.config.timeOfDay = 6;
      }
      this.updateSolarLighting();
      this.uiSyncTimer += dt;
      if (this.uiSyncTimer >= 0.15) {
        this.uiSyncTimer = 0;
        this.syncUI();
      }
    }

    // 6. Placement reticle update
    this.updateReticle();
  }

  private updateReticle(): void {
    if (this.tool !== 'PLACE' || !this.user) {
      this.placementReticle.visible = false;
      return;
    }

    const controller = this.user.controllers?.[0];
    if (!controller) {
      this.placementReticle.visible = false;
      return;
    }

    const rayHit = this.user.getRayIntersection(0);
    if (rayHit && rayHit.object && !this.isUiOrSystemTarget(rayHit.object).isUi) {
      if (rayHit.object === this.depth?.depthMesh) {
        this.placementReticle.position.copy(rayHit.point);
        this.placementReticle.position.y += 0.01;
        this.placementReticle.visible = true;
        return;
      }
    }

    controller.getWorldPosition(_rayOrigin);
    _rayDir.set(0, 0, -1).applyQuaternion(controller.quaternion).normalize();
    _ray.set(_rayOrigin, _rayDir);
    const hit = _ray.intersectPlane(FLOOR_PLANE, _hitPoint);
    if (hit && _rayOrigin.distanceTo(hit) >= 0.6 && _rayOrigin.distanceTo(hit) <= 8.5 && !rayHit) {
      this.placementReticle.position.set(hit.x, 0.012, hit.z);
      this.placementReticle.visible = true;
    } else {
      this.placementReticle.visible = false;
    }
  }

  private updateSolarLighting(): void {
    const solar = computeSolarPosition(this.config.timeOfDay);
    this.sunLight.position.set(solar.x, solar.y, solar.z);
    this.sunLight.intensity = solar.intensity;
    this.sunLight.color.setHex(solar.colorHex);
  }

  private syncUI(): void {
    const solar = computeSolarPosition(this.config.timeOfDay);
    const bom = calculateBOM(this.config, this.points.length, this.points);
    const telemetry = computeTelemetry(this.config, solar.lux);
    const capability = analyzeCapability(this.config, bom, telemetry, this.points);

    this.ui.sync(this.config, bom, telemetry, capability, this.tool, {
      isGrowthAnimating: this.isGrowthAnimating,
      isTimeAnimating: this.isTimeAnimating,
      isScanning: this.isScanning,
      cardsVisible: this.cardsVisible,
      showDiagnostics: this.showDiagnostics,
      statusMessage: this.statusMessage,
    });

    document.body.dataset.hydroArch = this.config.architecture;
    document.body.dataset.hydroCrop = this.config.crop;
    document.body.dataset.hydroStep = String(this.config.assemblyStep);
    document.body.dataset.hydroSystems = String(bom.systems);
    document.body.dataset.hydroPlants = String(bom.plants);
    document.body.dataset.hydroCapScore = String(capability.score);
    document.body.dataset.hydroCapRating = capability.rating;
    document.body.dataset.hydroCapRec = capability.recommendedArch;
    document.body.dataset.hydroDiag = String(this.showDiagnostics);
  }

  dispose(): void {
    this.clearAssemblyGroup();
    this.builder?.dispose();
    if (this.materials) disposeHydroMaterials(this.materials);
    this.envTarget?.dispose();
    this.floorRing?.geometry.dispose();
    (this.floorRing?.material as THREE.Material | undefined)?.dispose();
    this.shadowFloor?.geometry.dispose();
    (this.shadowFloor?.material as THREE.Material | undefined)?.dispose();
    this.placementReticle?.geometry.dispose();
    (this.placementReticle?.material as THREE.Material | undefined)?.dispose();
  }
}
