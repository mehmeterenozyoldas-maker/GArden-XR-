import * as THREE from 'three';
import { CROPS } from './constants';
import { getArchitectureDepth, getSitesPerPipe } from './calculator';
import type { CapabilityRating, CropSpec, HydroConfig, LayoutPoint } from './types';

export interface HydroMaterials {
  aluminum: THREE.MeshStandardMaterial;
  stainlessSteel: THREE.MeshStandardMaterial;
  bracket: THREE.MeshStandardMaterial;
  rubberFoot: THREE.MeshStandardMaterial;
  brassValve: THREE.MeshStandardMaterial;
  valveRed: THREE.MeshStandardMaterial;
  pvcWhite: THREE.MeshStandardMaterial;
  pvcGrey: THREE.MeshStandardMaterial;
  pvcJoint: THREE.MeshStandardMaterial;
  tankBody: THREE.MeshStandardMaterial;
  tankRibs: THREE.MeshStandardMaterial;
  tankLid: THREE.MeshStandardMaterial;
  pumpBody: THREE.MeshStandardMaterial;
  dripTube: THREE.MeshStandardMaterial;
  flowTube: THREE.MeshStandardMaterial;
  acrylicClear: THREE.MeshStandardMaterial;
  growLedBar: THREE.MeshStandardMaterial;
  growLedOff: THREE.MeshStandardMaterial;
  iotHousing: THREE.MeshStandardMaterial;
  iotDisplay: THREE.MeshStandardMaterial;
  gaugeFace: THREE.MeshStandardMaterial;
  iotLedGreen: THREE.MeshStandardMaterial;
  iotLedBlue: THREE.MeshStandardMaterial;
  reagentPink: THREE.MeshStandardMaterial;
  reagentGreen: THREE.MeshStandardMaterial;
  reagentAmber: THREE.MeshStandardMaterial;
  netPot: THREE.MeshStandardMaterial;
  leca: THREE.MeshStandardMaterial;
  skidSteel: THREE.MeshStandardMaterial;
  filterHousing: THREE.MeshStandardMaterial;
  copperCoil: THREE.MeshStandardMaterial;
  hexBoltMat: THREE.MeshStandardMaterial;
  waterSurface: THREE.MeshStandardMaterial;
  rootFiber: THREE.MeshStandardMaterial;
  hazardYellow: THREE.MeshStandardMaterial;
  uvCoreGlow: THREE.MeshStandardMaterial;
  mistHalo: THREE.MeshStandardMaterial;
  skidPlacard: THREE.MeshStandardMaterial;
  contactShadow: THREE.MeshBasicMaterial;
  flowTexture: THREE.CanvasTexture;
  metalRoughnessMap: THREE.CanvasTexture;
  shadowTexture: THREE.CanvasTexture;
  iotScreenTexture: THREE.CanvasTexture;
  gaugeTexture: THREE.CanvasTexture;
  skidPlacardTexture: THREE.CanvasTexture;
}

function createFlowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, '#0284c7');
  grad.addColorStop(0.35, '#38bdf8');
  grad.addColorStop(0.55, '#bae6fd');
  grad.addColorStop(0.75, '#0ea5e9');
  grad.addColorStop(1, '#0284c7');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 32, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 6);
  return tex;
}

function createBrushedMetalTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#888888';
  ctx.fillRect(0, 0, 128, 128);
  for (let i = 0; i < 180; i++) {
    const y = Math.floor(Math.random() * 128);
    const v = 95 + Math.floor(Math.random() * 70);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(0, y, 128, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 4);
  return tex;
}

function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  grad.addColorStop(0, 'rgba(0,0,0,0.52)');
  grad.addColorStop(0.55, 'rgba(0,0,0,0.2)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createIotScreenTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 192;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#07111f';
  ctx.fillRect(0, 0, 256, 192);
  ctx.strokeStyle = '#0ea5e9';
  ctx.lineWidth = 4;
  ctx.strokeRect(4, 4, 248, 184);

  ctx.fillStyle = '#0f2744';
  ctx.fillRect(10, 10, 236, 30);
  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('HYDRO-CTRL v4.2', 18, 30);

  ctx.fillStyle = '#4ade80';
  ctx.font = 'bold 24px monospace';
  ctx.fillText('pH 6.02', 18, 76);
  ctx.fillStyle = '#38bdf8';
  ctx.fillText('EC 1.48', 136, 76);

  ctx.fillStyle = '#fbbf24';
  ctx.font = 'bold 16px monospace';
  ctx.fillText('FLOW 12.4 L/m', 18, 114);
  ctx.fillStyle = '#94a3b8';
  ctx.fillText('TANK 92%  21.4C', 18, 140);

  // Waveform / bar graph
  const bars = [18, 28, 24, 32, 26, 34, 29, 36, 30, 33];
  for (let i = 0; i < bars.length; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#10b981' : '#0ea5e9';
    ctx.fillRect(18 + i * 22, 180 - bars[i] * 0.7, 14, bars[i] * 0.7);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createPressureGaugeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.arc(64, 64, 60, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 4;
  ctx.stroke();

  // Green optimal arc
  ctx.strokeStyle = '#10b981';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(64, 64, 44, Math.PI * 0.9, Math.PI * 1.7);
  ctx.stroke();

  // Red high-pressure arc
  ctx.strokeStyle = '#ef4444';
  ctx.beginPath();
  ctx.arc(64, 64, 44, Math.PI * 1.7, Math.PI * 2.15);
  ctx.stroke();

  // Ticks
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 8; i++) {
    const a = Math.PI * 0.8 + (i / 8) * Math.PI * 1.4;
    ctx.beginPath();
    ctx.moveTo(64 + Math.cos(a) * 34, 64 + Math.sin(a) * 34);
    ctx.lineTo(64 + Math.cos(a) * 48, 64 + Math.sin(a) * 48);
    ctx.stroke();
  }

  // Needle
  const needleAngle = Math.PI * 1.42;
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(64, 64);
  ctx.lineTo(64 + Math.cos(needleAngle) * 40, 64 + Math.sin(needleAngle) * 40);
  ctx.stroke();

  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(64, 64, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('PSI', 64, 96);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function createSkidPlacardTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 128);

  // Hazard yellow industrial border & corner chevrons
  ctx.strokeStyle = '#eab308';
  ctx.lineWidth = 6;
  ctx.strokeRect(6, 6, 500, 116);

  ctx.fillStyle = '#eab308';
  ctx.fillRect(14, 14, 18, 100);
  ctx.fillRect(480, 14, 18, 100);

  ctx.fillStyle = '#f8fafc';
  ctx.font = 'bold 26px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HYDRO-SKID 100L · 24V DC', 256, 52);

  ctx.fillStyle = '#38bdf8';
  ctx.font = 'bold 22px monospace';
  ctx.fillText('UV-C STERILIZER · ACTIVE', 256, 92);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createHydroMaterials(maxAnisotropy = 4): HydroMaterials {
  const flowTexture = createFlowTexture();
  flowTexture.anisotropy = maxAnisotropy;
  const metalRoughnessMap = createBrushedMetalTexture();
  const shadowTexture = createContactShadowTexture();
  const iotScreenTexture = createIotScreenTexture();
  iotScreenTexture.anisotropy = maxAnisotropy;
  const gaugeTexture = createPressureGaugeTexture();
  gaugeTexture.anisotropy = maxAnisotropy;
  const skidPlacardTexture = createSkidPlacardTexture();
  skidPlacardTexture.anisotropy = maxAnisotropy;

  return {
    aluminum: new THREE.MeshStandardMaterial({
      color: 0x526071,
      metalness: 0.86,
      roughness: 0.3,
      roughnessMap: metalRoughnessMap,
    }),
    stainlessSteel: new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      metalness: 0.94,
      roughness: 0.18,
    }),
    bracket: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.65,
      roughness: 0.42,
    }),
    rubberFoot: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.05,
      roughness: 0.92,
    }),
    brassValve: new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.88,
      roughness: 0.24,
    }),
    valveRed: new THREE.MeshStandardMaterial({
      color: 0xdc2626,
      metalness: 0.28,
      roughness: 0.38,
    }),
    pvcWhite: new THREE.MeshStandardMaterial({
      color: 0xf1f5f9,
      metalness: 0.04,
      roughness: 0.26,
    }),
    pvcGrey: new THREE.MeshStandardMaterial({
      color: 0x64748b,
      metalness: 0.1,
      roughness: 0.42,
    }),
    pvcJoint: new THREE.MeshStandardMaterial({
      color: 0xdbeafe,
      metalness: 0.08,
      roughness: 0.22,
    }),
    tankBody: new THREE.MeshStandardMaterial({
      color: 0x0f2942,
      metalness: 0.08,
      roughness: 0.32,
    }),
    tankRibs: new THREE.MeshStandardMaterial({
      color: 0x091d32,
      metalness: 0.12,
      roughness: 0.44,
    }),
    tankLid: new THREE.MeshStandardMaterial({
      color: 0x1e3a5f,
      metalness: 0.1,
      roughness: 0.4,
    }),
    pumpBody: new THREE.MeshStandardMaterial({
      color: 0x0ea5e9,
      metalness: 0.38,
      roughness: 0.3,
    }),
    dripTube: new THREE.MeshStandardMaterial({
      color: 0x18181b,
      metalness: 0.05,
      roughness: 0.72,
    }),
    flowTube: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: flowTexture,
      emissive: 0x0284c7,
      emissiveIntensity: 0.4,
      roughness: 0.2,
      metalness: 0.12,
    }),
    acrylicClear: new THREE.MeshStandardMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.36,
      roughness: 0.12,
      metalness: 0.08,
      depthWrite: false,
    }),
    growLedBar: new THREE.MeshStandardMaterial({
      color: 0xfff1f2,
      emissive: 0xf472b6,
      emissiveIntensity: 1.45,
      roughness: 0.15,
    }),
    growLedOff: new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.2,
      roughness: 0.4,
    }),
    iotHousing: new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      metalness: 0.38,
      roughness: 0.36,
    }),
    iotDisplay: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: iotScreenTexture,
      emissive: 0x0ea5e9,
      emissiveMap: iotScreenTexture,
      emissiveIntensity: 0.55,
      roughness: 0.2,
    }),
    gaugeFace: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: gaugeTexture,
      roughness: 0.25,
    }),
    iotLedGreen: new THREE.MeshStandardMaterial({
      color: 0x10b981,
      emissive: 0x10b981,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
    iotLedBlue: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.5,
      roughness: 0.2,
    }),
    reagentPink: new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      transparent: true,
      opacity: 0.82,
      roughness: 0.2,
    }),
    reagentGreen: new THREE.MeshStandardMaterial({
      color: 0x10b981,
      transparent: true,
      opacity: 0.82,
      roughness: 0.2,
    }),
    reagentAmber: new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.82,
      roughness: 0.2,
    }),
    netPot: new THREE.MeshStandardMaterial({
      color: 0x171717,
      metalness: 0.05,
      roughness: 0.78,
    }),
    leca: new THREE.MeshStandardMaterial({
      color: 0x9a4c32,
      metalness: 0.02,
      roughness: 0.92,
    }),
    skidSteel: new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.72,
      roughness: 0.45,
    }),
    filterHousing: new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      transparent: true,
      opacity: 0.62,
      roughness: 0.16,
      metalness: 0.1,
      depthWrite: false,
    }),
    copperCoil: new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.24,
    }),
    hexBoltMat: new THREE.MeshStandardMaterial({
      color: 0xe2e8f0,
      metalness: 0.92,
      roughness: 0.2,
    }),
    waterSurface: new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      map: flowTexture,
      transparent: true,
      opacity: 0.56,
      roughness: 0.12,
      metalness: 0.1,
      depthWrite: false,
    }),
    rootFiber: new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.85,
      metalness: 0.0,
    }),
    hazardYellow: new THREE.MeshStandardMaterial({
      color: 0xeab308,
      metalness: 0.25,
      roughness: 0.42,
    }),
    uvCoreGlow: new THREE.MeshStandardMaterial({
      color: 0xe0e7ff,
      emissive: 0x818cf8,
      emissiveIntensity: 1.8,
      roughness: 0.15,
    }),
    mistHalo: new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.45,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    skidPlacard: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: skidPlacardTexture,
      roughness: 0.35,
      metalness: 0.15,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
    contactShadow: new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.52,
      depthWrite: false,
    }),
    flowTexture,
    metalRoughnessMap,
    shadowTexture,
    iotScreenTexture,
    gaugeTexture,
    skidPlacardTexture,
  };
}

export function disposeHydroMaterials(mats: HydroMaterials): void {
  mats.flowTexture.dispose();
  mats.metalRoughnessMap.dispose();
  mats.shadowTexture.dispose();
  mats.iotScreenTexture.dispose();
  mats.gaugeTexture.dispose();
  mats.skidPlacardTexture.dispose();
  const keys = Object.keys(mats) as (keyof HydroMaterials)[];
  for (const k of keys) {
    const val = mats[k];
    if (val instanceof THREE.Material) {
      val.dispose();
    }
  }
}

interface PlantSite {
  x: number;
  y: number;
  z: number;
  rx?: number;
  ry?: number;
  rz?: number;
}

function createTSlotProfileGeometry(): THREE.BufferGeometry {
  const s = 0.021; // 42mm outer half-width
  const g = 0.006; // slot width half
  const d = 0.007; // slot depth
  const shape = new THREE.Shape();
  shape.moveTo(-s, -s);
  shape.lineTo(-g, -s);
  shape.lineTo(-g, -s + d);
  shape.lineTo(g, -s + d);
  shape.lineTo(g, -s);
  shape.lineTo(s, -s);

  shape.lineTo(s, -g);
  shape.lineTo(s - d, -g);
  shape.lineTo(s - d, g);
  shape.lineTo(s, g);
  shape.lineTo(s, s);

  shape.lineTo(g, s);
  shape.lineTo(g, s - d);
  shape.lineTo(-g, s - d);
  shape.lineTo(-g, s);
  shape.lineTo(-s, s);

  shape.lineTo(-s, g);
  shape.lineTo(-s + d, g);
  shape.lineTo(-s + d, -g);
  shape.lineTo(-s, -g);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    steps: 1,
    bevelEnabled: false,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -0.5, 0);
  geo.computeVertexNormals();
  return geo;
}

function createLevelFootGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.044, 0.0),
    new THREE.Vector2(0.044, 0.012),
    new THREE.Vector2(0.036, 0.022),
    new THREE.Vector2(0.014, 0.026),
    new THREE.Vector2(0.014, 0.045),
    new THREE.Vector2(0.0, 0.045),
  ];
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.computeVertexNormals();
  return geo;
}

function createGussetGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(0.085, 0);
  shape.lineTo(0, 0.085);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.034,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.003,
    bevelSize: 0.003,
    bevelSegments: 2,
  });
  geo.translate(0, 0, -0.017);
  geo.computeVertexNormals();
  return geo;
}

function createBatoBucketGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.105, 0.0),
    new THREE.Vector2(0.128, 0.245),
    new THREE.Vector2(0.14, 0.255),
    new THREE.Vector2(0.14, 0.28),
    new THREE.Vector2(0.12, 0.28),
    new THREE.Vector2(0.115, 0.24),
    new THREE.Vector2(0.0, 0.24),
  ];
  const geo = new THREE.LatheGeometry(pts, 12);
  geo.computeVertexNormals();
  return geo;
}

function createPotCollarGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.027, -0.018),
    new THREE.Vector2(0.036, -0.018),
    new THREE.Vector2(0.046, 0.0),
    new THREE.Vector2(0.044, 0.01),
    new THREE.Vector2(0.03, 0.01),
    new THREE.Vector2(0.027, -0.018),
  ];
  const geo = new THREE.LatheGeometry(pts, 14);
  geo.computeVertexNormals();
  return geo;
}

function createLeafBladeGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.quadraticCurveTo(0.032, 0.028, 0.018, 0.075);
  shape.quadraticCurveTo(0, 0.098, 0, 0.102);
  shape.quadraticCurveTo(0, 0.098, -0.018, 0.075);
  shape.quadraticCurveTo(-0.032, 0.028, 0, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 0.005,
    steps: 2,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.002,
    bevelSegments: 1,
  });
  geo.rotateX(-Math.PI / 3.1);
  geo.computeVertexNormals();
  return geo;
}

