import { CROPS } from './constants';
import type {
  ArchitectureMode,
  BillOfMaterials,
  CapabilityRating,
  CapabilityReport,
  CropType,
  FloorBounds,
  HydroConfig,
  LayoutPoint,
  SolarState,
  TelemetrySnapshot,
} from './types';

export function clampWidth(width: number): number {
  return Math.round(Math.min(3.6, Math.max(1.2, width)) * 10) / 10;
}

export function clampTiers(tiers: number): number {
  return Math.round(Math.min(7, Math.max(2, tiers)));
}

export function clampGrowthMonth(month: number): number {
  return Math.round(Math.min(12, Math.max(0, month)) * 10) / 10;
}

export function clampTimeOfDay(hour: number): number {
  return Math.round(Math.min(18, Math.max(6, hour)) * 10) / 10;
}

export function clampAssemblyStep(step: number): number {
  return Math.round(Math.min(10, Math.max(1, step)));
}

export function formatTimeOfDay(hour: number): string {
  const h = Math.floor(hour);
  const m = Math.round((hour - h) * 60);
  const mm = m === 60 ? '00' : String(m).padStart(2, '0');
  const hh = m === 60 ? h + 1 : h;
  return `${String(hh).padStart(2, '0')}:${mm}`;
}

export function getSitesPerPipe(width: number): number {
  return Math.max(3, Math.floor((width - 0.25) / 0.22));
}

