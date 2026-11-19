export type ArchitectureMode =
  | 'ZIG-ZAG'
  | 'TOWERS'
  | 'A-FRAME'
  | 'HORIZ-BED'
  | 'DUTCH-BKT'
  | 'ROTARY'
  | 'HELIX'
  | 'PYRAMID'
  | 'AERO-WALL'
  | 'AQUA-POD'
  | 'ORBIT-FOG'
  | 'BIOMESH';

export type CropType =
  | 'LETTUCE'
  | 'BASIL'
  | 'TOMATO'
  | 'SPINACH'
  | 'MINT'
  | 'STRAWBERRY'
  | 'KALE'
  | 'CILANTRO'
  | 'PEPPER';

export type SpatialToolMode = 'PLACE' | 'MOVE' | 'ERASE';

export interface AssemblyStep {
  step: number;
  title: string;
  tools: string;
  desc: string;
  lines: string[];
}

export interface CropSpec {
  id: CropType;
  label: string;
  leafColor: number;
  accentColor: number;
  fruitColor?: number;
  targetPh: [number, number];
  targetEc: [number, number];
  daysToHarvest: number;
  yieldKgPerSiteYear: number;
  canopyStyle: 'rosette' | 'bush' | 'vine' | 'tall';
}

export interface ArchitectureSpec {
  id: ArchitectureMode;
  label: string;
  shortDesc: string;
}

export interface HydroConfig {
  architecture: ArchitectureMode;
  crop: CropType;
  width: number;
  tiers: number;
  growthMonth: number;
  timeOfDay: number;
  assemblyStep: number;
}

export interface BillOfMaterials {
  systems: number;
  lengthMeters: number;
  elbows: number;
  plants: number;
  pvcPipes: number;
  tanks: number;
  pumps: number;
  waterLiters: number;
  estYieldKgYear: number;
}

export interface TelemetrySnapshot {
  ph: number;
  ec: number;
  waterTempC: number;
  dissolvedO2: number;
  solarLux: number;
  flowLpm: number;
}

export interface SolarState {
  x: number;
  y: number;
  z: number;
  intensity: number;
  colorHex: number;
  lux: number;
}

export interface LayoutPoint {
  x: number;
  y: number;
  z: number;
}

export interface FloorBounds {
  center: { x: number; z: number };
  width: number;
  depth: number;
}

export type CapabilityRating = 'OPTIMAL' | 'GOOD' | 'SUBOPTIMAL';

export interface CapabilityReport {
  score: number;
  rating: CapabilityRating;
  reason: string;
  recommendedArch: ArchitectureMode;
  recommendedWidth: number;
  recommendedTiers: number;
  footprintM2: number;
  yieldPerM2Year: number;
  dailyYieldGrams: number;
  powerWatts: number;
  energyKwhDay: number;
  dliMolPerM2Day: number;
  waterSavingsPct: number;
}

