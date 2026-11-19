import test from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_HYDRO_CONFIG } from './constants';
import {
  analyzeCapability,
  calculateBOM,
  clampAssemblyStep,
  clampGrowthMonth,
  clampTiers,
  clampWidth,
  computeAutoLayoutPoints,
  computeSolarPosition,
  computeTelemetry,
  formatTimeOfDay,
  getArchitectureDepth,
  getOptimalPresetForCrop,
} from './calculator';

test('BOM scales accurately across architectures and system counts', () => {
  const single = calculateBOM(DEFAULT_HYDRO_CONFIG, 1);
  assert.equal(single.systems, 1);
  assert.equal(single.tanks, 1);
  assert.equal(single.pumps, 1);
  assert.equal(single.pvcPipes, 5);
  assert.ok(single.plants > 20);
  assert.ok(single.lengthMeters > 10);

  const quad = calculateBOM(DEFAULT_HYDRO_CONFIG, 4);
  assert.equal(quad.systems, 4);
  assert.equal(quad.tanks, 4);
  assert.equal(quad.plants, single.plants * 4);
  assert.equal(quad.waterLiters, 400);
});

test('BOM computes BIOMESH path length from layout points', () => {
  const pts = [
    { x: 0, y: 0.4, z: 0 },
    { x: 3, y: 0.4, z: 0 },
    { x: 3, y: 0.4, z: 4 },
  ];
  const bom = calculateBOM({ ...DEFAULT_HYDRO_CONFIG, architecture: 'BIOMESH' }, 1, pts);
  assert.equal(bom.systems, 1);
  assert.equal(bom.lengthMeters, 7);
  assert.equal(bom.pvcPipes, 2);
  assert.equal(bom.elbows, 3);
});

test('Auto layout produces valid multi-unit floor coordinates and respects room bounds', () => {
  const defaultZigZag = computeAutoLayoutPoints('ZIG-ZAG', 2.2);
  assert.equal(defaultZigZag.length, 4);

  const towers = computeAutoLayoutPoints('TOWERS', 2.2);
  assert.equal(towers.length, 6);

  const bounded = computeAutoLayoutPoints('ZIG-ZAG', 2.2, {
    center: { x: 0.5, z: -2.0 },
    width: 6.5,
    depth: 3.5,
  });
  assert.ok(bounded.length >= 4);
  for (const pt of bounded) {
    assert.equal(pt.y, 0);
  }
});

test('Solar position peaks at solar noon and telemetry stays within botanical targets', () => {
  const morning = computeSolarPosition(6.5);
  const noon = computeSolarPosition(12);
  assert.ok(noon.y > morning.y);
  assert.ok(noon.lux > morning.lux);

  const telemetry = computeTelemetry(DEFAULT_HYDRO_CONFIG, noon.lux);
  assert.ok(telemetry.ph >= 5.5 && telemetry.ph <= 6.5);
  assert.ok(telemetry.ec >= 1.0 && telemetry.ec <= 2.0);
  assert.ok(telemetry.waterTempC > 18 && telemetry.waterTempC < 24);
});

test('Clamping and time formatting helpers behave deterministically', () => {
  assert.equal(clampWidth(0.2), 1.2);
  assert.equal(clampWidth(9.0), 3.6);
  assert.equal(clampTiers(1), 2);
  assert.equal(clampTiers(12), 7);
  assert.equal(clampGrowthMonth(-3), 0);
  assert.equal(clampGrowthMonth(18), 12);
  assert.equal(clampAssemblyStep(0), 1);
  assert.equal(clampAssemblyStep(25), 10);
  assert.equal(formatTimeOfDay(11.5), '11:30');
});

test('ROTARY and HELIX architectures compute accurate BOM and flow telemetry', () => {
  const rotary = calculateBOM({ ...DEFAULT_HYDRO_CONFIG, architecture: 'ROTARY' }, 1);
  assert.equal(rotary.systems, 1);
  assert.ok(rotary.plants >= 40);
  assert.ok(rotary.lengthMeters > 10);

  const helix = calculateBOM({ ...DEFAULT_HYDRO_CONFIG, architecture: 'HELIX' }, 2);
  assert.equal(helix.systems, 2);
  assert.ok(helix.plants >= 32);
  assert.equal(helix.tanks, 2);

  const telRotary = computeTelemetry({ ...DEFAULT_HYDRO_CONFIG, architecture: 'ROTARY' }, 42000);
  const telHelix = computeTelemetry({ ...DEFAULT_HYDRO_CONFIG, architecture: 'HELIX' }, 42000);
  assert.equal(telRotary.flowLpm, 10.6);
  assert.equal(telHelix.flowLpm, 13.2);
});