export function calculateBOM(
  config: HydroConfig,
  systemCount: number,
  biomeshPoints?: readonly LayoutPoint[]
): BillOfMaterials {
  const count = Math.max(0, systemCount);
  const cropSpec = CROPS[config.crop];
  if (count === 0) {
    return {
      systems: 0,
      lengthMeters: 0,
      elbows: 0,
      plants: 0,
      pvcPipes: 0,
      tanks: 0,
      pumps: 0,
      waterLiters: 0,
      estYieldKgYear: 0,
    };
  }

  let perSystemPipes = config.tiers;
  let perSystemLength = config.width * config.tiers;
  let perSystemElbows = Math.max(2, (config.tiers - 1) * 2 + 2);
  let perSystemPlants = getSitesPerPipe(config.width) * config.tiers;

  switch (config.architecture) {
    case 'ZIG-ZAG': {
      perSystemPipes = config.tiers;
      perSystemLength = config.width * config.tiers;
      perSystemElbows = Math.max(2, (config.tiers - 1) * 2 + 2);
      perSystemPlants = getSitesPerPipe(config.width) * config.tiers;
      break;
    }
    case 'TOWERS': {
      const cols = Math.max(2, Math.round(config.width / 0.55));
      perSystemPipes = cols;
      const towerHeight = 0.45 + config.tiers * 0.24;
      perSystemLength = cols * towerHeight;
      perSystemElbows = cols * 2;
      perSystemPlants = cols * config.tiers * 2;
      break;
    }
    case 'A-FRAME': {
      const rails = config.tiers * 2;
      perSystemPipes = rails;
      perSystemLength = rails * config.width;
      perSystemElbows = rails * 2;
      perSystemPlants = getSitesPerPipe(config.width) * rails;
      break;
    }
    case 'HORIZ-BED': {
      const lanes = Math.max(2, Math.min(5, config.tiers));
      perSystemPipes = lanes;
      perSystemLength = lanes * config.width;
      perSystemElbows = lanes * 2;
      perSystemPlants = getSitesPerPipe(config.width) * lanes;
      break;
    }
    case 'DUTCH-BKT': {
      const buckets = Math.max(3, Math.floor(config.width / 0.42));
      perSystemPipes = 2;
      perSystemLength = config.width * 2 + buckets * 0.35;
      perSystemElbows = buckets + 4;
      perSystemPlants = buckets * 2;
      break;
    }
    case 'ROTARY': {
      const rings = Math.max(3, Math.min(7, config.tiers + 1));
      const drumCircumference = Math.PI * 0.92;
      perSystemPipes = rings;
      perSystemLength = Math.round(rings * drumCircumference * 10) / 10;
      perSystemElbows = 8;
      perSystemPlants = rings * 8;
      break;
    }
    case 'HELIX': {
      const turns = Math.max(2, config.tiers);
      const coilRadius = Math.min(0.58, Math.max(0.36, config.width * 0.24));
      const coilLen = turns * Math.hypot(2 * Math.PI * coilRadius, 0.24);
      perSystemPipes = turns;
      perSystemLength = Math.round(coilLen * 10) / 10;
      perSystemElbows = 6;
      perSystemPlants = Math.max(16, Math.floor(coilLen / 0.2));
      break;
    }
    case 'PYRAMID': {
      const levels = Math.max(3, Math.min(6, config.tiers));
      let ringLen = 0;
      let sites = 0;
      for (let t = 0; t < levels; t++) {
        const span = Math.max(0.45, config.width * 0.68 * (1 - t * 0.17));
        ringLen += span * 4;
        sites += Math.max(2, Math.floor(span / 0.22)) * 4;
      }
      perSystemPipes = levels * 4;
      perSystemLength = Math.round(ringLen * 10) / 10;
      perSystemElbows = levels * 4 + 4;
      perSystemPlants = sites;
      break;
    }
    case 'AERO-WALL': {
      const rows = Math.max(3, Math.min(6, config.tiers));
      const sitesPerRow = getSitesPerPipe(config.width);
      perSystemPipes = rows;
      perSystemLength = Math.round(rows * config.width * 10) / 10;
      perSystemElbows = rows * 2 + 4;
      perSystemPlants = rows * sitesPerRow;
      break;
    }
    case 'AQUA-POD': {
      const lanes = Math.max(2, Math.min(4, config.tiers - 1));
      const sitesPerLane = Math.max(4, Math.floor((config.width * 0.72) / 0.2));
      perSystemPipes = lanes + 2;
      perSystemLength = Math.round((lanes * config.width * 0.72 + 2.4) * 10) / 10;
      perSystemElbows = lanes * 2 + 6;
      perSystemPlants = lanes * sitesPerLane;
      break;
    }
    case 'ORBIT-FOG': {
      const arms = 6;
      const sitesPerArm = Math.max(3, Math.min(6, Math.floor((config.width * 0.52) / 0.2)));
      perSystemPipes = arms;
      perSystemLength = Math.round((arms * config.width * 0.52 + 3.2) * 10) / 10;
      perSystemElbows = 10;
      perSystemPlants = arms * sitesPerArm;
      break;
    }
    case 'BIOMESH': {
      if (biomeshPoints && biomeshPoints.length >= 2) {
        let totalLen = 0;
        for (let i = 1; i < biomeshPoints.length; i++) {
          const a = biomeshPoints[i - 1];
          const b = biomeshPoints[i];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const dz = b.z - a.z;
          totalLen += Math.sqrt(dx * dx + dy * dy + dz * dz);
        }
        const totalPlants = Math.max(4, Math.floor(totalLen / 0.24));
        return {
          systems: 1,
          lengthMeters: Math.round(totalLen * 10) / 10,
          elbows: Math.max(2, biomeshPoints.length),
          plants: totalPlants,
          pvcPipes: Math.max(1, biomeshPoints.length - 1),
          tanks: 1,
          pumps: 1,
          waterLiters: 120,
          estYieldKgYear:
            Math.round(totalPlants * cropSpec.yieldKgPerSiteYear * 10) / 10,
        };
      }
      perSystemPipes = config.tiers;
      perSystemLength = config.width * config.tiers;
      perSystemElbows = 4;
      perSystemPlants = getSitesPerPipe(config.width) * config.tiers;
      break;
    }
  }

  const systems = config.architecture === 'BIOMESH' ? 1 : count;
  const totalPlants = perSystemPlants * systems;
  const totalLength = Math.round(perSystemLength * systems * 10) / 10;

  return {
    systems,
    lengthMeters: totalLength,
    elbows: perSystemElbows * systems,
    plants: totalPlants,
    pvcPipes: perSystemPipes * systems,
    tanks: systems,
    pumps: systems,
    waterLiters: systems * 100,
    estYieldKgYear:
      Math.round(totalPlants * cropSpec.yieldKgPerSiteYear * 10) / 10,
  };
}