function createGearWheelGeometry(radius = 0.044, teeth = 12, depth = 0.014): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const innerR = radius * 0.8;
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a0 = i * step;
    const a1 = a0 + step * 0.22;
    const a2 = a0 + step * 0.34;
    const a3 = a0 + step * 0.66;
    const a4 = a0 + step * 0.78;
    if (i === 0) shape.moveTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    else shape.lineTo(Math.cos(a0) * innerR, Math.sin(a0) * innerR);
    shape.lineTo(Math.cos(a1) * innerR, Math.sin(a1) * innerR);
    shape.lineTo(Math.cos(a2) * radius, Math.sin(a2) * radius);
    shape.lineTo(Math.cos(a3) * radius, Math.sin(a3) * radius);
    shape.lineTo(Math.cos(a4) * innerR, Math.sin(a4) * innerR);
  }
  shape.closePath();

  const bore = new THREE.Path();
  bore.absarc(0, 0, radius * 0.28, 0, Math.PI * 2, true);
  shape.holes.push(bore);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelThickness: 0.002,
    bevelSize: 0.0015,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  geo.computeVertexNormals();
  return geo;
}

function createFinHeatsinkGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const hw = 0.058;
  shape.moveTo(-hw, 0);
  shape.lineTo(hw, 0);
  shape.lineTo(hw, 0.012);
  const fins = 6;
  const finW = (hw * 2) / (fins * 2 - 1);
  for (let i = fins * 2 - 1; i >= 0; i--) {
    const xRight = -hw + (i + 1) * finW;
    const xLeft = -hw + i * finW;
    if (i % 2 === 0) {
      shape.lineTo(xRight, 0.032);
      shape.lineTo(xLeft, 0.032);
      shape.lineTo(xLeft, 0.012);
    } else {
      shape.lineTo(xLeft, 0.012);
    }
  }
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: 1,
    steps: 1,
    bevelEnabled: false,
  });
  geo.rotateY(Math.PI / 2);
  geo.translate(-0.5, 0, 0);
  geo.computeVertexNormals();
  return geo;
}

function createFilterCanisterGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.036, 0.0),
    new THREE.Vector2(0.044, 0.016),
    new THREE.Vector2(0.046, 0.145),
    new THREE.Vector2(0.052, 0.155),
    new THREE.Vector2(0.052, 0.175),
    new THREE.Vector2(0.0, 0.175),
  ];
  const geo = new THREE.LatheGeometry(pts, 16);
  geo.computeVertexNormals();
  return geo;
}

function createCycloneConeGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.0, 0.0),
    new THREE.Vector2(0.022, 0.0),
    new THREE.Vector2(0.022, 0.045),
    new THREE.Vector2(0.115, 0.22),
    new THREE.Vector2(0.115, 0.34),
    new THREE.Vector2(0.132, 0.345),
    new THREE.Vector2(0.132, 0.365),
    new THREE.Vector2(0.0, 0.365),
  ];
  const geo = new THREE.LatheGeometry(pts, 20);
  geo.computeVertexNormals();
  return geo;
}

function createFlangeRingGeometry(): THREE.BufferGeometry {
  const pts = [
    new THREE.Vector2(0.165, -0.012),
    new THREE.Vector2(0.225, -0.012),
    new THREE.Vector2(0.225, 0.012),
    new THREE.Vector2(0.165, 0.012),
    new THREE.Vector2(0.165, -0.012),
  ];
  const geo = new THREE.LatheGeometry(pts, 24);
  geo.computeVertexNormals();
  return geo;
}

export class HydroBuilder {
  private readonly mats: HydroMaterials;
  private readonly sharedGeos: THREE.BufferGeometry[] = [];
  private readonly tubeCache = new Map<string, THREE.BufferGeometry>();