test('PYRAMID and AERO-WALL architectures compute accurate BOM and flow telemetry', () => {
  const pyramid = calculateBOM({ ...DEFAULT_HYDRO_CONFIG, architecture: 'PYRAMID' }, 1);
  assert.equal(pyramid.systems, 1);
  assert.equal(pyramid.pvcPipes, 20);
  assert.ok(pyramid.plants >= 40);

  const wall = calculateBOM({ ...DEFAULT_HYDRO_CONFIG, architecture: 'AERO-WALL' }, 2);
  assert.equal(wall.systems, 2);
  assert.equal(wall.pvcPipes, 10);
  assert.equal(wall.tanks, 2);

  const telPyr = computeTelemetry({ ...DEFAULT_HYDRO_CONFIG, architecture: 'PYRAMID' }, 45000);
  const telWall = computeTelemetry({ ...DEFAULT_HYDRO_CONFIG, architecture: 'AERO-WALL' }, 45000);
  assert.equal(telPyr.flowLpm, 15.2);
  assert.equal(telWall.flowLpm, 13.8);
});

test('AQUA-POD and ORBIT-FOG architectures compute accurate BOM and flow telemetry', () => {
  const aqua = calculateBOM({ ...DEFAULT_HYDRO_CONFIG, architecture: 'AQUA-POD' }, 1);
  assert.equal(aqua.systems, 1);
  assert.ok(aqua.plants >= 16);
  assert.ok(aqua.lengthMeters > 4);

  const orbit = calculateBOM({ ...DEFAULT_HYDRO_CONFIG, architecture: 'ORBIT-FOG' }, 2);
  assert.equal(orbit.systems, 2);
  assert.equal(orbit.pvcPipes, 12);
  assert.ok(orbit.plants >= 36);
  assert.equal(orbit.tanks, 2);

  const telAqua = computeTelemetry({ ...DEFAULT_HYDRO_CONFIG, architecture: 'AQUA-POD' }, 44000);
  const telOrbit = computeTelemetry({ ...DEFAULT_HYDRO_CONFIG, architecture: 'ORBIT-FOG' }, 44000);
  assert.equal(telAqua.flowLpm, 16.4);
  assert.equal(telOrbit.flowLpm, 12.6);
});

test('Capability engine scores vine vs rosette compatibility and suggests optimal presets', () => {
  const solar = computeSolarPosition(12);

  // Suboptimal pairing: heavy Tomato vines inside Rotary drum
  const badCfg = { ...DEFAULT_HYDRO_CONFIG, architecture: 'ROTARY' as const, crop: 'TOMATO' as const };
  const badBom = calculateBOM(badCfg, 1);
  const badTel = computeTelemetry(badCfg, solar.lux);
  const badCap = analyzeCapability(badCfg, badBom, badTel);
  assert.equal(badCap.rating, 'SUBOPTIMAL');
  assert.ok(badCap.score < 60);
  assert.equal(badCap.recommendedArch, 'DUTCH-BKT');

  // Optimal pairing: Tomato in Dutch Bucket preset
  const preset = getOptimalPresetForCrop('TOMATO');
  const optCfg = {
    ...DEFAULT_HYDRO_CONFIG,
    architecture: preset.architecture,
    crop: 'TOMATO' as const,
    width: preset.width,
    tiers: preset.tiers,
  };
  const optBom = calculateBOM(optCfg, 1);
  const optTel = computeTelemetry(optCfg, solar.lux);
  const optCap = analyzeCapability(optCfg, optBom, optTel);
  assert.equal(optCap.rating, 'OPTIMAL');
  assert.ok(optCap.score >= 92);
  assert.ok(optCap.dliMolPerM2Day > 20);
  assert.ok(optCap.powerWatts > 180);
  assert.ok(optCap.dailyYieldGrams > 0);
  assert.ok(optCap.yieldPerM2Year > 0);

  // Orbit-Fog offers highest water savings (96%) and scales footprint cleanly across 2 units
  const fogCfg = { ...DEFAULT_HYDRO_CONFIG, architecture: 'ORBIT-FOG' as const, crop: 'MINT' as const };
  const fogBom1 = calculateBOM(fogCfg, 1);
  const fogBom2 = calculateBOM(fogCfg, 2);
  const fogTel = computeTelemetry(fogCfg, solar.lux);
  const cap1 = analyzeCapability(fogCfg, fogBom1, fogTel);
  const cap2 = analyzeCapability(fogCfg, fogBom2, fogTel);
  assert.equal(cap1.waterSavingsPct, 96);
  assert.equal(cap1.rating, 'OPTIMAL');
  assert.ok(cap2.footprintM2 > cap1.footprintM2);
  assert.equal(getArchitectureDepth('HELIX', 2.2), 1.25);
});