export function computeAutoLayoutPoints(
  architecture: ArchitectureMode,
  width: number,
  bounds?: FloorBounds | null
): LayoutPoint[] {
  const centerX = bounds ? bounds.center.x : 0;
  const centerZ = bounds ? bounds.center.z : -2.75;

  if (architecture === 'BIOMESH') {
    return [
      { x: centerX - 1.35, y: 0.48, z: centerZ - 0.85 },
      { x: centerX + 1.35, y: 0.4, z: centerZ - 0.85 },
      { x: centerX + 1.35, y: 0.32, z: centerZ },
      { x: centerX - 1.35, y: 0.24, z: centerZ },
      { x: centerX - 1.35, y: 0.16, z: centerZ + 0.85 },
      { x: centerX + 1.35, y: 0.08, z: centerZ + 0.85 },
    ];
  }

  const spacingX = Math.max(1.6, width * 0.92 + 0.25);
  const spacingZ = 1.2;

  let cols = 2;
  let rows = 2;
  if (bounds) {
    cols = Math.max(1, Math.min(4, Math.floor((bounds.width * 0.95) / spacingX)));
    rows = Math.max(1, Math.min(3, Math.floor((bounds.depth * 0.95) / spacingZ)));
  } else if (architecture === 'TOWERS') {
    cols = 3;
    rows = 2;
  }

  const points: LayoutPoint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const offsetX = centerX + (c - (cols - 1) / 2) * spacingX;
      const offsetZ = centerZ + (r - (rows - 1) / 2) * spacingZ;
      points.push({
        x: Math.round(offsetX * 100) / 100,
        y: 0,
        z: Math.round(offsetZ * 100) / 100,
      });
    }
  }
  return points;
}

export function computeSolarPosition(timeOfDay: number): SolarState {
  // Map 6:00 -> 18:00 to sun arc 0 -> PI
  const t = (clampTimeOfDay(timeOfDay) - 6) / 12;
  const angle = t * Math.PI;
  const radius = 8;
  const x = -Math.cos(angle) * radius;
  const y = Math.max(0.8, Math.sin(angle) * radius);
  const z = 2.5 - Math.sin(angle) * 1.2;

  const elevationFactor = Math.sin(angle);
  const intensity = 1.1 + elevationFactor * 1.6;
  const lux = Math.round(8500 + elevationFactor * 46500);

  // Dawn/dusk warm amber, midday crisp warm daylight
  const colorHex = elevationFactor < 0.35 ? 0xffb36b : elevationFactor < 0.7 ? 0xffe4b8 : 0xfff5e6;

  return { x, y, z, intensity, colorHex, lux };
}

export function computeTelemetry(
  config: HydroConfig,
  solarLux: number
): TelemetrySnapshot {
  const cropSpec = CROPS[config.crop];
  const phMid = (cropSpec.targetPh[0] + cropSpec.targetPh[1]) / 2;
  const ecMid = (cropSpec.targetEc[0] + cropSpec.targetEc[1]) / 2;

  // Deterministic subtle variation with growth stage & time of day
  const growthFactor = config.growthMonth / 12;
  const diurnal = Math.sin(((config.timeOfDay - 6) / 12) * Math.PI);

  const ph = Math.round((phMid + (growthFactor - 0.5) * 0.14) * 100) / 100;
  const ec = Math.round((ecMid + growthFactor * 0.22) * 100) / 100;
  const waterTempC = Math.round((19.2 + diurnal * 2.4) * 10) / 10;
  const dissolvedO2 = Math.round((8.8 - diurnal * 0.6) * 10) / 10;
  const flowLpm =
    config.architecture === 'TOWERS'
      ? 14.5
      : config.architecture === 'PYRAMID'
        ? 15.2
        : config.architecture === 'AQUA-POD'
          ? 16.4
          : config.architecture === 'AERO-WALL'
            ? 13.8
            : config.architecture === 'HELIX'
              ? 13.2
              : config.architecture === 'ORBIT-FOG'
                ? 12.6
                : config.architecture === 'ROTARY'
                  ? 10.6
                  : config.architecture === 'DUTCH-BKT'
                    ? 9.2
                    : 11.8;

  return {
    ph,
    ec,
    waterTempC,
    dissolvedO2,
    solarLux,
    flowLpm,
  };
}

export interface CropOptimizationPreset {
  architecture: ArchitectureMode;
  width: number;
  tiers: number;
  reason: string;
}