  // Shared unit & procedural CAD geometries
  private readonly unitBox = new THREE.BoxGeometry(1, 1, 1);
  private readonly unitCyl = new THREE.CylinderGeometry(1, 1, 1, 16);
  private readonly unitSphere = new THREE.SphereGeometry(1, 12, 10);
  private readonly unitTorus = new THREE.TorusGeometry(1, 0.08, 10, 28);
  private readonly shadowPlane = new THREE.PlaneGeometry(1, 1);
  private readonly hexBoltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.014, 6);
  private readonly tslotPostGeo = createTSlotProfileGeometry();
  private readonly levelFootGeo = createLevelFootGeometry();
  private readonly gussetGeo = createGussetGeometry();
  private readonly batoBucketGeo = createBatoBucketGeometry();
  private readonly potCollarGeo = createPotCollarGeometry();
  private readonly gearWheelGeo = createGearWheelGeometry();
  private readonly finHeatsinkGeo = createFinHeatsinkGeometry();
  private readonly filterCanisterGeo = createFilterCanisterGeometry();
  private readonly cycloneConeGeo = createCycloneConeGeometry();
  private readonly flangeRingGeo = createFlangeRingGeometry();
  private readonly mistRingGeo = new THREE.RingGeometry(0.055, 0.135, 24).rotateX(-Math.PI / 2);
  private readonly netPotGeo = new THREE.CylinderGeometry(0.032, 0.024, 0.045, 12);
  private readonly lecaGeo = new THREE.TorusGeometry(0.022, 0.008, 6, 12);
  private readonly rootClusterGeo = new THREE.ConeGeometry(0.022, 0.085, 7);
  private readonly sweepGeo = new THREE.TorusGeometry(0.125, 0.048, 12, 18, Math.PI);
  private readonly leafBladeGeo = createLeafBladeGeometry();
  private readonly tallLeafGeo = new THREE.ConeGeometry(0.038, 0.1, 6);
  private readonly fruitGeo = new THREE.SphereGeometry(0.022, 10, 8);
  private readonly leafMats = new Map<string, THREE.MeshStandardMaterial>();
  private readonly fruitMats = new Map<string, THREE.MeshStandardMaterial>();
  private readonly diagZoneMats = new Map<CapabilityRating, THREE.MeshBasicMaterial>();
  private readonly diagEdgeMats = new Map<CapabilityRating, THREE.MeshBasicMaterial>();
  private readonly ppfdBeamGeo = new THREE.CylinderGeometry(0.14, 0.48, 0.72, 4, 1, true);
  private readonly ppfdBeamMat = new THREE.MeshBasicMaterial({
    color: 0xf472b6,
    transparent: true,
    opacity: 0.13,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending,
  });
  private activeDiagnostics = false;

  constructor(mats: HydroMaterials) {
    this.mats = mats;
    this.ppfdBeamGeo.rotateY(Math.PI / 4);
    this.sharedGeos.push(
      this.unitBox,
      this.unitCyl,
      this.unitSphere,
      this.unitTorus,
      this.shadowPlane,
      this.hexBoltGeo,
      this.tslotPostGeo,
      this.levelFootGeo,
      this.gussetGeo,
      this.batoBucketGeo,
      this.potCollarGeo,
      this.gearWheelGeo,
      this.finHeatsinkGeo,
      this.filterCanisterGeo,
      this.cycloneConeGeo,
      this.flangeRingGeo,
      this.mistRingGeo,
      this.netPotGeo,
      this.lecaGeo,
      this.rootClusterGeo,
      this.sweepGeo,
      this.leafBladeGeo,
      this.tallLeafGeo,
      this.fruitGeo,
      this.ppfdBeamGeo
    );
  }

  public dispose(): void {
    for (const geo of this.sharedGeos) geo.dispose();
    for (const geo of this.tubeCache.values()) geo.dispose();
    for (const mat of this.leafMats.values()) mat.dispose();
    for (const mat of this.fruitMats.values()) mat.dispose();
    for (const mat of this.diagZoneMats.values()) mat.dispose();
    for (const mat of this.diagEdgeMats.values()) mat.dispose();
    this.ppfdBeamMat.dispose();
    this.tubeCache.clear();
    this.leafMats.clear();
    this.fruitMats.clear();
    this.diagZoneMats.clear();
    this.diagEdgeMats.clear();
  }

  public buildSystem(
    config: HydroConfig,
    systemIndex: number,
    enableShadows: boolean,
    showDiagnostics = false,
    diagRating: CapabilityRating = 'GOOD'
  ): THREE.Group {
    const root = new THREE.Group();
    root.name = `HydroSystem_${systemIndex}`;
    root.userData = { systemIndex, isHydroSystem: true };
    this.activeDiagnostics = showDiagnostics;

    const step = config.assemblyStep;
    const width = config.width;
    const tiers = config.tiers;
    const depth = getArchitectureDepth(config.architecture, width);

    // Grounding Contact Shadow
    const shadowDisc = new THREE.Mesh(this.shadowPlane, this.mats.contactShadow);
    shadowDisc.rotation.x = -Math.PI / 2;
    shadowDisc.position.y = 0.008;
    shadowDisc.scale.set(width + 0.55, depth + 0.65, 1);
    root.add(shadowDisc);

    if (showDiagnostics) {
      this.addClearanceEnvelope(root, 0, 0, width + 0.4, depth + 0.45, diagRating);
    }

    const plantSites: PlantSite[] = [];
    const cropSpec = CROPS[config.crop];

    switch (config.architecture) {
      case 'ZIG-ZAG':
        this.buildZigZag(root, width, tiers, step, plantSites, enableShadows);
        break;
      case 'TOWERS':
        this.buildTowers(root, width, tiers, step, plantSites, enableShadows);
        break;
      case 'A-FRAME':
        this.buildAFrame(root, width, tiers, step, plantSites, enableShadows);
        break;
      case 'HORIZ-BED':
        this.buildHorizBed(root, width, tiers, step, plantSites, enableShadows);
        break;
      case 'DUTCH-BKT':
        this.buildDutchBuckets(root, width, tiers, step, plantSites, enableShadows);
        break;
      case 'ROTARY':
        this.buildRotaryDrum(root, width, tiers, step, cropSpec, config.growthMonth, enableShadows);
        break;
      case 'HELIX':
        this.buildHelixCoil(root, width, tiers, step, plantSites, enableShadows);
        break;
      case 'PYRAMID':
        this.buildPyramid(root, width, tiers, step, plantSites, enableShadows);
        break;
      case 'AERO-WALL':
        this.buildAeroWall(root, width, tiers, step, plantSites, enableShadows);
        break;
      case 'AQUA-POD':
        this.buildAquaPod(root, width, tiers, step, plantSites, enableShadows);
        break;
      case 'ORBIT-FOG':
        this.buildOrbitFog(root, width, tiers, step, cropSpec, config.growthMonth, enableShadows);
        break;
      case 'BIOMESH':
        this.buildZigZag(root, width, tiers, step, plantSites, enableShadows);
        break;
    }

    // Step 10: Biological Loading (Net pots + LECA + Multi-tier Instanced Crops)
    // Note: ROTARY and ORBIT-FOG populate crops inside their rotating assemblies directly.
    if (
      step >= 10 &&
      plantSites.length > 0 &&
      config.architecture !== 'ROTARY' &&
      config.architecture !== 'ORBIT-FOG'
    ) {
      const showRoots =
        config.architecture === 'HORIZ-BED' ||
        config.architecture === 'AERO-WALL' ||
        config.architecture === 'AQUA-POD';
      this.populateCrops(
        root,
        plantSites,
        cropSpec,
        config.growthMonth,
        enableShadows,
        showRoots
      );
    }

    this.activeDiagnostics = false;
    return root;
  }

  public buildBioMesh(
    config: HydroConfig,
    points: readonly LayoutPoint[],
    enableShadows: boolean,
    showDiagnostics = false,
    diagRating: CapabilityRating = 'GOOD'
  ): THREE.Group {
    const root = new THREE.Group();
    root.name = 'HydroBioMesh';
    this.activeDiagnostics = showDiagnostics;
    const step = config.assemblyStep;
    if (points.length === 0) {
      this.activeDiagnostics = false;
      return root;
    }

    if (showDiagnostics && points.length >= 2) {
      let minX = Infinity;
      let maxX = -Infinity;
      let minZ = Infinity;
      let maxZ = -Infinity;
      for (const p of points) {
        if (p.x < minX) minX = p.x;
        if (p.x > maxX) maxX = p.x;
        if (p.z < minZ) minZ = p.z;
        if (p.z > maxZ) maxZ = p.z;
      }
      this.addClearanceEnvelope(
        root,
        (minX + maxX) / 2,
        (minZ + maxZ) / 2,
        Math.max(1.2, maxX - minX + 0.7),
        Math.max(1.0, maxZ - minZ + 0.7),
        diagRating
      );
    }

    const plantSites: PlantSite[] = [];
    const cropSpec = CROPS[config.crop];

    // Step 1-3: T-Slot Stanchions, Leveling Feet, Swivel Ball Joints
    for (let i = 0; i < points.length; i++) {
      const pt = points[i];
      if (step >= 1) {
        const postH = Math.max(0.45, pt.y + 0.45);
        this.addTSlotPost(root, postH, pt.x, postH / 2 + 0.04, pt.z, enableShadows);
        this.addFoot(root, pt.x, pt.z, enableShadows);
      }
      if (step >= 3) {
        this.addCyl(root, 0.07, 0.07, 0.045, pt.x, pt.y + 0.44, pt.z, this.mats.bracket, enableShadows);
        this.addCyl(root, 0.055, 0.055, 0.02, pt.x, pt.y + 0.41, pt.z, this.mats.brassValve, enableShadows);
      }
      if (step >= 5) {
        this.addSphere(root, 0.068, pt.x, pt.y + 0.46, pt.z, this.mats.pvcJoint, enableShadows);
        this.addCyl(root, 0.074, 0.074, 0.024, pt.x, pt.y + 0.46, pt.z, this.mats.stainlessSteel, enableShadows);
      }
    }

    // Step 4 & 8: Continuous curved conduit tubes between waypoints
    if (points.length >= 2) {
      const pipeYOffset = 0.46;
      const curvePts = points.map((p) => new THREE.Vector3(p.x, p.y + pipeYOffset, p.z));
      const curve = new THREE.CatmullRomCurve3(curvePts);

      if (step >= 4) {
        const key = `biomesh_main_${curvePts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`).join('|')}`;
        let tubeGeo = this.tubeCache.get(key);
        if (!tubeGeo) {
          tubeGeo = new THREE.TubeGeometry(curve, Math.max(24, points.length * 14), 0.052, 12, false);
          this.tubeCache.set(key, tubeGeo);
        }
        const tubeMesh = new THREE.Mesh(tubeGeo, this.mats.pvcWhite);
        tubeMesh.castShadow = enableShadows;
        tubeMesh.receiveShadow = enableShadows;
        root.add(tubeMesh);

        const totalLen = curve.getLength();
        const count = Math.max(4, Math.floor(totalLen / 0.24));
        for (let k = 1; k < count; k++) {
          const p = curve.getPointAt(k / count);
          plantSites.push({ x: p.x, y: p.y + 0.045, z: p.z });
          this.addPotCollar(root, p.x, p.y + 0.042, p.z);
        }
      }

      if (step >= 8) {
        const feedPts = curvePts.map((p) => new THREE.Vector3(p.x, p.y - 0.08, p.z));
        const feedCurve = new THREE.CatmullRomCurve3(feedPts);
        const fKey = `biomesh_feed_${feedPts.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)},${p.z.toFixed(2)}`).join('|')}`;
        let feedGeo = this.tubeCache.get(fKey);
        if (!feedGeo) {
          feedGeo = new THREE.TubeGeometry(feedCurve, Math.max(20, points.length * 12), 0.014, 8, false);
          this.tubeCache.set(fKey, feedGeo);
        }
        root.add(new THREE.Mesh(feedGeo, this.mats.flowTube));
      }
    }

    const basePt = points[points.length - 1];
    this.addReservoirAndIoT(root, basePt.x + 0.35, 0, basePt.z, step, enableShadows);

    if (step >= 10 && plantSites.length > 0) {
      this.populateCrops(root, plantSites, cropSpec, config.growthMonth, enableShadows);
    }

    this.activeDiagnostics = false;
    return root;
  }

  // ===========================================================================
  // ARCHITECTURE 1: ZIG-ZAG SERPENTINE NFT STACK
  // ===========================================================================
  private buildZigZag(
    root: THREE.Group,
    width: number,
    tiers: number,
    step: number,
    plantSites: PlantSite[],
    enableShadows: boolean
  ): void {
    const tierStep = 0.25;
    const baseY = 0.58;
    const topY = baseY + (tiers - 1) * tierStep + 0.28;
    const halfW = width / 2;
    const frameHalfZ = 0.2;

    // Step 1: Extruded 4040 T-Slot Aluminum uprights + Lathed leveling feet
    if (step >= 1) {
      const postPositions: [number, number][] = [
        [-halfW + 0.08, -frameHalfZ],
        [-halfW + 0.08, frameHalfZ],
        [halfW - 0.08, -frameHalfZ],
        [halfW - 0.08, frameHalfZ],
      ];
      for (const [px, pz] of postPositions) {
        this.addTSlotPost(root, topY - 0.03, px, topY / 2 + 0.015, pz, enableShadows);
        this.addFoot(root, px, pz, enableShadows);
      }
    }

    // Step 2: Cross-bracing, gusset brackets, steel tension X-braces & finned LED canopy
    if (step >= 2) {
      for (const px of [-halfW + 0.08, halfW - 0.08]) {
        this.addBox(root, 0.036, 0.036, frameHalfZ * 2, px, 0.14, 0, this.mats.aluminum, enableShadows);
        this.addBox(root, 0.036, 0.036, frameHalfZ * 2, px, topY - 0.03, 0, this.mats.aluminum, enableShadows);
        this.addGusset(root, px, 0.16, -frameHalfZ + 0.02, 0, Math.PI / 2, 0);
        this.addGusset(root, px, 0.16, frameHalfZ - 0.02, 0, -Math.PI / 2, 0);
      }
      this.addBox(root, width - 0.16, 0.034, 0.034, 0, topY - 0.03, -frameHalfZ, this.mats.aluminum, enableShadows);
      this.addBox(root, width - 0.16, 0.034, 0.034, 0, 0.42, -frameHalfZ, this.mats.aluminum, enableShadows);
      this.addGusset(root, -halfW + 0.1, topY - 0.05, -frameHalfZ, 0, 0, -Math.PI / 2);
      this.addGusset(root, halfW - 0.1, topY - 0.05, -frameHalfZ, 0, Math.PI, -Math.PI / 2);

      // Rear Stainless Steel Diagonal Tension X-Braces + Turnbuckle Sleeves
      const diagSpan = Math.hypot(width - 0.24, topY - 0.48);
      const diagTilt = Math.atan2(topY - 0.48, width - 0.24);
      const midBraceY = (topY - 0.03 + 0.42) / 2;
      this.addCyl(root, 0.007, 0.007, diagSpan, 0, midBraceY, -frameHalfZ, this.mats.stainlessSteel, false, 0, 0, Math.PI / 2 - diagTilt);
      this.addCyl(root, 0.007, 0.007, diagSpan, 0, midBraceY, -frameHalfZ, this.mats.stainlessSteel, false, 0, 0, Math.PI / 2 + diagTilt);
      this.addCyl(root, 0.018, 0.018, 0.05, 0, midBraceY, -frameHalfZ, this.mats.brassValve, false);

      // Overhead Finned LED Grow Light Canopy Bar
      this.addGrowLightCanopy(root, width - 0.24, topY + 0.06, 0, step >= 8, enableShadows, topY - 0.03);
    }

    const slopeAngle = 0.044;
    const sitesCount = getSitesPerPipe(width);

    for (let t = 0; t < tiers; t++) {
      const y = baseY + t * tierStep;
      const dir = t % 2 === 0 ? 1 : -1;
      const tilt = dir * slopeAngle;

      // Step 3: Split-ring saddle clamps & cross-arms
      if (step >= 3) {
        for (const cx of [-halfW + 0.16, 0, halfW - 0.16]) {
          const cy = y + cx * Math.tan(tilt);
          this.addCyl(root, 0.064, 0.064, 0.032, cx, cy, 0, this.mats.bracket, enableShadows, 0, 0, Math.PI / 2);
          this.addCyl(root, 0.068, 0.068, 0.008, cx, cy, 0, this.mats.stainlessSteel, false, 0, 0, Math.PI / 2);
          this.addBox(root, 0.028, 0.024, frameHalfZ * 2, cx, cy - 0.048, 0, this.mats.bracket, enableShadows);
        }
      }

      // Step 4: White PVC Channels + Molded Pot Collar Rings
      if (step >= 4) {
        const pipeLen = width - 0.08;
        this.addCyl(root, 0.054, 0.054, pipeLen, 0, y, 0, this.mats.pvcWhite, enableShadows, 0, 0, Math.PI / 2 + tilt);
        // Center flanged coupling union
        this.addCyl(root, 0.06, 0.06, 0.045, 0, y, 0, this.mats.pvcJoint, enableShadows, 0, 0, Math.PI / 2 + tilt);

        for (let s = 0; s < sitesCount; s++) {
          const sx = -halfW + 0.24 + (s / Math.max(1, sitesCount - 1)) * (width - 0.48);
          const sy = y + sx * Math.tan(tilt) + 0.048;
          plantSites.push({ x: sx, y: sy, z: 0 });
          this.addPotCollar(root, sx, sy - 0.002, 0);
        }
      }

      // Step 5: 180-deg Sweep Elbows, Socket Flanges & Bolted Endcaps
      if (step >= 5) {
        const leftEndY = y + (-halfW + 0.04) * Math.tan(tilt);
        const rightEndY = y + (halfW - 0.04) * Math.tan(tilt);

        if (t < tiers - 1) {
          const joinRight = t % 2 === 0;
          const jx = joinRight ? halfW - 0.04 : -halfW + 0.04;
          const jy = (joinRight ? rightEndY : leftEndY) + tierStep / 2;
          const sweep = new THREE.Mesh(this.sweepGeo, this.mats.pvcJoint);
          sweep.position.set(jx, jy, 0);
          sweep.rotation.z = joinRight ? -Math.PI / 2 : Math.PI / 2;
          sweep.castShadow = enableShadows;
          root.add(sweep);
          // Dual socket collar rings at U-bend transition
          this.addCyl(root, 0.06, 0.06, 0.025, jx, (joinRight ? rightEndY : leftEndY), 0, this.mats.pvcJoint, enableShadows, 0, 0, Math.PI / 2);
          this.addCyl(root, 0.06, 0.06, 0.025, jx, (joinRight ? rightEndY : leftEndY) + tierStep, 0, this.mats.pvcJoint, enableShadows, 0, 0, Math.PI / 2);
        }

        if (t === 0 || t === tiers - 1) {
          const endX = t === 0 ? -halfW + 0.03 : (tiers % 2 === 1 ? halfW - 0.03 : -halfW + 0.03);
          const endY = endX > 0 ? rightEndY : leftEndY;
          this.addCyl(root, 0.06, 0.06, 0.045, endX, endY, 0, this.mats.pvcJoint, enableShadows, 0, 0, Math.PI / 2);
          this.addCyl(root, 0.026, 0.026, 0.06, endX + (endX > 0 ? 0.02 : -0.02), endY, 0, this.mats.brassValve, enableShadows, 0, 0, Math.PI / 2);
        }
      }
    }

    const drainX = -halfW + 0.12;
    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    if (step >= 2) {
      this.addBox(root, width - 0.16, 0.016, 0.018, 0, 0.045, frameHalfZ + 0.01, this.mats.hazardYellow, false);
    }

    if (step >= 7) {
      const dropH = baseY - 0.34;
      this.addCyl(root, 0.028, 0.028, dropH, drainX, 0.35 + dropH / 2, 0, this.mats.pvcGrey, enableShadows);
      this.addCyl(root, 0.052, 0.032, 0.045, drainX, baseY - 0.09, 0, this.mats.brassValve, enableShadows);
      this.addCyl(root, 0.04, 0.04, 0.03, drainX, 0.36, 0, this.mats.brassValve, enableShadows);
      this.addBox(root, Math.abs(drainX) + 0.08, 0.044, 0.044, drainX / 2, 0.36, 0, this.mats.pvcGrey, enableShadows);
    }

    if (step >= 8) {
      const feedSide = tiers % 2 === 1 ? halfW - 0.09 : -halfW + 0.09;
      const topFeedY = baseY + (tiers - 1) * tierStep + 0.08;
      const riserH = topFeedY - 0.14;
      this.addCyl(root, 0.018, 0.018, riserH, feedSide, 0.14 + riserH / 2, 0.06, this.mats.flowTube, enableShadows);
      this.addBox(root, Math.abs(feedSide) + 0.06, 0.028, 0.028, feedSide / 2, 0.36, 0.06, this.mats.flowTube, enableShadows);
      this.addBallValve(root, feedSide, 0.65, 0.06, 0, 0, 0);
      this.addPressureGauge(root, feedSide + (feedSide > 0 ? 0.05 : -0.05), 0.78, 0.08);
      this.addCyl(root, 0.009, 0.009, 0.1, feedSide, topFeedY - 0.02, 0.03, this.mats.dripTube, false, 0.4, 0, 0);
    }
  }

  // ===========================================================================
  // ARCHITECTURE 2: MODULAR AEROPONIC ROTARY MIST TOWERS
  // ===========================================================================
  private buildTowers(
    root: THREE.Group,
    width: number,
    tiers: number,
    step: number,
    plantSites: PlantSite[],
    enableShadows: boolean
  ): void {
    const cols = Math.max(2, Math.round(width / 0.55));
    const towerH = 0.54 + tiers * 0.24;
    const baseY = 0.4;
    const colSpacing = (width - 0.32) / Math.max(1, cols - 1);

    if (step >= 1) {
      for (const px of [-width / 2 + 0.06, width / 2 - 0.06]) {
        this.addTSlotPost(root, baseY + towerH + 0.14, px, (baseY + towerH + 0.14) / 2 + 0.02, -0.18, enableShadows);
        this.addFoot(root, px, -0.18, enableShadows);
      }
    }

    if (step >= 2) {
      this.addBox(root, width - 0.12, 0.038, 0.038, 0, baseY + towerH + 0.12, -0.18, this.mats.aluminum, enableShadows);
      this.addBox(root, width - 0.12, 0.038, 0.038, 0, 0.38, 0, this.mats.aluminum, enableShadows);
      this.addGusset(root, -width / 2 + 0.08, baseY + towerH + 0.1, -0.18, 0, 0, -Math.PI / 2);
      this.addGusset(root, width / 2 - 0.08, baseY + towerH + 0.1, -0.18, 0, Math.PI, -Math.PI / 2);
      this.addGrowLightCanopy(root, width - 0.18, baseY + towerH + 0.17, 0.04, step >= 8, enableShadows);
    }

    for (let c = 0; c < cols; c++) {
      const cx = cols === 1 ? 0 : -width / 2 + 0.16 + c * colSpacing;

      if (step >= 3) {
        this.addCyl(root, 0.078, 0.078, 0.04, cx, baseY + 0.04, 0, this.mats.bracket, enableShadows);
        this.addCyl(root, 0.078, 0.078, 0.04, cx, baseY + towerH - 0.06, 0, this.mats.bracket, enableShadows);
        this.addBox(root, 0.03, 0.03, 0.18, cx, baseY + towerH - 0.06, -0.09, this.mats.aluminum, enableShadows);
      }

      if (step >= 4) {
        this.addCyl(root, 0.068, 0.068, towerH, cx, baseY + towerH / 2, 0, this.mats.pvcWhite, enableShadows);

        for (let t = 0; t < tiers; t++) {
          const py = baseY + 0.22 + t * 0.22;
          // Ribbed module seam ring
          this.addCyl(root, 0.073, 0.073, 0.016, cx, py - 0.09, 0, this.mats.pvcJoint, enableShadows);
          const angleOffset = (t % 2) * (Math.PI / 2);
          for (let side = 0; side < 2; side++) {
            const ang = angleOffset + side * Math.PI;
            const px = cx + Math.cos(ang) * 0.074;
            const pz = Math.sin(ang) * 0.074;
            const rx = Math.sin(ang) * 0.58;
            const rz = -Math.cos(ang) * 0.58;

            // 45-deg Molded Planting Port Pocket
            const cup = new THREE.Mesh(this.potCollarGeo, this.mats.pvcJoint);
            cup.position.set(px, py, pz);
            cup.rotation.set(rx, 0, rz);
            cup.castShadow = enableShadows;
            root.add(cup);

            plantSites.push({ x: px, y: py, z: pz, rx, rz });
          }
        }
      }

      if (step >= 5) {
        // Cyclone Mist Cap + Stainless Retaining Ring
        this.addCyl(root, 0.078, 0.078, 0.045, cx, baseY + towerH + 0.02, 0, this.mats.pvcJoint, enableShadows);
        this.addCyl(root, 0.032, 0.045, 0.03, cx, baseY + towerH + 0.055, 0, this.mats.brassValve, enableShadows);
      }

      if (step >= 8) {
        this.addCyl(root, 0.014, 0.014, towerH + 0.05, cx, baseY + towerH / 2, -0.095, this.mats.flowTube, enableShadows);
        // Toothed Sprocket Gear atop each tower column + Animated Rotary Mist Spinner
        this.addGearWheel(root, cx, baseY + towerH + 0.062, 0, 0.72, Math.PI / 2, 0, 0, 'gearWheel');
        const spinner = new THREE.Group();
        spinner.name = `TowerSpinner_${c}`;
        spinner.userData.animRole = 'towerSpinner';
        spinner.position.set(cx, baseY + towerH + 0.085, 0);
        this.addBox(spinner, 0.14, 0.012, 0.012, 0, 0, 0, this.mats.stainlessSteel, false);
        this.addSphere(spinner, 0.014, -0.065, 0, 0, this.mats.brassValve, false);
        this.addSphere(spinner, 0.014, 0.065, 0, 0, this.mats.brassValve, false);
        const halo = new THREE.Mesh(this.mistRingGeo, this.mats.mistHalo);
        halo.position.y = -0.004;
        spinner.add(halo);
        root.add(spinner);
      }
    }

    if (step >= 8) {
      this.addCyl(root, 0.024, 0.024, width - 0.18, 0, baseY + towerH + 0.1, -0.04, this.mats.flowTube, enableShadows, 0, 0, Math.PI / 2);
      // Overhead Synchronizing Drive Belt Bar across tower sprockets
      this.addBox(root, width - 0.26, 0.01, 0.018, 0, baseY + towerH + 0.064, 0.024, this.mats.dripTube, false);
      this.addBallValve(root, -width / 2 + 0.24, baseY + towerH + 0.1, -0.04, 0, 0, Math.PI / 2);
      this.addPressureGauge(root, 0, baseY + towerH + 0.13, -0.02);
    }

    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    if (step >= 7) {
      this.addBox(root, width - 0.16, 0.06, 0.26, 0, baseY - 0.02, 0, this.mats.pvcGrey, enableShadows);
      this.addCyl(root, 0.032, 0.032, 0.09, 0, baseY - 0.06, 0, this.mats.brassValve, enableShadows);
    }
  }

  // ===========================================================================
  // ARCHITECTURE 3: DUAL-SLOPE TRUSS A-FRAME
  // ===========================================================================
  private buildAFrame(
    root: THREE.Group,
    width: number,
    tiers: number,
    step: number,
    plantSites: PlantSite[],
    enableShadows: boolean
  ): void {
    const height = 0.58 + tiers * 0.22;
    const baseSpread = 0.46;
    const halfW = width / 2;
    const sitesCount = getSitesPerPipe(width);

    if (step >= 1) {
      const legLen = Math.hypot(height, baseSpread);
      const legTilt = Math.atan2(baseSpread, height);
      for (const sx of [-halfW + 0.1, halfW - 0.1]) {
        this.addTSlotPost(root, legLen, sx, height / 2 + 0.02, -baseSpread / 2, enableShadows, legTilt);
        this.addTSlotPost(root, legLen, sx, height / 2 + 0.02, baseSpread / 2, enableShadows, -legTilt);
        this.addFoot(root, sx, -baseSpread, enableShadows);
        this.addFoot(root, sx, baseSpread, enableShadows);
      }
    }

    if (step >= 2) {
      // Apex Ridge Beam + Welded Hinge Plates + Overhead LED Gantry Stanchions
      this.addBox(root, width - 0.12, 0.046, 0.046, 0, height + 0.02, 0, this.mats.aluminum, enableShadows);
      this.addBox(root, width - 0.16, 0.032, 0.032, 0, height + 0.22, 0, this.mats.aluminum, enableShadows);
      for (const sx of [-halfW + 0.1, halfW - 0.1]) {
        this.addBox(root, 0.055, 0.08, 0.09, sx, height + 0.01, 0, this.mats.bracket, enableShadows);
        this.addCyl(root, 0.012, 0.012, 0.18, sx, height + 0.12, 0, this.mats.stainlessSteel, enableShadows);
        this.addBox(root, 0.034, 0.034, baseSpread * 1.45, sx, 0.42, 0, this.mats.aluminum, enableShadows);
        this.addCyl(root, 0.014, 0.014, baseSpread * 1.1, sx, height * 0.62, 0, this.mats.stainlessSteel, false, Math.PI / 2);
      }
      this.addGrowLightCanopy(root, width - 0.2, height + 0.13, 0, step >= 8, enableShadows, height + 0.22);
    }

    for (let t = 0; t < tiers; t++) {
      const frac = (t + 1) / (tiers + 0.6);
      const py = 0.45 + frac * (height - 0.48);
      const pz = (1 - frac) * baseSpread * 0.88 + 0.09;

      for (const side of [-1, 1]) {
        const zPos = side * pz;
        if (step >= 3) {
          this.addCyl(root, 0.058, 0.058, 0.03, -halfW + 0.15, py, zPos, this.mats.bracket, enableShadows, 0, 0, Math.PI / 2);
          this.addCyl(root, 0.058, 0.058, 0.03, halfW - 0.15, py, zPos, this.mats.bracket, enableShadows, 0, 0, Math.PI / 2);
        }
        if (step >= 4) {
          this.addCyl(root, 0.048, 0.048, width - 0.08, 0, py, zPos, this.mats.pvcWhite, enableShadows, 0, 0, Math.PI / 2);
          for (let s = 0; s < sitesCount; s++) {
            const sx = -halfW + 0.22 + (s / Math.max(1, sitesCount - 1)) * (width - 0.44);
            plantSites.push({ x: sx, y: py + 0.044, z: zPos });
            this.addPotCollar(root, sx, py + 0.042, zPos);
          }
        }
        if (step >= 5) {
          this.addCyl(root, 0.055, 0.055, 0.036, -halfW + 0.04, py, zPos, this.mats.pvcJoint, enableShadows, 0, 0, Math.PI / 2);
          this.addCyl(root, 0.055, 0.055, 0.036, halfW - 0.04, py, zPos, this.mats.pvcJoint, enableShadows, 0, 0, Math.PI / 2);
        }
      }
    }

    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    if (step >= 7) {
      // Bottom V-Gutter Collector + Drop Pipe
      this.addBox(root, 0.05, 0.05, baseSpread * 1.8, -halfW + 0.06, 0.4, 0, this.mats.pvcGrey, enableShadows);
      this.addCyl(root, 0.026, 0.026, height - 0.35, -halfW + 0.06, 0.38 + (height - 0.35) / 2, 0.18, this.mats.pvcGrey, enableShadows);
    }
    if (step >= 8) {
      this.addCyl(root, 0.018, 0.018, height - 0.22, halfW - 0.08, 0.22 + (height - 0.22) / 2, 0, this.mats.flowTube, enableShadows);
      this.addBallValve(root, halfW - 0.08, 0.62, 0, 0, 0, 0);
    }
  }

  // ===========================================================================
  // ARCHITECTURE 4: EBB-AND-FLOW DWC RAFT TABLE WITH BELL SIPHON
  // ===========================================================================
  private buildHorizBed(
    root: THREE.Group,
    width: number,
    tiers: number,
    step: number,
    plantSites: PlantSite[],
    enableShadows: boolean
  ): void {
    const lanes = Math.max(2, Math.min(5, tiers));
    const bedY = 0.78;
    const bedDepth = 0.9;
    const halfW = width / 2;

    if (step >= 1) {
      for (const [lx, lz] of [
        [-halfW + 0.08, -bedDepth / 2 + 0.06],
        [-halfW + 0.08, bedDepth / 2 - 0.06],
        [halfW - 0.08, -bedDepth / 2 + 0.06],
        [halfW - 0.08, bedDepth / 2 - 0.06],
      ]) {
        this.addTSlotPost(root, bedY, lx, bedY / 2 + 0.02, lz, enableShadows);
        this.addFoot(root, lx, lz, enableShadows);
      }
    }

    if (step >= 2) {
      // Welded Aluminum Frame Skirt + Perimeter Flood Basin Tray + Steel Guard Rails
      this.addBox(root, width - 0.06, 0.05, bedDepth, 0, bedY - 0.02, 0, this.mats.aluminum, enableShadows);
      this.addBox(root, width - 0.04, 0.08, 0.03, 0, bedY + 0.03, -bedDepth / 2, this.mats.tankLid, enableShadows);
      this.addBox(root, width - 0.04, 0.08, 0.03, 0, bedY + 0.03, bedDepth / 2, this.mats.tankLid, enableShadows);
      this.addBox(root, 0.03, 0.08, bedDepth, -halfW + 0.03, bedY + 0.03, 0, this.mats.tankLid, enableShadows);
      this.addBox(root, 0.03, 0.08, bedDepth, halfW - 0.03, bedY + 0.03, 0, this.mats.tankLid, enableShadows);
      // Translucent Aerated Oxygenated DWC Water Surface Inside Basin
      this.addBox(root, width - 0.12, 0.012, bedDepth - 0.08, 0, bedY + 0.032, 0, this.mats.waterSurface, false);

      // Overhead Grow Light Gantry above DWC Table
      for (const lx of [-halfW + 0.08, halfW - 0.08]) {
        this.addTSlotPost(root, 0.85, lx, bedY + 0.44, 0, enableShadows);
      }
      this.addBox(root, width - 0.12, 0.034, 0.034, 0, bedY + 0.86, 0, this.mats.aluminum, enableShadows);
      this.addGrowLightCanopy(root, width - 0.18, bedY + 0.78, 0, step >= 8, enableShadows, bedY + 0.86);
    }

    const sitesCount = getSitesPerPipe(width);
    for (let l = 0; l < lanes; l++) {
      const lz = -bedDepth / 2 + 0.13 + (l / Math.max(1, lanes - 1)) * (bedDepth - 0.26);
      if (step >= 3) {
        this.addBox(root, 0.04, 0.03, 0.12, -halfW + 0.16, bedY + 0.02, lz, this.mats.bracket, enableShadows);
        this.addBox(root, 0.04, 0.03, 0.12, halfW - 0.16, bedY + 0.02, lz, this.mats.bracket, enableShadows);
      }
      if (step >= 4) {
        this.addBox(root, width - 0.1, 0.07, 0.14, 0, bedY + 0.055, lz, this.mats.pvcWhite, enableShadows);
        for (let s = 0; s < sitesCount; s++) {
          const sx = -halfW + 0.22 + (s / Math.max(1, sitesCount - 1)) * (width - 0.44);
          plantSites.push({ x: sx, y: bedY + 0.095, z: lz });
          this.addPotCollar(root, sx, bedY + 0.092, lz);
        }
      }
      if (step >= 5) {
        this.addBox(root, 0.04, 0.08, 0.15, -halfW + 0.04, bedY + 0.055, lz, this.mats.pvcJoint, enableShadows);
        this.addBox(root, 0.04, 0.08, 0.15, halfW - 0.04, bedY + 0.055, lz, this.mats.pvcJoint, enableShadows);
      }
    }

    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    if (step >= 7) {
      // Cutaway Glass Bell Siphon Chamber + Bobbing Float Indicator on left end of flood table
      this.addCyl(root, 0.052, 0.052, 0.18, -halfW + 0.14, bedY + 0.1, -bedDepth / 2 + 0.12, this.mats.acrylicClear, false);
      this.addCyl(root, 0.022, 0.022, 0.15, -halfW + 0.14, bedY + 0.085, -bedDepth / 2 + 0.12, this.mats.pvcGrey, enableShadows);
      const floatRing = this.addCyl(root, 0.04, 0.04, 0.02, -halfW + 0.14, bedY + 0.1, -bedDepth / 2 + 0.12, this.mats.valveRed, false);
      floatRing.userData.animRole = 'siphonFloat';
      floatRing.userData.baseY = bedY + 0.1;
      this.addCyl(root, 0.028, 0.028, bedY - 0.34, -halfW + 0.14, 0.34 + (bedY - 0.34) / 2, 0, this.mats.pvcGrey, enableShadows);
    }
    if (step >= 8) {
      this.addCyl(root, 0.018, 0.018, bedY - 0.18, halfW - 0.16, 0.18 + (bedY - 0.18) / 2, 0, this.mats.flowTube, enableShadows);
      this.addBallValve(root, halfW - 0.16, 0.56, 0, 0, 0, 0);
      this.addPressureGauge(root, halfW - 0.1, 0.68, 0.02);
    }
  }

  // ===========================================================================
  // ARCHITECTURE 5: DUTCH BATO BUCKET DRIP ARRAY
  // ===========================================================================
  private buildDutchBuckets(
    root: THREE.Group,
    width: number,
    _tiers: number,
    step: number,
    plantSites: PlantSite[],
    enableShadows: boolean
  ): void {
    const benchY = 0.48;
    const buckets = Math.max(3, Math.floor(width / 0.42));
    const halfW = width / 2;

    if (step >= 1) {
      for (const [lx, lz] of [
        [-halfW + 0.08, -0.28],
        [-halfW + 0.08, 0.28],
        [halfW - 0.08, -0.28],
        [halfW - 0.08, 0.28],
      ]) {
        this.addTSlotPost(root, benchY, lx, benchY / 2 + 0.02, lz, enableShadows);
        this.addFoot(root, lx, lz, enableShadows);
      }
    }

    if (step >= 2) {
      this.addBox(root, width - 0.12, 0.04, 0.56, 0, benchY - 0.02, 0, this.mats.aluminum, enableShadows);
      for (const lx of [-halfW + 0.08, halfW - 0.08]) {
        this.addTSlotPost(root, 0.96, lx, benchY + 0.48, 0, enableShadows);
      }
      this.addBox(root, width - 0.12, 0.034, 0.034, 0, benchY + 0.96, 0, this.mats.aluminum, enableShadows);
      // Stainless steel horizontal trellis support wires for vine crops
      this.addCyl(root, 0.005, 0.005, width - 0.16, 0, benchY + 0.72, -0.18, this.mats.stainlessSteel, false, 0, 0, Math.PI / 2);
      this.addCyl(root, 0.005, 0.005, width - 0.16, 0, benchY + 0.72, 0.18, this.mats.stainlessSteel, false, 0, 0, Math.PI / 2);
      this.addGrowLightCanopy(root, width - 0.16, benchY + 0.88, 0, step >= 8, enableShadows, benchY + 0.96);
    }

    for (let b = 0; b < buckets; b++) {
      const bx = -halfW + 0.24 + (b / Math.max(1, buckets - 1)) * (width - 0.48);
      for (const rz of [-0.18, 0.18]) {
        if (step >= 3) {
          this.addBox(root, 0.26, 0.02, 0.26, bx, benchY + 0.01, rz, this.mats.bracket, enableShadows);
        }
        if (step >= 4) {
          // Tapered Molded Bato Bucket (LatheGeometry)
          const bucket = new THREE.Mesh(this.batoBucketGeo, this.mats.pvcWhite);
          bucket.position.set(bx, benchY + 0.02, rz);
          bucket.castShadow = enableShadows;
          bucket.receiveShadow = enableShadows;
          root.add(bucket);
          plantSites.push({ x: bx, y: benchY + 0.3, z: rz });
        }
        if (step >= 5) {
          // Rim lid collar + elbow siphon drain spout + vertical climbing trellis stake
          this.addCyl(root, 0.142, 0.142, 0.026, bx, benchY + 0.3, rz, this.mats.pvcJoint, enableShadows);
          this.addPotCollar(root, bx, benchY + 0.31, rz);
          this.addCyl(root, 0.016, 0.016, 0.12, bx, benchY + 0.08, rz * 0.45, this.mats.pvcGrey, enableShadows, Math.PI / 2);
          this.addCyl(root, 0.004, 0.004, 0.42, bx - 0.06, benchY + 0.51, rz, this.mats.stainlessSteel, false);
        }
        if (step >= 8) {
          this.addCyl(root, 0.008, 0.008, 0.22, bx, benchY + 0.38, rz * 0.5, this.mats.dripTube, false, rz > 0 ? 0.5 : -0.5, 0, 0);
          // Drip stake emitter
          this.addCyl(root, 0.006, 0.004, 0.06, bx + 0.05, benchY + 0.32, rz, this.mats.brassValve, false);
        }
      }
    }

    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    if (step >= 7) {
      this.addCyl(root, 0.03, 0.03, width - 0.16, 0, benchY - 0.05, 0, this.mats.pvcGrey, enableShadows, 0, 0, Math.PI / 2);
    }
    if (step >= 8) {
      this.addCyl(root, 0.016, 0.016, width - 0.18, 0, benchY + 0.45, 0, this.mats.flowTube, enableShadows, 0, 0, Math.PI / 2);
      this.addBallValve(root, -halfW + 0.18, benchY + 0.45, 0, 0, 0, Math.PI / 2);
    }
  }

  // ===========================================================================
  // ARCHITECTURE 6 (NEW): MOTORIZED ROTARY GROW DRUM (OMEGA CAROUSEL)
  // ===========================================================================
  private buildRotaryDrum(
    root: THREE.Group,
    width: number,
    tiers: number,
    step: number,
    cropSpec: CropSpec,
    growthMonth: number,
    enableShadows: boolean
  ): void {
    const drumLen = Math.max(0.95, Math.min(2.2, width * 0.72));
    const drumRadius = 0.48;
    const drumCenterY = 0.96;
    const halfLen = drumLen / 2;
    const rings = Math.max(3, Math.min(7, tiers + 1));

    // Step 1: Heavy Aluminum Cradle Frame & End A-Pylons
    if (step >= 1) {
      for (const [lx, lz] of [
        [-halfLen - 0.08, -0.44],
        [-halfLen - 0.08, 0.44],
        [halfLen + 0.08, -0.44],
        [halfLen + 0.08, 0.44],
      ]) {
        this.addTSlotPost(root, 0.56, lx, 0.3, lz, enableShadows);
        this.addFoot(root, lx, lz, enableShadows);
      }
      // Lamp axle stanchions at drum ends
      for (const lx of [-halfLen - 0.1, halfLen + 0.1]) {
        this.addTSlotPost(root, drumCenterY + 0.08, lx, (drumCenterY + 0.08) / 2 + 0.02, 0, enableShadows);
      }
    }

    // Step 2: Cradle Rails & Gussets
    if (step >= 2) {
      for (const lz of [-0.4, 0.4]) {
        this.addBox(root, drumLen + 0.2, 0.04, 0.04, 0, 0.54, lz, this.mats.aluminum, enableShadows);
      }
      for (const lx of [-halfLen - 0.08, halfLen + 0.08]) {
        this.addBox(root, 0.04, 0.04, 0.88, lx, 0.54, 0, this.mats.aluminum, enableShadows);
        this.addGusset(root, lx, 0.56, -0.4, 0, Math.PI / 2, 0);
        this.addGusset(root, lx, 0.56, 0.4, 0, -Math.PI / 2, 0);
      }
    }

    // Step 3: Dual Motorized Drive Rollers + Stepper Motor Gearbox
    if (step >= 3) {
      for (const rz of [-0.34, 0.34]) {
        const rollerGroup = new THREE.Group();
        rollerGroup.userData.animRole = 'driveRoller';
        rollerGroup.position.set(0, 0.58, rz);
        this.addCyl(rollerGroup, 0.032, 0.032, drumLen + 0.08, 0, 0, 0, this.mats.stainlessSteel, enableShadows, 0, 0, Math.PI / 2);
        // Rubber drive tires contacting drum hoops
        for (const tx of [-halfLen + 0.12, halfLen - 0.12]) {
          this.addCyl(rollerGroup, 0.052, 0.052, 0.05, tx, 0, 0, this.mats.rubberFoot, enableShadows, 0, 0, Math.PI / 2);
        }
        root.add(rollerGroup);
      }
      // Stepper Motor + Meshed Spur Gear Train + Timing Belt to Drum Rim
      this.addBox(root, 0.14, 0.14, 0.14, halfLen + 0.16, 0.58, 0.34, this.mats.iotHousing, enableShadows);
      this.addCyl(root, 0.055, 0.055, 0.08, halfLen + 0.16, 0.58, 0.25, this.mats.brassValve, enableShadows, Math.PI / 2);
      this.addGearWheel(root, halfLen + 0.07, 0.58, 0.34, 0.95, 0, Math.PI / 2, 0, 'gearWheel');
      this.addGearWheel(root, halfLen + 0.07, 0.65, 0.27, 0.72, 0, Math.PI / 2, 0, 'gearWheel');
      // Tensioned timing belt rising from drive gear to drum rim track
      this.addBox(root, 0.014, 0.32, 0.026, halfLen + 0.05, 0.76, 0.36, this.mats.dripTube, false, 0.32, 0, 0);
    }

    // Step 4-5 & 10: Rotating Drum Assembly + Inward-Facing Plant Rings
    if (step >= 4) {
      const drumGroup = new THREE.Group();
      drumGroup.name = 'RotaryDrumAssembly';
      drumGroup.userData.animRole = 'rotaryDrum';
      drumGroup.position.set(0, drumCenterY, 0);
      root.add(drumGroup);

      // End structural hoops (stainless rim tracks)
      for (const hx of [-halfLen + 0.06, 0, halfLen - 0.06]) {
        const hoop = new THREE.Mesh(this.unitTorus, this.mats.stainlessSteel);
        hoop.scale.setScalar(drumRadius);
        hoop.rotation.y = Math.PI / 2;
        hoop.position.x = hx;
        hoop.castShadow = enableShadows;
        drumGroup.add(hoop);
      }

      // 8 Axial Growth Bars around drum perimeter + inward-facing sites
      const bars = 8;
      const drumSites: PlantSite[] = [];
      for (let b = 0; b < bars; b++) {
        const ang = (b / bars) * Math.PI * 2;
        const by = Math.sin(ang) * drumRadius;
        const bz = Math.cos(ang) * drumRadius;

        // White PVC radial channel bar running along X
        this.addBox(drumGroup, drumLen, 0.065, 0.085, 0, by, bz, this.mats.pvcWhite, enableShadows, -ang, 0, 0);

        if (step >= 5) {
          this.addBox(drumGroup, 0.035, 0.072, 0.095, -halfLen, by, bz, this.mats.pvcJoint, enableShadows, -ang, 0, 0);
          this.addBox(drumGroup, 0.035, 0.072, 0.095, halfLen, by, bz, this.mats.pvcJoint, enableShadows, -ang, 0, 0);
        }

        // Plant sites facing INWARD toward the central grow lamp
        const dirY = -Math.sin(ang);
        const dirZ = -Math.cos(ang);
        const rx = Math.atan2(dirZ, dirY);
        for (let r = 0; r < rings; r++) {
          const sx = -halfLen + 0.14 + (r / Math.max(1, rings - 1)) * (drumLen - 0.28);
          const sy = Math.sin(ang) * (drumRadius - 0.045);
          const sz = Math.cos(ang) * (drumRadius - 0.045);
          drumSites.push({ x: sx, y: sy, z: sz, rx, rz: 0 });
        }
      }

      if (step >= 10 && drumSites.length > 0) {
        this.populateCrops(drumGroup, drumSites, cropSpec, growthMonth, enableShadows);
      }
    }

    // Step 6 & 9: Nutrient Reservoir & IoT Hub beneath lower dip trough
    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    // Step 7: Lower Nutrient Immersion Dip Trough (catches bottom arc of rotating drum)
    if (step >= 7) {
      this.addBox(root, drumLen + 0.08, 0.12, 0.44, 0, 0.45, 0, this.mats.pvcGrey, enableShadows);
      this.addBox(root, drumLen, 0.02, 0.36, 0, 0.5, 0, this.mats.flowTube, false);
    }

    // Step 8: Central Quartz Full-Spectrum Grow-Lamp Tube + Feed Riser
    if (step >= 8) {
      // Glowing quartz lamp cylinder through drum axis
      this.addCyl(root, 0.042, 0.042, drumLen + 0.06, 0, drumCenterY, 0, this.mats.growLedBar, false, 0, 0, Math.PI / 2);
      this.addCyl(root, 0.062, 0.062, 0.08, -halfLen - 0.04, drumCenterY, 0, this.mats.aluminum, enableShadows, 0, 0, Math.PI / 2);
      this.addCyl(root, 0.062, 0.062, 0.08, halfLen + 0.04, drumCenterY, 0, this.mats.aluminum, enableShadows, 0, 0, Math.PI / 2);
      // Feed line into dip trough
      this.addCyl(root, 0.016, 0.016, 0.34, halfLen - 0.14, 0.32, 0.12, this.mats.flowTube, enableShadows);
      this.addBallValve(root, halfLen - 0.14, 0.38, 0.12, 0, 0, 0);
    }
  }

  // ===========================================================================
  // ARCHITECTURE 7 (NEW): CONTINUOUS HELICAL SPIRAL NFT COIL
  // ===========================================================================
  private buildHelixCoil(
    root: THREE.Group,
    width: number,
    tiers: number,
    step: number,
    plantSites: PlantSite[],
    enableShadows: boolean
  ): void {
    const turns = Math.max(2, tiers);
    const coilRadius = Math.min(0.56, Math.max(0.36, width * 0.24));
    const startY = 0.52;
    const pitchY = 0.24;
    const totalH = startY + turns * pitchY + 0.28;

    // Step 1: Central Aluminum Spine + Quad Outrigger Base
    if (step >= 1) {
      this.addTSlotPost(root, totalH, 0, totalH / 2 + 0.02, 0, enableShadows);
      for (const [lx, lz] of [
        [-coilRadius - 0.1, -coilRadius - 0.1],
        [-coilRadius - 0.1, coilRadius + 0.1],
        [coilRadius + 0.1, -coilRadius - 0.1],
        [coilRadius + 0.1, coilRadius + 0.1],
      ]) {
        this.addFoot(root, lx * 0.72, lz * 0.72, enableShadows);
      }
      this.addBox(root, coilRadius * 1.6, 0.04, 0.04, 0, 0.05, 0, this.mats.aluminum, enableShadows, 0, Math.PI / 4, 0);
      this.addBox(root, coilRadius * 1.6, 0.04, 0.04, 0, 0.05, 0, this.mats.aluminum, enableShadows, 0, -Math.PI / 4, 0);
    }

    // Step 2-3: Radial Cantilevered Support Arms & Saddle Collars along spiral
    const armCount = turns * 4;
    for (let i = 0; i <= armCount; i++) {
      const frac = i / armCount;
      const ang = frac * turns * Math.PI * 2;
      const ay = startY + frac * turns * pitchY;
      const ax = Math.cos(ang) * coilRadius;
      const az = Math.sin(ang) * coilRadius;

      if (step >= 2 && i % 2 === 0) {
        this.addCyl(root, 0.012, 0.012, coilRadius, ax / 2, ay - 0.04, az / 2, this.mats.aluminum, enableShadows, 0, -ang, Math.PI / 2);
      }
      if (step >= 3 && i % 2 === 0) {
        this.addCyl(root, 0.054, 0.054, 0.032, ax, ay, az, this.mats.bracket, enableShadows, 0, -ang, 0);
      }
    }

    // Step 4-5: Continuous Helical PVC Tube + Coupling Collars
    if (step >= 4) {
      const cacheKey = `helix_${turns}_${coilRadius.toFixed(2)}`;
      let helixGeo = this.tubeCache.get(cacheKey);
      if (!helixGeo) {
        const samples = turns * 24;
        const pts: THREE.Vector3[] = [];
        for (let i = 0; i <= samples; i++) {
          const frac = i / samples;
          const ang = frac * turns * Math.PI * 2;
          pts.push(
            new THREE.Vector3(
              Math.cos(ang) * coilRadius,
              startY + frac * turns * pitchY,
              Math.sin(ang) * coilRadius
            )
          );
        }
        const curve = new THREE.CatmullRomCurve3(pts);
        helixGeo = new THREE.TubeGeometry(curve, turns * 32, 0.046, 10, false);
        this.tubeCache.set(cacheKey, helixGeo);
      }
      const helixMesh = new THREE.Mesh(helixGeo, this.mats.pvcWhite);
      helixMesh.castShadow = enableShadows;
      helixMesh.receiveShadow = enableShadows;
      root.add(helixMesh);

      const totalPlants = Math.max(16, Math.floor((turns * Math.PI * 2 * coilRadius) / 0.2));
      for (let p = 0; p < totalPlants; p++) {
        const frac = (p + 0.5) / totalPlants;
        const ang = frac * turns * Math.PI * 2;
        const px = Math.cos(ang) * coilRadius;
        const py = startY + frac * turns * pitchY + 0.042;
        const pz = Math.sin(ang) * coilRadius;
        plantSites.push({ x: px, y: py, z: pz });
        this.addPotCollar(root, px, py - 0.002, pz);
      }
    }

    if (step >= 5) {
      const topAng = turns * Math.PI * 2;
      this.addSphere(root, 0.056, coilRadius, startY, 0, this.mats.pvcJoint, enableShadows);
      this.addSphere(root, 0.056, Math.cos(topAng) * coilRadius, startY + turns * pitchY, Math.sin(topAng) * coilRadius, this.mats.pvcJoint, enableShadows);
    }

    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    if (step >= 7) {
      this.addCyl(root, 0.024, 0.024, startY - 0.25, coilRadius, 0.32, 0, this.mats.pvcGrey, enableShadows);
      this.addCyl(root, 0.032, 0.032, coilRadius, coilRadius / 2, 0.34, 0, this.mats.pvcGrey, enableShadows, 0, 0, Math.PI / 2);
    }

    if (step >= 8) {
      // Vertical glowing riser along central spine + dual central LED light pillars + quadrant tie-rods
      const topCoilY = startY + turns * pitchY;
      this.addCyl(root, 0.016, 0.016, topCoilY - 0.16, -0.05, 0.16 + (topCoilY - 0.16) / 2, 0, this.mats.flowTube, enableShadows);
      this.addCyl(root, 0.014, 0.014, coilRadius, -coilRadius / 2, topCoilY, 0, this.mats.flowTube, enableShadows, 0, 0, Math.PI / 2);
      this.addBallValve(root, -0.05, 0.55, 0, 0, 0, 0);
      this.addPressureGauge(root, -0.05, 0.7, 0.04);
      this.addCyl(root, 0.016, 0.016, totalH - 0.45, 0.06, 0.45 + (totalH - 0.45) / 2, 0.06, this.mats.growLedBar, false);
      this.addCyl(root, 0.016, 0.016, totalH - 0.45, -0.06, 0.45 + (totalH - 0.45) / 2, -0.06, this.mats.growLedBar, false);
      // 4 Stainless vertical stabilizing tension rods tying helical coils
      for (const qAng of [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2]) {
        const rx = Math.cos(qAng) * (coilRadius + 0.052);
        const rz = Math.sin(qAng) * (coilRadius + 0.052);
        this.addCyl(root, 0.006, 0.006, turns * pitchY + 0.1, rx, startY + (turns * pitchY) / 2, rz, this.mats.stainlessSteel, false);
      }
    }
  }

  // ===========================================================================
  // ARCHITECTURE 8 (NEW): 4-FACE STEPPED AEROPONIC PYRAMID
  // ===========================================================================
  private buildPyramid(
    root: THREE.Group,
    width: number,
    tiers: number,
    step: number,
    plantSites: PlantSite[],
    enableShadows: boolean
  ): void {
    const levels = Math.max(3, Math.min(6, tiers));
    const baseSpan = Math.max(0.95, Math.min(1.65, width * 0.68));
    const baseY = 0.46;
    const levelH = 0.21;
    const apexY = baseY + levels * levelH + 0.18;

    // Step 1: 4 Inclined Corner T-Slot Rafters Converging Toward Apex + Outrigger Feet
    if (step >= 1) {
      const halfBase = baseSpan / 2 + 0.08;
      const topHalf = 0.16;
      const dx = halfBase - topHalf;
      const dy = apexY - 0.06;
      const rafterLen = Math.hypot(dy, dx * Math.SQRT2);
      const leanAngle = Math.atan2(dx, dy);

      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          this.addFoot(root, sx * halfBase, sz * halfBase, enableShadows);
          const rafter = new THREE.Mesh(this.tslotPostGeo, this.mats.aluminum);
          rafter.scale.set(1, rafterLen, 1);
          rafter.position.set(sx * (halfBase + topHalf) * 0.5, dy * 0.5 + 0.03, sz * (halfBase + topHalf) * 0.5);
          rafter.rotation.set(-sz * leanAngle, 0, sx * leanAngle);
          rafter.castShadow = enableShadows;
          root.add(rafter);
        }
      }
    }

    // Step 2: Apex Collar Plate, Halo Grow Light Ring & Base Framing
    if (step >= 2) {
      this.addBox(root, 0.36, 0.04, 0.36, 0, apexY, 0, this.mats.bracket, enableShadows);
      this.addCyl(root, 0.012, 0.012, 0.14, -0.12, apexY + 0.08, 0, this.mats.stainlessSteel, enableShadows);
      this.addCyl(root, 0.012, 0.012, 0.14, 0.12, apexY + 0.08, 0, this.mats.stainlessSteel, enableShadows);
      this.addBox(root, baseSpan + 0.12, 0.036, 0.036, 0, 0.12, -baseSpan / 2 - 0.06, this.mats.aluminum, enableShadows);
      this.addBox(root, baseSpan + 0.12, 0.036, 0.036, 0, 0.12, baseSpan / 2 + 0.06, this.mats.aluminum, enableShadows);
      this.addGrowLightCanopy(root, baseSpan * 0.82, apexY + 0.14, 0, step >= 8, enableShadows);
    }

    // Steps 3-5: Concentric 4-Sided Stepped PVC Channels + Corner Elbows
    for (let l = 0; l < levels; l++) {
      const frac = l / Math.max(1, levels);
      const span = Math.max(0.45, baseSpan * (1 - frac * 0.72));
      const half = span / 2;
      const py = baseY + l * levelH;
      const sitesPerEdge = Math.max(2, Math.floor(span / 0.22));

      if (step >= 3) {
        for (const [cx, cz] of [
          [-half, -half],
          [half, -half],
          [half, half],
          [-half, half],
        ]) {
          this.addBox(root, 0.065, 0.035, 0.065, cx, py - 0.03, cz, this.mats.bracket, enableShadows);
        }
      }

      if (step >= 4) {
        // North & South X-bars + East & West Z-bars
        this.addCyl(root, 0.042, 0.042, span, 0, py, -half, this.mats.pvcWhite, enableShadows, 0, 0, Math.PI / 2);
        this.addCyl(root, 0.042, 0.042, span, 0, py, half, this.mats.pvcWhite, enableShadows, 0, 0, Math.PI / 2);
        this.addCyl(root, 0.042, 0.042, span, -half, py, 0, this.mats.pvcWhite, enableShadows, Math.PI / 2, 0, 0);
        this.addCyl(root, 0.042, 0.042, span, half, py, 0, this.mats.pvcWhite, enableShadows, Math.PI / 2, 0, 0);

        for (let s = 0; s < sitesPerEdge; s++) {
          const offset = -half + 0.12 + (s / Math.max(1, sitesPerEdge - 1)) * (span - 0.24);
          const edges: [number, number][] = [
            [offset, -half],
            [offset, half],
            [-half, offset],
            [half, offset],
          ];
          for (const [px, pz] of edges) {
            plantSites.push({ x: px, y: py + 0.038, z: pz });
            this.addPotCollar(root, px, py + 0.036, pz);
          }
        }
      }

      if (step >= 5) {
        for (const [cx, cz] of [
          [-half, -half],
          [half, -half],
          [half, half],
          [-half, half],
        ]) {
          this.addSphere(root, 0.052, cx, py, cz, this.mats.pvcJoint, enableShadows);
        }
      }
    }

    // Step 6 & 9: Central Reservoir & IoT Skid inside pyramid base
    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    // Step 7-8: Central Pressurized Mist Riser + Apex Rotary Mist Spinner + Drop Return
    if (step >= 7) {
      this.addCyl(root, 0.026, 0.026, baseY - 0.14, -baseSpan * 0.28, 0.34, 0, this.mats.pvcGrey, enableShadows);
    }
    if (step >= 8) {
      this.addCyl(root, 0.018, 0.018, apexY - 0.22, 0, 0.22 + (apexY - 0.22) / 2, 0, this.mats.flowTube, enableShadows);
      this.addBallValve(root, 0, 0.56, 0.02, 0, 0, 0);
      this.addPressureGauge(root, 0.06, 0.68, 0.04);

      const apexSpinner = new THREE.Group();
      apexSpinner.userData.animRole = 'towerSpinner';
      apexSpinner.position.set(0, apexY + 0.04, 0);
      this.addBox(apexSpinner, 0.22, 0.012, 0.012, 0, 0, 0, this.mats.stainlessSteel, false);
      this.addSphere(apexSpinner, 0.014, -0.1, 0, 0, this.mats.brassValve, false);
      this.addSphere(apexSpinner, 0.014, 0.1, 0, 0, this.mats.brassValve, false);
      const apexHalo = new THREE.Mesh(this.mistRingGeo, this.mats.mistHalo);
      apexHalo.scale.setScalar(1.35);
      apexSpinner.add(apexHalo);
      root.add(apexSpinner);
    }
  }

  // ===========================================================================
  // ARCHITECTURE 9 (NEW): CANTILEVERED LIVING BIO-WALL MATRIX
  // ===========================================================================
  private buildAeroWall(
    root: THREE.Group,
    width: number,
    tiers: number,
    step: number,
    plantSites: PlantSite[],
    enableShadows: boolean
  ): void {
    const rows = Math.max(3, Math.min(6, tiers));
    const rowStep = 0.24;
    const baseY = 0.54;
    const wallH = baseY + (rows - 1) * rowStep + 0.32;
    const halfW = width / 2;
    const sitesCount = getSitesPerPipe(width);

    // Step 1: Freestanding T-Slot Uprights + Cantilevered Base Skid Outriggers
    if (step >= 1) {
      for (const px of [-halfW + 0.08, 0, halfW - 0.08]) {
        this.addTSlotPost(root, wallH, px, wallH / 2 + 0.02, -0.16, enableShadows);
        this.addBox(root, 0.042, 0.042, 0.66, px, 0.04, 0.05, this.mats.aluminum, enableShadows);
        this.addFoot(root, px, -0.24, enableShadows);
        this.addFoot(root, px, 0.34, enableShadows);
      }
    }

    // Step 2: Anodized Backplane Louver Slats + Cantilevered Top LED Boom Arm
    if (step >= 2) {
      this.addBox(root, width - 0.1, 0.036, 0.036, 0, wallH - 0.02, -0.16, this.mats.aluminum, enableShadows);
      for (let s = 0; s < rows; s++) {
        this.addBox(root, width - 0.18, 0.075, 0.018, 0, baseY + s * rowStep - 0.05, -0.13, this.mats.bracket, enableShadows);
      }
      // Forward Cantilevered Overhead LED Lighting Arms
      for (const px of [-halfW + 0.08, halfW - 0.08]) {
        this.addBox(root, 0.034, 0.034, 0.44, px, wallH, 0.04, this.mats.aluminum, enableShadows);
        this.addGusset(root, px, wallH - 0.02, -0.14, 0, -Math.PI / 2, 0);
      }
      this.addGrowLightCanopy(root, width - 0.16, wallH - 0.03, 0.24, step >= 8, enableShadows, wallH);
    }

    // Steps 3-5: Staggered Front-Facing Living Wall Planter Troughs
    for (let r = 0; r < rows; r++) {
      const py = baseY + r * rowStep;
      const pz = -0.05 + (r % 2) * 0.035;

      if (step >= 3) {
        for (const cx of [-halfW + 0.14, 0, halfW - 0.14]) {
          this.addBox(root, 0.032, 0.032, 0.14, cx, py - 0.03, pz - 0.06, this.mats.bracket, enableShadows);
        }
      }

      if (step >= 4) {
        this.addCyl(root, 0.05, 0.05, width - 0.1, 0, py, pz, this.mats.pvcWhite, enableShadows, 0, 0, Math.PI / 2);
        const rowShift = r % 2 === 1 ? 0.06 : -0.02;
        for (let s = 0; s < sitesCount; s++) {
          const sx = -halfW + 0.24 + rowShift + (s / Math.max(1, sitesCount - 1)) * (width - 0.52);
          const sy = py + 0.035;
          const sz = pz + 0.042;
          const cup = new THREE.Mesh(this.potCollarGeo, this.mats.pvcJoint);
          cup.position.set(sx, sy, sz);
          cup.rotation.set(0.62, 0, 0);
          root.add(cup);
          plantSites.push({ x: sx, y: sy, z: sz, rx: 0.62, rz: 0 });
        }
      }

      if (step >= 5) {
        this.addCyl(root, 0.056, 0.056, 0.036, -halfW + 0.05, py, pz, this.mats.pvcJoint, enableShadows, 0, 0, Math.PI / 2);
        this.addCyl(root, 0.056, 0.056, 0.036, halfW - 0.05, py, pz, this.mats.pvcJoint, enableShadows, 0, 0, Math.PI / 2);
      }
    }

    this.addReservoirAndIoT(root, 0, 0, 0.04, step, enableShadows);

    if (step >= 7) {
      this.addBox(root, width - 0.12, 0.055, 0.16, 0, baseY - 0.11, -0.02, this.mats.pvcGrey, enableShadows);
      this.addCyl(root, 0.026, 0.026, 0.18, -halfW + 0.14, 0.36, -0.02, this.mats.pvcGrey, enableShadows);
    }

    if (step >= 8) {
      const topBarY = baseY + (rows - 1) * rowStep + 0.14;
      this.addCyl(root, 0.016, 0.016, topBarY - 0.14, halfW - 0.12, 0.14 + (topBarY - 0.14) / 2, 0.02, this.mats.flowTube, enableShadows);
      this.addCyl(root, 0.016, 0.016, width - 0.22, 0, topBarY, 0.02, this.mats.flowTube, enableShadows, 0, 0, Math.PI / 2);
      this.addBallValve(root, halfW - 0.12, 0.64, 0.02, 0, 0, 0);
      this.addPressureGauge(root, halfW - 0.06, 0.78, 0.04);
    }
  }

  // ===========================================================================
  // ARCHITECTURE 10: DUAL-ZONE AQUAPONIC BIOREACTOR (AQUA-POD)
  // ===========================================================================
  private buildAquaPod(
    root: THREE.Group,
    width: number,
    tiers: number,
    step: number,
    plantSites: PlantSite[],
    enableShadows: boolean
  ): void {
    const deckW = Math.max(0.96, width * 0.76);
    const halfDeckW = deckW / 2;
    const midDeckY = 0.44;
    const hydroDeckY = 1.04;
    const canopyY = hydroDeckY + 0.68;
    const topFrameY = canopyY + 0.09;
    const lanes = Math.max(2, Math.min(4, tiers - 1));
    const sitesPerLane = Math.max(4, Math.floor((width * 0.72) / 0.2));
    const deckDepth = 0.68;

    // Step 1: 4 Outer 4040 T-Slot Gantry Posts + Leveling Feet
    if (step >= 1) {
      for (const [px, pz] of [
        [-halfDeckW - 0.05, -0.34],
        [-halfDeckW - 0.05, 0.34],
        [halfDeckW + 0.05, -0.34],
        [halfDeckW + 0.05, 0.34],
      ]) {
        this.addTSlotPost(root, topFrameY, px, topFrameY / 2 + 0.02, pz, enableShadows);
        this.addFoot(root, px, pz, enableShadows);
      }
    }

    // Step 2: Mezzanine Bioreactor Deck, Hydroponic Raft Frame, Gussets & LED Canopy
    if (step >= 2) {
      this.addBox(root, deckW + 0.1, 0.036, 0.66, 0, midDeckY - 0.02, 0, this.mats.aluminum, enableShadows);
      this.addBox(root, deckW + 0.1, 0.042, deckDepth, 0, hydroDeckY - 0.02, 0, this.mats.aluminum, enableShadows);
      this.addBox(root, deckW + 0.1, 0.036, 0.036, 0, topFrameY, 0, this.mats.aluminum, enableShadows);
      for (const px of [-halfDeckW - 0.05, halfDeckW + 0.05]) {
        this.addBox(root, 0.036, 0.036, 0.68, px, topFrameY, 0, this.mats.aluminum, enableShadows);
        this.addGusset(root, px, hydroDeckY - 0.04, -0.32, 0, Math.PI / 2, 0);
        this.addGusset(root, px, hydroDeckY - 0.04, 0.32, 0, -Math.PI / 2, 0);
      }
      this.addGrowLightCanopy(root, deckW - 0.04, canopyY, 0, step >= 8, enableShadows, topFrameY);
    }

    // Step 3: Bioreactor Tank Saddle Ring & Swirl-Clarifier Bracket
    if (step >= 3) {
      this.addCyl(root, 0.22, 0.22, 0.04, -0.18, midDeckY + 0.02, -0.02, this.mats.bracket, enableShadows);
      this.addCyl(root, 0.13, 0.13, 0.035, 0.24, midDeckY + 0.18, -0.02, this.mats.bracket, enableShadows);
      this.addBox(root, 0.22, 0.026, 0.026, 0.08, midDeckY + 0.18, -0.02, this.mats.aluminum, enableShadows);
    }

    // Step 4: Translucent Acrylic Bioreactor Cylinder + Upper Raft Hydroponic Channels
    if (step >= 4) {
      // Lower-mid Acrylic Aquaponic Fish / Biofilter Drum
      const bioX = -0.18;
      const bioZ = -0.02;
      this.addCyl(root, 0.19, 0.19, 0.44, bioX, midDeckY + 0.24, bioZ, this.mats.acrylicClear, false);
      this.addCyl(root, 0.175, 0.175, 0.34, bioX, midDeckY + 0.19, bioZ, this.mats.waterSurface, false);
      // Internal Copper Thermal Exchanger Coil + Diffuser Air-Stone
      this.addCyl(root, 0.07, 0.07, 0.03, bioX, midDeckY + 0.06, bioZ, this.mats.pvcGrey, false);
      for (let b = 0; b < 5; b++) {
        const bubble = this.addSphere(
          root,
          0.011,
          bioX + Math.cos(b * 1.4) * 0.045,
          midDeckY + 0.09 + b * 0.05,
          bioZ + Math.sin(b * 1.4) * 0.045,
          this.mats.flowTube,
          false
        );
        bubble.userData.animRole = 'bubbleRise';
        bubble.userData.baseY = midDeckY + 0.08;
        bubble.userData.phase = b * 0.048;
      }

      // Upper Deep-Water / Raft Channels
      this.addBox(root, deckW + 0.04, 0.065, deckDepth - 0.04, 0, hydroDeckY + 0.03, 0, this.mats.tankLid, enableShadows);
      this.addBox(root, deckW - 0.04, 0.012, deckDepth - 0.12, 0, hydroDeckY + 0.055, 0, this.mats.waterSurface, false);
      for (let l = 0; l < lanes; l++) {
        const lz = -deckDepth / 2 + 0.12 + (l / Math.max(1, lanes - 1)) * (deckDepth - 0.24);
        this.addBox(root, deckW - 0.04, 0.05, 0.11, 0, hydroDeckY + 0.075, lz, this.mats.pvcWhite, enableShadows);
        for (let s = 0; s < sitesPerLane; s++) {
          const sx = -halfDeckW + 0.12 + (s / Math.max(1, sitesPerLane - 1)) * (deckW - 0.24);
          plantSites.push({ x: sx, y: hydroDeckY + 0.105, z: lz });
          this.addPotCollar(root, sx, hydroDeckY + 0.102, lz);
        }
      }
    }

    // Step 5: Bolted Bioreactor Flanges + LatheGeometry Swirl-Clarifier Cyclone Separator
    if (step >= 5) {
      const topFlange = new THREE.Mesh(this.flangeRingGeo, this.mats.stainlessSteel);
      topFlange.position.set(-0.18, midDeckY + 0.45, -0.02);
      root.add(topFlange);
      const botFlange = new THREE.Mesh(this.flangeRingGeo, this.mats.stainlessSteel);
      botFlange.position.set(-0.18, midDeckY + 0.03, -0.02);
      root.add(botFlange);

      const cyclone = new THREE.Mesh(this.cycloneConeGeo, this.mats.pvcWhite);
      cyclone.position.set(0.24, midDeckY + 0.08, -0.02);
      cyclone.castShadow = enableShadows;
      cyclone.receiveShadow = enableShadows;
      root.add(cyclone);
      this.addCyl(root, 0.135, 0.135, 0.022, 0.24, midDeckY + 0.45, -0.02, this.mats.pvcJoint, enableShadows);
      this.addBallValve(root, 0.24, midDeckY + 0.04, -0.02, 0, 0, 0);
    }

    // Step 6 & 9: Shared Containment Skid, UV-C Sterilizer & IoT Hub at Floor
    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    // Step 7: Bell Return Downcomer + Bio-Transfer Pipe
    if (step >= 7) {
      this.addCyl(root, 0.026, 0.026, 0.26, -0.32, hydroDeckY - 0.08, 0.12, this.mats.pvcGrey, enableShadows);
      this.addCyl(root, 0.022, 0.022, 0.44, 0.03, midDeckY + 0.36, -0.02, this.mats.pvcGrey, enableShadows, 0, 0, Math.PI / 2);
      this.addCyl(root, 0.026, 0.026, 0.16, -0.18, 0.36, -0.12, this.mats.pvcGrey, enableShadows);
    }

    // Step 8: Oxygenated Riser into Upper Hydro Deck + Pressure Gauge + Valve
    if (step >= 8) {
      this.addCyl(root, 0.018, 0.018, hydroDeckY - 0.16, 0.34, 0.16 + (hydroDeckY - 0.16) / 2, 0.06, this.mats.flowTube, enableShadows);
      this.addBallValve(root, 0.34, 0.72, 0.06, 0, 0, 0);
      this.addPressureGauge(root, 0.39, 0.86, 0.08);
    }
  }

  // ===========================================================================
  // ARCHITECTURE 11: MOTORIZED ULTRASONIC FOG CAROUSEL (ORBIT-FOG)
  // ===========================================================================
  private buildOrbitFog(
    root: THREE.Group,
    width: number,
    _tiers: number,
    step: number,
    cropSpec: CropSpec,
    growthMonth: number,
    enableShadows: boolean
  ): void {
    const armLen = Math.max(0.84, Math.min(1.8, width * 0.56));
    const halfArm = armLen / 2;
    const wheelCenterY = 1.24;
    const wheelRadius = 0.38;
    const topBeamY = 1.94;
    const arms = 6;
    const sitesPerArm = Math.max(3, Math.min(6, Math.floor((width * 0.52) / 0.2)));

    // Step 1: 4 Heavy T-Slot A-Pylon Uprights + Leveling Feet
    if (step >= 1) {
      for (const [px, pz] of [
        [-halfArm - 0.14, -0.34],
        [-halfArm - 0.14, 0.34],
        [halfArm + 0.14, -0.34],
        [halfArm + 0.14, 0.34],
      ]) {
        this.addTSlotPost(root, topBeamY, px, topBeamY / 2 + 0.02, pz, enableShadows);
        this.addFoot(root, px, pz, enableShadows);
      }
    }

    // Step 2: Overhead Gantry Frame, Side Cross-Beams & Reflector LED Canopy
    if (step >= 2) {
      this.addBox(root, armLen + 0.28, 0.04, 0.04, 0, topBeamY, 0, this.mats.aluminum, enableShadows);
      for (const px of [-halfArm - 0.14, halfArm + 0.14]) {
        this.addBox(root, 0.04, 0.04, 0.68, px, topBeamY, 0, this.mats.aluminum, enableShadows);
        this.addBox(root, 0.04, 0.04, 0.68, px, wheelCenterY, 0, this.mats.aluminum, enableShadows);
        this.addGusset(root, px, wheelCenterY - 0.04, -0.32, 0, Math.PI / 2, 0);
        this.addGusset(root, px, wheelCenterY - 0.04, 0.32, 0, -Math.PI / 2, 0);
      }
      this.addGrowLightCanopy(root, armLen + 0.08, topBeamY - 0.09, 0, step >= 8, enableShadows, topBeamY);
    }

    // Step 3: Central Drive Shaft, Pillow-Block Bearings & Stepper Spur Gearbox
    if (step >= 3) {
      this.addCyl(root, 0.026, 0.026, armLen + 0.34, 0, wheelCenterY, 0, this.mats.stainlessSteel, enableShadows, 0, 0, Math.PI / 2);
      for (const bx of [-halfArm - 0.14, halfArm + 0.14]) {
        this.addBox(root, 0.06, 0.09, 0.11, bx, wheelCenterY, 0, this.mats.bracket, enableShadows);
      }
      // Stepper Motor + Twin Meshed Spur Gears on Right Pylon
      this.addBox(root, 0.12, 0.12, 0.12, halfArm + 0.19, wheelCenterY - 0.15, 0, this.mats.iotHousing, enableShadows);
      this.addGearWheel(root, halfArm + 0.11, wheelCenterY - 0.12, 0, 0.82, 0, Math.PI / 2, 0, 'gearWheel');
      this.addGearWheel(root, halfArm + 0.11, wheelCenterY, 0, 1.05, 0, Math.PI / 2, 0, 'gearWheel');
    }

    // Step 4-5 & 10: Twin Rotating Ferris Carrier Rings + 6 Counter-Rotating Level Cradles
    if (step >= 4) {
      const wheelGroup = new THREE.Group();
      wheelGroup.name = 'OrbitFogWheel';
      wheelGroup.userData.animRole = 'orbitWheel';
      wheelGroup.position.set(0, wheelCenterY, 0);
      root.add(wheelGroup);

      for (const rx of [-halfArm + 0.03, halfArm - 0.03]) {
        const ring = new THREE.Mesh(this.unitTorus, this.mats.stainlessSteel);
        ring.scale.setScalar(wheelRadius);
        ring.rotation.y = Math.PI / 2;
        ring.position.x = rx;
        ring.castShadow = enableShadows;
        wheelGroup.add(ring);
      }

      for (let a = 0; a < arms; a++) {
        const ang = (a / arms) * Math.PI * 2;
        const cy = Math.sin(ang) * wheelRadius;
        const cz = Math.cos(ang) * wheelRadius;

        // Radial Ferris Spokes from central axle to outer ring
        for (const sx of [-halfArm + 0.03, halfArm - 0.03]) {
          this.addCyl(wheelGroup, 0.009, 0.009, wheelRadius, sx, cy / 2, cz / 2, this.mats.aluminum, false, Math.PI / 2 - ang, 0, 0);
        }

        // Counter-rotating cradle tray keeping plants upright continuously
        const cradle = new THREE.Group();
        cradle.name = `OrbitCradle_${a}`;
        cradle.userData.animRole = 'orbitCradle';
        cradle.position.set(0, cy, cz);
        wheelGroup.add(cradle);

        this.addCyl(cradle, 0.022, 0.022, armLen - 0.04, 0, 0, 0, this.mats.stainlessSteel, false, 0, 0, Math.PI / 2);
        this.addBox(cradle, armLen - 0.12, 0.048, 0.088, 0, -0.02, 0, this.mats.pvcWhite, enableShadows);

        if (step >= 5) {
          this.addBox(cradle, 0.03, 0.056, 0.096, -halfArm + 0.06, -0.02, 0, this.mats.pvcJoint, enableShadows);
          this.addBox(cradle, 0.03, 0.056, 0.096, halfArm - 0.06, -0.02, 0, this.mats.pvcJoint, enableShadows);
        }

        const cradleSites: PlantSite[] = [];
        for (let s = 0; s < sitesPerArm; s++) {
          const sx = -(armLen - 0.24) / 2 + (s / Math.max(1, sitesPerArm - 1)) * (armLen - 0.24);
          cradleSites.push({ x: sx, y: 0.014, z: 0 });
          this.addPotCollar(cradle, sx, 0.012, 0);
        }

        if (step >= 10 && cradleSites.length > 0) {
          this.populateCrops(cradle, cradleSites, cropSpec, growthMonth, enableShadows, false);
        }
      }
    }

    // Step 6 & 9: Nutrient Containment Skid, UV-C Sterilizer & IoT Pedestal
    this.addReservoirAndIoT(root, 0, 0, 0, step, enableShadows);

    // Step 7-8: Central Ultrasonic Fogger Chamber + Translucent Mist Vapor Plume
    if (step >= 7) {
      this.addCyl(root, 0.14, 0.16, 0.22, -0.06, 0.49, 0, this.mats.acrylicClear, false);
      this.addCyl(root, 0.15, 0.15, 0.03, -0.06, 0.39, 0, this.mats.pvcGrey, enableShadows);
      this.addCyl(root, 0.11, 0.14, 0.05, -0.06, 0.62, 0, this.mats.pvcJoint, enableShadows);
      this.addCyl(root, 0.024, 0.024, 0.24, -0.18, 0.34, 0, this.mats.pvcGrey, enableShadows);
    }

    if (step >= 8) {
      // Ultrasonic Piezo Transducer Glow Discs + Riser + Mist Plume Halos
      this.addCyl(root, 0.055, 0.055, 0.018, -0.06, 0.43, 0, this.mats.iotLedBlue, false);
      this.addCyl(root, 0.016, 0.016, 0.42, -0.34, 0.36, 0, this.mats.flowTube, enableShadows);
      this.addBallValve(root, -0.34, 0.48, 0, 0, 0, 0);
      this.addPressureGauge(root, -0.39, 0.58, 0.02);

      for (let m = 0; m < 3; m++) {
        const mist = new THREE.Mesh(this.mistRingGeo, this.mats.mistHalo);
        mist.position.set(-0.06, 0.72 + m * 0.12, 0);
        mist.scale.setScalar(1.2 + m * 0.45);
        root.add(mist);
      }
    }
  }

  // ===========================================================================
  // SHARED INDUSTRIAL SUB-ASSEMBLIES
  // ===========================================================================
  private addTSlotPost(
    parent: THREE.Object3D,
    height: number,
    x: number,
    y: number,
    z: number,
    castShadow: boolean,
    rx = 0
  ): void {
    const post = new THREE.Mesh(this.tslotPostGeo, this.mats.aluminum);
    post.scale.set(1, height, 1);
    post.position.set(x, y, z);
    post.rotation.set(rx, 0, 0);
    post.castShadow = castShadow;
    post.receiveShadow = castShadow;
    parent.add(post);
  }

  private addFoot(parent: THREE.Object3D, x: number, z: number, castShadow: boolean): void {
    const foot = new THREE.Mesh(this.levelFootGeo, this.mats.rubberFoot);
    foot.position.set(x, 0, z);
    foot.castShadow = castShadow;
    parent.add(foot);
  }

  private addGusset(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number
  ): void {
    const g = new THREE.Mesh(this.gussetGeo, this.mats.bracket);
    g.position.set(x, y, z);
    g.rotation.set(rx, ry, rz);
    parent.add(g);
  }

  private addPotCollar(parent: THREE.Object3D, x: number, y: number, z: number): void {
    const collar = new THREE.Mesh(this.potCollarGeo, this.mats.pvcJoint);
    collar.position.set(x, y, z);
    parent.add(collar);
  }

  private addBallValve(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number
  ): void {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    g.rotation.set(rx, ry, rz);
    this.addCyl(g, 0.028, 0.028, 0.06, 0, 0, 0, this.mats.brassValve, false);
    this.addBox(g, 0.065, 0.012, 0.018, 0.025, 0, 0.025, this.mats.valveRed, false);
    parent.add(g);
  }

  private addPressureGauge(parent: THREE.Object3D, x: number, y: number, z: number): void {
    const g = new THREE.Group();
    g.position.set(x, y, z);
    this.addCyl(g, 0.04, 0.04, 0.022, 0, 0, 0, this.mats.stainlessSteel, false, Math.PI / 2);
    this.addCyl(g, 0.034, 0.034, 0.004, 0, 0, 0.011, this.mats.gaugeFace, false, Math.PI / 2);
    this.addCyl(g, 0.008, 0.008, 0.04, 0, -0.05, 0, this.mats.brassValve, false);
    parent.add(g);
  }

  private addGearWheel(
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    scale: number,
    rx: number,
    ry: number,
    rz: number,
    animRole?: string
  ): void {
    const mount = new THREE.Group();
    mount.position.set(x, y, z);
    mount.rotation.set(rx, ry, rz);

    const gearMesh = new THREE.Mesh(this.gearWheelGeo, this.mats.brassValve);
    gearMesh.scale.setScalar(scale);
    if (animRole) {
      gearMesh.userData.animRole = animRole;
    }
    mount.add(gearMesh);

    // Central stainless steel shaft pin
    this.addCyl(mount, 0.011 * scale, 0.011 * scale, 0.026 * scale, 0, 0, 0, this.mats.stainlessSteel, false, Math.PI / 2);
    parent.add(mount);
  }

  private addGrowLightCanopy(
    parent: THREE.Object3D,
    width: number,
    y: number,
    z: number,
    lit: boolean,
    castShadow: boolean,
    supportY?: number
  ): void {
    // Extruded 6-Fin Aluminum Heatsink + Top Ballast Driver Box + Steel Hanger Cables
    const heatsink = new THREE.Mesh(this.finHeatsinkGeo, this.mats.aluminum);
    heatsink.scale.set(width, 1, 1);
    heatsink.position.set(0, y - 0.012, z);
    heatsink.castShadow = castShadow;
    heatsink.receiveShadow = castShadow;
    parent.add(heatsink);

    // Central anodized driver / ballast housing atop heatsink
    this.addBox(parent, Math.min(0.28, width * 0.24), 0.022, 0.068, 0, y + 0.026, z, this.mats.bracket, castShadow);

    // Suspension wire hangers up to overhead gantry beam
    if (supportY !== undefined && supportY > y + 0.02) {
      const cableLen = supportY - (y + 0.015);
      const cableY = y + 0.015 + cableLen / 2;
      const hx = Math.max(0.18, width * 0.36);
      this.addCyl(parent, 0.0025, 0.0025, cableLen, -hx, cableY, z, this.mats.stainlessSteel, false);
      this.addCyl(parent, 0.0025, 0.0025, cableLen, hx, cableY, z, this.mats.stainlessSteel, false);
      this.addCyl(parent, 0.007, 0.007, 0.012, -hx, y + 0.022, z, this.mats.brassValve, false);
      this.addCyl(parent, 0.007, 0.007, 0.012, hx, y + 0.022, z, this.mats.brassValve, false);
    }

    // Dual full-spectrum LED emitter diode strips + angled aluminum reflector wings
    this.addBox(parent, width - 0.06, 0.009, 0.026, 0, y - 0.014, z - 0.028, lit ? this.mats.growLedBar : this.mats.growLedOff, false);
    this.addBox(parent, width - 0.06, 0.009, 0.026, 0, y - 0.014, z + 0.028, lit ? this.mats.growLedBar : this.mats.growLedOff, false);
    this.addBox(parent, width - 0.02, 0.005, 0.046, 0, y - 0.018, z - 0.068, this.mats.stainlessSteel, false, -0.42, 0, 0);
    this.addBox(parent, width - 0.02, 0.005, 0.046, 0, y - 0.018, z + 0.068, this.mats.stainlessSteel, false, 0.42, 0, 0);

    // Optional volumetric PPFD light coverage cone when Spatial Diagnostics overlay is active
    if (this.activeDiagnostics && lit) {
      const beam = new THREE.Mesh(this.ppfdBeamGeo, this.ppfdBeamMat);
      beam.scale.set(Math.max(0.6, width * 1.15), 1, 0.65);
      beam.position.set(0, y - 0.38, z);
      beam.xb = { pointerEvents: 'none' };
      parent.add(beam);
    }
  }

  private addClearanceEnvelope(
    root: THREE.Group,
    cx: number,
    cz: number,
    spanW: number,
    spanD: number,
    rating: CapabilityRating
  ): void {
    const color =
      rating === 'OPTIMAL' ? 0x10b981 : rating === 'SUBOPTIMAL' ? 0xf59e0b : 0x38bdf8;

    let zoneMat = this.diagZoneMats.get(rating);
    if (!zoneMat) {
      zoneMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.11,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      this.diagZoneMats.set(rating, zoneMat);
    }
    let edgeMat = this.diagEdgeMats.get(rating);
    if (!edgeMat) {
      edgeMat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.68,
        depthWrite: false,
      });
      this.diagEdgeMats.set(rating, edgeMat);
    }

    const env = new THREE.Group();
    env.name = 'CapabilityClearanceEnvelope';
    env.xb = { pointerEvents: 'none' };

    const pad = new THREE.Mesh(this.shadowPlane, zoneMat);
    pad.rotation.x = -Math.PI / 2;
    pad.position.set(cx, 0.011, cz);
    pad.scale.set(spanW, spanD, 1);
    env.add(pad);

    const hw = spanW / 2;
    const hd = spanD / 2;
    const railThick = 0.016;
    const railY = 0.014;
    // Outer perimeter border frame
    this.addBox(env, spanW, 0.004, railThick, cx, railY, cz - hd, edgeMat, false);
    this.addBox(env, spanW, 0.004, railThick, cx, railY, cz + hd, edgeMat, false);
    this.addBox(env, railThick, 0.004, spanD, cx - hw, railY, cz, edgeMat, false);
    this.addBox(env, railThick, 0.004, spanD, cx + hw, railY, cz, edgeMat, false);

    // Corner clearance stanchions
    const corners: [number, number, number, number][] = [
      [-1, -1, 1, 1],
      [1, -1, -1, 1],
      [-1, 1, 1, -1],
      [1, 1, -1, -1],
    ];
    for (const [sx, sz, ix, iz] of corners) {
      const kx = cx + sx * hw;
      const kz = cz + sz * hd;
      this.addBox(env, 0.022, 0.075, 0.022, kx, 0.04, kz, edgeMat, false);
      this.addBox(env, 0.22, 0.014, 0.02, kx + ix * 0.1, 0.02, kz, edgeMat, false);
      this.addBox(env, 0.02, 0.014, 0.22, kx, 0.02, kz + iz * 0.1, edgeMat, false);
    }

    root.add(env);
  }

  private addReservoirAndIoT(
    root: THREE.Group,
    cx: number,
    cy: number,
    cz: number,
    step: number,
    enableShadows: boolean
  ): void {
    // Step 6: Welded Spill-Containment Skid, Ribbed 100L Tank, Sediment Filter, Air Compressor & Booster Pump
    if (step >= 6) {
      // Dark welded steel spill-containment pallet skid beneath tank + safety yellow front bumper rail
      this.addBox(root, 0.88, 0.026, 0.68, cx + 0.04, cy + 0.014, cz + 0.08, this.mats.skidSteel, enableShadows);
      this.addBox(root, 0.88, 0.014, 0.018, cx + 0.04, cy + 0.028, cz + 0.415, this.mats.hazardYellow, false);
      for (const bx of [-0.37, 0.45]) {
        for (const bz of [-0.23, 0.39]) {
          const bolt = new THREE.Mesh(this.hexBoltGeo, this.mats.hexBoltMat);
          bolt.position.set(cx + bx, cy + 0.032, cz + bz);
          root.add(bolt);
        }
      }

      this.addBox(root, 0.64, 0.32, 0.42, cx, cy + 0.185, cz, this.mats.tankBody, enableShadows);
      // Structural stiffening ribs along tank body
      for (const rx of [-0.22, -0.07, 0.07, 0.22]) {
        this.addBox(root, 0.025, 0.3, 0.44, cx + rx, cy + 0.185, cz, this.mats.tankRibs, false);
      }
      this.addBox(root, 0.67, 0.042, 0.45, cx, cy + 0.355, cz, this.mats.tankLid, enableShadows);
      // Crisp Engraved Industrial Skid Spec Nameplate on tank front face
      this.addBox(root, 0.24, 0.06, 0.006, cx - 0.14, cy + 0.22, cz + 0.214, this.mats.skidPlacard, false);

      // Side Translucent Sight-Glass Water Level Tube + Rising Aeration Micro-Bubbles
      this.addCyl(root, 0.014, 0.014, 0.24, cx - 0.34, cy + 0.195, cz + 0.12, this.mats.acrylicClear, false);
      this.addCyl(root, 0.008, 0.008, 0.18, cx - 0.34, cy + 0.165, cz + 0.12, this.mats.flowTube, false);
      this.addCyl(root, 0.016, 0.016, 0.04, cx - 0.32, cy + 0.075, cz + 0.12, this.mats.brassValve, false, 0, 0, Math.PI / 2);
      this.addCyl(root, 0.016, 0.016, 0.04, cx - 0.32, cy + 0.305, cz + 0.12, this.mats.brassValve, false, 0, 0, Math.PI / 2);
      for (let b = 0; b < 3; b++) {
        const bubble = this.addSphere(root, 0.0055, cx - 0.34, cy + 0.095 + b * 0.05, cz + 0.12, this.mats.iotLedBlue, false);
        bubble.userData.animRole = 'bubbleRise';
        bubble.userData.baseY = cy + 0.095;
        bubble.userData.phase = b * 0.055;
      }

      // Translucent Blue Pleated Sediment Filter Canister
      const filterMesh = new THREE.Mesh(this.filterCanisterGeo, this.mats.filterHousing);
      filterMesh.position.set(cx - 0.26, cy + 0.04, cz + 0.29);
      root.add(filterMesh);
      this.addCyl(root, 0.028, 0.028, 0.12, cx - 0.26, cy + 0.115, cz + 0.29, this.mats.pvcWhite, false);
      this.addCyl(root, 0.056, 0.056, 0.032, cx - 0.26, cy + 0.22, cz + 0.29, this.mats.bracket, enableShadows);
      this.addCyl(root, 0.015, 0.015, 0.14, cx - 0.26, cy + 0.22, cz + 0.29, this.mats.brassValve, false, 0, 0, Math.PI / 2);

      // Copper-Finned Diaphragm Air Compressor + Oscillating Piston Head + Silicone Airline
      this.addCyl(root, 0.042, 0.042, 0.11, cx - 0.04, cy + 0.075, cz + 0.29, this.mats.pumpBody, enableShadows, 0, 0, Math.PI / 2);
      for (let f = 0; f < 4; f++) {
        this.addCyl(root, 0.048, 0.048, 0.008, cx - 0.08 + f * 0.022, cy + 0.075, cz + 0.29, this.mats.copperCoil, false, 0, 0, Math.PI / 2);
      }
      const piston = this.addCyl(root, 0.018, 0.022, 0.028, cx - 0.04, cy + 0.126, cz + 0.29, this.mats.stainlessSteel, false);
      piston.userData.animRole = 'pistonBob';
      piston.userData.baseY = cy + 0.126;
      this.addCyl(root, 0.006, 0.006, 0.28, cx - 0.02, cy + 0.22, cz + 0.24, this.mats.dripTube, false, -0.35, 0, 0);

      // External Centrifugal Booster Pump + Spinning Impeller Shaft
      this.addCyl(root, 0.055, 0.055, 0.14, cx + 0.2, cy + 0.095, cz + 0.27, this.mats.pumpBody, enableShadows, 0, 0, Math.PI / 2);
      this.addCyl(root, 0.064, 0.064, 0.04, cx + 0.13, cy + 0.095, cz + 0.27, this.mats.stainlessSteel, enableShadows, 0, 0, Math.PI / 2);
      const rotor = new THREE.Group();
      rotor.userData.animRole = 'pumpRotorX';
      rotor.position.set(cx + 0.28, cy + 0.095, cz + 0.27);
      this.addBox(rotor, 0.015, 0.065, 0.015, 0, 0, 0, this.mats.stainlessSteel, false);
      this.addBox(rotor, 0.015, 0.015, 0.065, 0, 0, 0, this.mats.stainlessSteel, false);
      root.add(rotor);
    }

    // Step 8: Inline Transparent Flow-Meter Turbine + Vertical UV-C Quartz Sterilizer + Curved Pump Hose
    if (step >= 8) {
      const meterGroup = new THREE.Group();
      meterGroup.position.set(cx + 0.34, cy + 0.24, cz + 0.22);
      this.addCyl(meterGroup, 0.026, 0.026, 0.09, 0, 0, 0, this.mats.acrylicClear, false);
      this.addCyl(meterGroup, 0.029, 0.029, 0.018, 0, -0.045, 0, this.mats.brassValve, false);
      this.addCyl(meterGroup, 0.029, 0.029, 0.018, 0, 0.045, 0, this.mats.brassValve, false);

      const turbine = new THREE.Group();
      turbine.userData.animRole = 'flowTurbine';
      this.addBox(turbine, 0.036, 0.008, 0.008, 0, 0, 0, this.mats.valveRed, false);
      this.addBox(turbine, 0.008, 0.036, 0.008, 0, 0, 0, this.mats.valveRed, false);
      meterGroup.add(turbine);
      root.add(meterGroup);

      // Vertical UV-C Quartz Sterilizer Reactor
      this.addCyl(root, 0.024, 0.024, 0.16, cx + 0.09, cy + 0.24, cz + 0.26, this.mats.acrylicClear, false);
      this.addCyl(root, 0.009, 0.009, 0.14, cx + 0.09, cy + 0.24, cz + 0.26, this.mats.uvCoreGlow, false);
      this.addCyl(root, 0.028, 0.028, 0.018, cx + 0.09, cy + 0.16, cz + 0.26, this.mats.brassValve, false);
      this.addCyl(root, 0.028, 0.028, 0.018, cx + 0.09, cy + 0.32, cz + 0.26, this.mats.brassValve, false);

      // Curved Flexible Pump-to-Flowmeter Bypass Hose (TubeGeometry)
      const hoseKey = `uv_hose_${cx.toFixed(2)}_${cy.toFixed(2)}_${cz.toFixed(2)}`;
      let hoseGeo = this.tubeCache.get(hoseKey);
      if (!hoseGeo) {
        const hoseCurve = new THREE.CatmullRomCurve3([
          new THREE.Vector3(cx + 0.20, cy + 0.145, cz + 0.27),
          new THREE.Vector3(cx + 0.24, cy + 0.19, cz + 0.29),
          new THREE.Vector3(cx + 0.30, cy + 0.19, cz + 0.25),
          new THREE.Vector3(cx + 0.34, cy + 0.195, cz + 0.22),
        ]);
        hoseGeo = new THREE.TubeGeometry(hoseCurve, 16, 0.011, 8, false);
        this.tubeCache.set(hoseKey, hoseGeo);
      }
      root.add(new THREE.Mesh(hoseGeo, this.mats.dripTube));
    }

    // Step 9: Industrial IoT Hydro-Controller Pedestal + E-Stop + 3-Channel Dosing Bank + Curved Lines
    if (step >= 9) {
      const hubX = cx + 0.43;
      const hubY = cy + 0.5;
      const hubZ = cz + 0.18;
      // Angled Stainless Pedestal Stanchion
      this.addCyl(root, 0.014, 0.018, 0.44, hubX, cy + 0.24, hubZ - 0.02, this.mats.stainlessSteel, enableShadows);

      const hmiGroup = new THREE.Group();
      hmiGroup.position.set(hubX, hubY, hubZ);
      hmiGroup.rotation.x = -0.18;
      this.addBox(hmiGroup, 0.2, 0.24, 0.075, 0, 0, 0, this.mats.iotHousing, enableShadows);
      // Crisp OLED Telemetry Screen
      this.addBox(hmiGroup, 0.15, 0.115, 0.008, 0, 0.035, 0.038, this.mats.iotDisplay, false);
      // Indicator LEDs
      this.addSphere(hmiGroup, 0.009, -0.055, -0.055, 0.04, this.mats.iotLedGreen, false);
      this.addSphere(hmiGroup, 0.009, -0.028, -0.055, 0.04, this.mats.iotLedBlue, false);
      // Industrial Red E-Stop Mushroom Button on bottom-right corner
      this.addCyl(hmiGroup, 0.016, 0.016, 0.014, 0.058, -0.058, 0.04, this.mats.brassValve, false, Math.PI / 2);
      this.addCyl(hmiGroup, 0.02, 0.018, 0.018, 0.058, -0.058, 0.052, this.mats.valveRed, false, Math.PI / 2);
      // Telemetry LoRa / Wi-Fi Antenna Mast
      this.addCyl(hmiGroup, 0.006, 0.008, 0.12, 0.072, 0.17, -0.01, this.mats.bracket, false);
      this.addSphere(hmiGroup, 0.008, 0.072, 0.23, -0.01, this.mats.iotLedBlue, false);
      root.add(hmiGroup);

      // 3-Head Peristaltic Dosing Pump Bank + Reagent Bottles + Curved Silicone Lines
      const bottleMats = [this.mats.reagentPink, this.mats.reagentGreen, this.mats.reagentAmber];
      for (let p = 0; p < 3; p++) {
        const px = hubX - 0.05 + p * 0.05;
        this.addCyl(root, 0.02, 0.02, 0.024, px, hubY - 0.17, hubZ + 0.02, this.mats.bracket, false, Math.PI / 2);
        const doseRotor = new THREE.Group();
        doseRotor.userData.animRole = 'pumpRotorZ';
        doseRotor.position.set(px, hubY - 0.17, hubZ + 0.034);
        this.addBox(doseRotor, 0.026, 0.006, 0.008, 0, 0, 0, this.mats.stainlessSteel, false);
        root.add(doseRotor);

        // Reagent bottle beside tank on skid
        this.addCyl(root, 0.024, 0.024, 0.12, px, cy + 0.085, cz + 0.3, bottleMats[p], false);
        this.addCyl(root, 0.012, 0.012, 0.02, px, cy + 0.15, cz + 0.3, this.mats.dripTube, false);

        const doseKey = `dose_${p}_${cx.toFixed(2)}_${cy.toFixed(2)}_${cz.toFixed(2)}`;
        let doseGeo = this.tubeCache.get(doseKey);
        if (!doseGeo) {
          const doseCurve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(px, cy + 0.155, cz + 0.3),
            new THREE.Vector3(px, cy + 0.24, cz + 0.27),
            new THREE.Vector3(px, hubY - 0.17, hubZ + 0.02),
          ]);
          doseGeo = new THREE.TubeGeometry(doseCurve, 12, 0.004, 6, false);
          this.tubeCache.set(doseKey, doseGeo);
        }
        root.add(new THREE.Mesh(doseGeo, bottleMats[p]));
      }

      // Armored probe conduit into tank lid
      this.addCyl(root, 0.01, 0.01, 0.16, cx + 0.24, cy + 0.43, cz + 0.1, this.mats.dripTube, false, 0, 0, 0.32);
    }
  }

  private populateCrops(
    root: THREE.Group,
    sites: PlantSite[],
    crop: CropSpec,
    growthMonth: number,
    enableShadows: boolean,
    showRoots = false
  ): void {
    const count = sites.length;
    const growthNorm = Math.max(0.08, Math.min(1.0, growthMonth / 12));
    const scaleFactor = 0.25 + growthNorm * 0.95;

    const netPotInst = new THREE.InstancedMesh(this.netPotGeo, this.mats.netPot, count);
    const lecaInst = new THREE.InstancedMesh(this.lecaGeo, this.mats.leca, count);
    const rootInst = showRoots
      ? new THREE.InstancedMesh(this.rootClusterGeo, this.mats.rootFiber, count)
      : null;

    const leavesPerSite = crop.canopyStyle === 'rosette' ? 6 : 5;
    const totalLeaves = count * (leavesPerSite + 1);
    const leafGeo = crop.canopyStyle === 'tall' ? this.tallLeafGeo : this.leafBladeGeo;
    let leafMat = this.leafMats.get(crop.id);
    if (!leafMat) {
      leafMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.54,
        metalness: 0.02,
      });
      this.leafMats.set(crop.id, leafMat);
    }
    const leafInst = new THREE.InstancedMesh(leafGeo, leafMat, totalLeaves);
    leafInst.castShadow = enableShadows;
    leafInst.receiveShadow = enableShadows;

    const dummy = new THREE.Object3D();
    const baseColor = new THREE.Color(crop.leafColor);
    const accentColor = new THREE.Color(crop.accentColor);
    const tmpColor = new THREE.Color();

    let leafIdx = 0;
    const fruitPositions: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      const site = sites[i];
      dummy.position.set(site.x, site.y - 0.014, site.z);
      dummy.rotation.set(site.rx ?? 0, site.ry ?? 0, site.rz ?? 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      netPotInst.setMatrixAt(i, dummy.matrix);

      dummy.position.set(site.x, site.y + 0.008, site.z);
      dummy.rotation.set((site.rx ?? 0) + Math.PI / 2, site.ry ?? 0, site.rz ?? 0);
      dummy.updateMatrix();
      lecaInst.setMatrixAt(i, dummy.matrix);

      if (rootInst) {
        const rootScale = 0.45 + growthNorm * 0.85;
        dummy.position.set(site.x, site.y - 0.068 * rootScale, site.z);
        dummy.rotation.set((site.rx ?? 0) + Math.PI, (site.ry ?? 0) + i * 0.5, site.rz ?? 0);
        dummy.scale.set(0.9, rootScale, 0.9);
        dummy.updateMatrix();
        rootInst.setMatrixAt(i, dummy.matrix);
      }

      for (let l = 0; l < leavesPerSite; l++) {
        const angle = (l / leavesPerSite) * Math.PI * 2 + i * 0.7;
        const spread = (0.012 + (l % 2) * 0.008) * scaleFactor;
        const heightBoost =
          crop.canopyStyle === 'vine'
            ? (0.03 + l * 0.022) * scaleFactor
            : crop.canopyStyle === 'tall'
              ? (0.045 + l * 0.014) * scaleFactor
              : 0.012 * scaleFactor;

        dummy.position.set(
          site.x + Math.cos(angle) * spread,
          site.y + heightBoost,
          site.z + Math.sin(angle) * spread
        );
        const pitchJitter = (l % 2 === 0 ? 1 : -1) * 0.1;
        const rollJitter = (((i + l) % 3) - 1) * 0.08;
        dummy.rotation.set((site.rx ?? 0) + pitchJitter, angle, (site.rz ?? 0) + rollJitter);
        const leafScale = scaleFactor * (0.82 + (l % 3) * 0.14);
        dummy.scale.set(leafScale, leafScale, leafScale);
        dummy.updateMatrix();
        leafInst.setMatrixAt(leafIdx, dummy.matrix);

        tmpColor.copy(baseColor).lerp(accentColor, (l % 3) * 0.38);
        leafInst.setColorAt(leafIdx, tmpColor);
        leafIdx++;
      }

      // Inner meristem crown shoot for fuller botanical silhouette
      dummy.position.set(site.x, site.y + 0.024 * scaleFactor, site.z);
      dummy.rotation.set((site.rx ?? 0) + 0.18, i * 1.1, site.rz ?? 0);
      dummy.scale.setScalar(scaleFactor * 0.56);
      dummy.updateMatrix();
      leafInst.setMatrixAt(leafIdx, dummy.matrix);
      leafInst.setColorAt(leafIdx, accentColor);
      leafIdx++;

      if (crop.fruitColor !== undefined && growthMonth >= 5) {
        const fruitScale = Math.min(1.2, (growthMonth - 4.5) / 6.5);
        fruitPositions.push(
          new THREE.Vector3(
            site.x + Math.cos(i) * 0.032 * scaleFactor,
            site.y + (crop.canopyStyle === 'vine' ? 0.085 : 0.045) * scaleFactor,
            site.z + Math.sin(i) * 0.032 * scaleFactor * fruitScale
          )
        );
      }
    }

    netPotInst.instanceMatrix.needsUpdate = true;
    lecaInst.instanceMatrix.needsUpdate = true;
    leafInst.instanceMatrix.needsUpdate = true;
    if (leafInst.instanceColor) leafInst.instanceColor.needsUpdate = true;

    netPotInst.computeBoundingSphere();
    lecaInst.computeBoundingSphere();
    leafInst.computeBoundingSphere();

    root.add(netPotInst, lecaInst, leafInst);
    if (rootInst) {
      rootInst.instanceMatrix.needsUpdate = true;
      rootInst.computeBoundingSphere();
      root.add(rootInst);
    }

    if (crop.fruitColor !== undefined && fruitPositions.length > 0) {
      let fruitMat = this.fruitMats.get(crop.id);
      if (!fruitMat) {
        fruitMat = new THREE.MeshStandardMaterial({
          color: crop.fruitColor,
          roughness: 0.22,
          metalness: 0.05,
        });
        this.fruitMats.set(crop.id, fruitMat);
      }
      const fruitInst = new THREE.InstancedMesh(this.fruitGeo, fruitMat, fruitPositions.length);
      const fScale = Math.max(0.35, Math.min(1.15, (growthMonth - 4.5) / 6));
      for (let i = 0; i < fruitPositions.length; i++) {
        dummy.position.copy(fruitPositions[i]);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(fScale);
        dummy.updateMatrix();
        fruitInst.setMatrixAt(i, dummy.matrix);
      }
      fruitInst.instanceMatrix.needsUpdate = true;
      fruitInst.computeBoundingSphere();
      root.add(fruitInst);
    }
  }

  private addBox(
    parent: THREE.Object3D,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    castShadow: boolean,
    rx = 0,
    ry = 0,
    rz = 0
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.unitBox, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  private addCyl(
    parent: THREE.Object3D,
    rt: number,
    rb: number,
    h: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    castShadow: boolean,
    rx = 0,
    ry = 0,
    rz = 0
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.unitCyl, mat);
    mesh.scale.set(rt, h, rb);
    mesh.position.set(x, y, z);
    mesh.rotation.set(rx, ry, rz);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }

  private addSphere(
    parent: THREE.Object3D,
    r: number,
    x: number,
    y: number,
    z: number,
    mat: THREE.Material,
    castShadow: boolean
  ): THREE.Mesh {
    const mesh = new THREE.Mesh(this.unitSphere, mat);
    mesh.scale.setScalar(r);
    mesh.position.set(x, y, z);
    mesh.castShadow = castShadow;
    parent.add(mesh);
    return mesh;
  }
}