export const OPTIMAL_CROP_PRESETS: Record<CropType, CropOptimizationPreset> = {
  LETTUCE: {
    architecture: 'TOWERS',
    width: 2.2,
    tiers: 5,
    reason: 'Aeroponic rotary mist towers maximize crisp rosette turn-rate & O₂ uptake.',
  },
  SPINACH: {
    architecture: 'ZIG-ZAG',
    width: 2.2,
    tiers: 5,
    reason: 'Chilled gravity NFT channels keep cool-season rosette crowns dry and clean.',
  },
  KALE: {
    architecture: 'A-FRAME',
    width: 2.4,
    tiers: 4,
    reason: 'Open dual-slope A-frame rails give tall brassica canopies broad PPFD reach.',
  },
  BASIL: {
    architecture: 'AQUA-POD',
    width: 2.2,
    tiers: 4,
    reason: 'Dual-zone nitrified bio-filter drives dense aromatic essential oil production.',
  },
  MINT: {
    architecture: 'ORBIT-FOG',
    width: 2.2,
    tiers: 5,
    reason: 'Ultrasonic fog carousel bathes vigorous stolon roots in 5µm aerated mist.',
  },
  CILANTRO: {
    architecture: 'AERO-WALL',
    width: 2.2,
    tiers: 5,
    reason: 'Cantilevered living mist wall enables rapid modular herb succession.',
  },
  STRAWBERRY: {
    architecture: 'PYRAMID',
    width: 2.4,
    tiers: 5,
    reason: 'Stepped 4-face pyramid suspends berry runners clear of wet channel walls.',
  },
  TOMATO: {
    architecture: 'DUTCH-BKT',
    width: 2.6,
    tiers: 4,
    reason: 'Deep Bato drip buckets anchor heavy fruiting vines and buffer high EC loads.',
  },
  PEPPER: {
    architecture: 'DUTCH-BKT',
    width: 2.6,
    tiers: 4,
    reason: 'Media-filled Bato buckets stabilize root-zone moisture for fruiting stems.',
  },
};

export function getArchitectureDepth(
  architecture: ArchitectureMode,
  width: number
): number {
  switch (architecture) {
    case 'A-FRAME':
      return 0.98;
    case 'HORIZ-BED':
      return 1.05;
    case 'ROTARY':
      return 1.15;
    case 'HELIX':
      return 1.25;
    case 'PYRAMID':
      return Math.max(1.1, width * 0.74);
    case 'AERO-WALL':
      return 0.88;
    case 'AQUA-POD':
      return 1.15;
    case 'ORBIT-FOG':
      return 1.2;
    default:
      return 0.72;
  }
}

export function getOptimalPresetForCrop(crop: CropType): CropOptimizationPreset {
  return OPTIMAL_CROP_PRESETS[crop];
}

const ARCH_WATER_SAVINGS_PCT: Record<ArchitectureMode, number> = {
  'ORBIT-FOG': 96,
  TOWERS: 95,
  PYRAMID: 95,
  'AQUA-POD': 94,
  'AERO-WALL': 94,
  HELIX: 93,
  ROTARY: 93,
  'ZIG-ZAG': 92,
  'A-FRAME': 92,
  BIOMESH: 91,
  'HORIZ-BED': 89,
  'DUTCH-BKT': 88,
};

const ARCH_BASE_PUMP_WATTS: Record<ArchitectureMode, number> = {
  'ZIG-ZAG': 34,
  TOWERS: 46,
  'A-FRAME': 38,
  'HORIZ-BED': 42,
  'DUTCH-BKT': 44,
  ROTARY: 58,
  HELIX: 42,
  PYRAMID: 50,
  'AERO-WALL': 48,
  'AQUA-POD': 64,
  'ORBIT-FOG': 62,
  BIOMESH: 36,
};

const VINE_FRIENDLY_ARCHES = new Set<ArchitectureMode>([
  'DUTCH-BKT',
  'HORIZ-BED',
  'A-FRAME',
  'BIOMESH',
]);

const HERB_ROSETTE_FRIENDLY_ARCHES = new Set<ArchitectureMode>([
  'TOWERS',
  'ZIG-ZAG',
  'A-FRAME',
  'PYRAMID',
  'AERO-WALL',
  'AQUA-POD',
  'ORBIT-FOG',
  'HELIX',
  'ROTARY',
  'HORIZ-BED',
  'BIOMESH',
]);

export function analyzeCapability(
  config: HydroConfig,
  bom: BillOfMaterials,
  telemetry: TelemetrySnapshot,
  biomeshPoints?: readonly LayoutPoint[]
): CapabilityReport {
  const cropSpec = CROPS[config.crop];
  const preset = OPTIMAL_CROP_PRESETS[config.crop];

  let score = 84;
  let reason = '';

  if (config.architecture === preset.architecture) {
    score = 96;
    reason = preset.reason;
  } else if (cropSpec.canopyStyle === 'vine') {
    if (VINE_FRIENDLY_ARCHES.has(config.architecture)) {
      score = config.architecture === 'HORIZ-BED' ? 85 : 80;
      reason = `${config.architecture} supports ${cropSpec.label.toLowerCase()} stems, though ${preset.architecture} gives deeper root support.`;
    } else {
      score = config.architecture === 'ROTARY' || config.architecture === 'ORBIT-FOG' ? 46 : 56;
      reason = `${cropSpec.label} vines overload ${config.architecture} net-pot clearance; switch to ${preset.architecture}.`;
    }
  } else if (cropSpec.canopyStyle === 'tall') {
    if (config.architecture === 'ROTARY' || config.architecture === 'ORBIT-FOG') {
      score = 60;
      reason = `Tall ${cropSpec.label.toLowerCase()} stalks crowd rotary drum clearance; ${preset.architecture} fits best.`;
    } else if (config.tiers >= 6 && config.architecture === 'ZIG-ZAG') {
      score = 68;
      reason = `${config.tiers} stacked NFT tiers leave tight headroom for tall ${cropSpec.label.toLowerCase()}; lower tiers or use ${preset.architecture}.`;
    } else {
      score = 84;
      reason = `${config.architecture} supports upright ${cropSpec.label.toLowerCase()} growth with good airflow.`;
    }
  } else {
    if (config.architecture === 'DUTCH-BKT') {
      score = 72;
      reason = `Oversized Bato buckets under-utilize space for compact ${cropSpec.label.toLowerCase()}; ${preset.architecture} doubles density.`;
    } else if (HERB_ROSETTE_FRIENDLY_ARCHES.has(config.architecture)) {
      score = 88;
      reason = `High-oxygen ${config.architecture} channels suit ${cropSpec.label.toLowerCase()} (${preset.architecture} is peak).`;
    }
  }

  // Headroom / assembly readiness penalty for compact multi-tier stacks
  if (cropSpec.canopyStyle === 'vine' && config.tiers >= 6 && score > 50 && config.architecture !== 'DUTCH-BKT') {
    score = Math.max(48, score - 10);
  }
  score = Math.max(30, Math.min(99, Math.round(score)));

  const rating: CapabilityRating =
    score >= 88 ? 'OPTIMAL' : score >= 70 ? 'GOOD' : 'SUBOPTIMAL';

  // Physical unit footprint + 0.45m clearance zone
  let unitFootprintM2: number;
  if (config.architecture === 'BIOMESH' && biomeshPoints && biomeshPoints.length >= 2) {
    let minX = Infinity;
    let maxX = -Infinity;
    let minZ = Infinity;
    let maxZ = -Infinity;
    for (const p of biomeshPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }
    const spanX = Math.max(1.2, maxX - minX + 0.7);
    const spanZ = Math.max(1.0, maxZ - minZ + 0.7);
    unitFootprintM2 = spanX * spanZ;
  } else {
    const unitD = getArchitectureDepth(config.architecture, config.width);
    unitFootprintM2 = (config.width + 0.4) * (unitD + 0.45);
  }

  const sysCount = Math.max(1, bom.systems);
  const footprintM2 = Math.round(unitFootprintM2 * sysCount * 10) / 10;
  const yieldPerM2Year =
    bom.systems > 0 && footprintM2 > 0
      ? Math.round((bom.estYieldKgYear / footprintM2) * 10) / 10
      : 0;
  const dailyYieldGrams = Math.round((bom.estYieldKgYear * 1000) / 365);

  const pumpWattsPerSys = ARCH_BASE_PUMP_WATTS[config.architecture];
  const ledWattsPerSys = config.assemblyStep >= 2 ? Math.round(config.width * 72) : 0;
  const powerWatts =
    bom.systems > 0 ? Math.round((pumpWattsPerSys + ledWattsPerSys) * bom.systems) : 0;
  const energyKwhDay =
    bom.systems > 0
      ? Math.round(
          ((pumpWattsPerSys * 24 + (config.assemblyStep >= 8 ? ledWattsPerSys * 14 : 0)) *
            bom.systems) /
            1000 *
            10
        ) / 10
      : 0;

  // DLI (mol/m²/d): natural solar lux->PPFD (~0.0185) over 7.5h + LED 240 umol/m²/s over 14h
  const solarPpfd = telemetry.solarLux * 0.0185;
  const solarDli = (solarPpfd * 7.5 * 3600) / 1_000_000;
  const ledDli = config.assemblyStep >= 8 ? (240 * 14 * 3600) / 1_000_000 : 0;
  const dliMolPerM2Day = Math.round((solarDli + ledDli) * 10) / 10;

  return {
    score,
    rating,
    reason,
    recommendedArch: preset.architecture,
    recommendedWidth: preset.width,
    recommendedTiers: preset.tiers,
    footprintM2,
    yieldPerM2Year,
    dailyYieldGrams,
    powerWatts,
    energyKwhDay,
    dliMolPerM2Day,
    waterSavingsPct: ARCH_WATER_SAVINGS_PCT[config.architecture],
  };
}

