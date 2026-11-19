import * as xb from 'xrblocks';
import {
  ARCHITECTURES,
  ASSEMBLY_STEPS,
  CROPS,
  CROP_ORDER,
} from '../hydro/constants';
import { formatTimeOfDay } from '../hydro/calculator';
import type {
  ArchitectureMode,
  BillOfMaterials,
  CapabilityReport,
  CropType,
  HydroConfig,
  SpatialToolMode,
  TelemetrySnapshot,
} from '../hydro/types';

export interface HydroUICallbacks {
  onSelectArchitecture: (mode: ArchitectureMode) => void;
  onSelectCrop: (crop: CropType) => void;
  onAdjustWidth: (delta: number) => void;
  onAdjustTiers: (delta: number) => void;
  onChangeGrowthMonth: (month: number) => void;
  onToggleGrowthAnim: () => void;
  onChangeTimeOfDay: (hour: number) => void;
  onToggleTimeAnim: () => void;
  onSelectTool: (tool: SpatialToolMode) => void;
  onAutoScan: () => void;
  onResetScene: () => void;
  onSelectAssemblyStep: (step: number) => void;
  onToggleCards: () => void;
  onToggleDiagnostics: () => void;
  onOptimizeForCrop: () => void;
}

const CARD_SURFACE_BG = 'rgba(11, 18, 32, 0.94)';
const CARD_BORDER = 'rgba(148, 163, 184, 0.32)';
const SUBPANEL_BG = 'rgba(255, 255, 255, 0.07)';
const ACTIVE_BG = '#0ea5e9';
const ACTIVE_GREEN_BG = '#10b981';
const ACTIVE_AMBER_BG = '#d97706';
const ACTIVE_RED_BG = '#e11d48';
const INACTIVE_BG = 'rgba(255, 255, 255, 0.11)';

export class HydroUI {
  public readonly architectCard: xb.UICard;
  public readonly assemblyCard: xb.UICard;
  public readonly hudOverlay: xb.UIOverlay;

  private readonly archButtons = new Map<ArchitectureMode, xb.UIButton>();
  private readonly cropButtons = new Map<CropType, xb.UIButton>();
  private readonly stepButtons = new Map<number, xb.UIButton>();
  private readonly toolButtons = new Map<SpatialToolMode, xb.UIButton>();

  private readonly archSummaryText: xb.UIText;
  private readonly widthValueText: xb.UIText;
  private readonly tiersValueText: xb.UIText;
  private readonly growthValueText: xb.UIText;
  private readonly growthSlider: xb.UISlider;
  private readonly growthPlayBtn: xb.UIButton;
  private readonly timeValueText: xb.UIText;
  private readonly timeSlider: xb.UISlider;
  private readonly timePlayBtn: xb.UIButton;
  private readonly autoScanBtn: xb.UIButton;
  private readonly statusBannerText: xb.UIText;

  private readonly phaseBadgeText: xb.UIText;
  private readonly tabBomBtn: xb.UIButton;
  private readonly tabCapBtn: xb.UIButton;
  private readonly rightBodySlot: xb.UIPanel;
  private readonly bomView: xb.UIPanel;
  private readonly capView: xb.UIPanel;

  private readonly phaseTitleText: xb.UIText;
  private readonly phaseToolsText: xb.UIText;
  private readonly phaseChecklistText: xb.UIText;

  private readonly bomSystemsText: xb.UIText;
  private readonly bomLengthText: xb.UIText;
  private readonly bomElbowsText: xb.UIText;
  private readonly bomPlantsText: xb.UIText;
  private readonly bomTanksText: xb.UIText;
  private readonly bomYieldText: xb.UIText;

  private readonly telPhText: xb.UIText;
  private readonly telEcText: xb.UIText;
  private readonly telTempText: xb.UIText;
  private readonly telLuxText: xb.UIText;
  private readonly capQuickLineText: xb.UIText;

  private readonly capScoreBadgeText: xb.UIText;
  private readonly capReasonText: xb.UIText;
  private readonly capRecArchText: xb.UIText;
  private readonly capFootprintText: xb.UIText;
  private readonly capDensityText: xb.UIText;
  private readonly capDailyYieldText: xb.UIText;
  private readonly capPowerText: xb.UIText;
  private readonly capDliText: xb.UIText;
  private readonly capWaterSaveText: xb.UIText;
  private readonly capOptimizeBtn: xb.UIButton;
  private readonly capDiagBtn: xb.UIButton;

  private readonly hudSummaryText: xb.UIText;
  private readonly hudAutoFitBtn: xb.UIButton;
  private readonly hudDiagBtn: xb.UIButton;
  private readonly hudAutoScanBtn: xb.UIButton;
  private readonly hudToggleCardsBtn: xb.UIButton;
  private readonly hudGrowthBtn: xb.UIButton;

  private cardsVisible = true;
  private rightTab: 'BOM' | 'CAPABILITY' = 'BOM';
  private lastConfig?: HydroConfig;

  constructor(callbacks: HydroUICallbacks) {
    // =========================================================================
    // LEFT SPATIAL CARD: ARCHITECT CONTROLS
    // =========================================================================
    this.archSummaryText = new xb.UIText({
      text: 'ZIG-ZAG · LETTUCE',
      style: { fontSize: 15, color: '#38bdf8', fontWeight: 'bold' },
    });

    const archHeader = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      children: [
        new xb.UIPanel({
          style: { flexDirection: 'row', alignItems: 'center', gap: 10 },
          children: [
            new xb.UIIcon({
              icon: 'view_in_ar',
              style: { width: 28, height: 28, color: '#38bdf8' },
            }),
            new xb.UIText({
              text: 'HYDROSPATIAL',
              style: { fontSize: 22, fontWeight: 'bold' },
            }),
          ],
        }),
        this.archSummaryText,
      ],
    });

    // Architecture grid (2 rows x 6)
    const archRows: xb.UIPanel[] = [];
    for (let r = 0; r < 2; r++) {
      const rowBtns: xb.UIButton[] = [];
      for (let c = 0; c < 6; c++) {
        const spec = ARCHITECTURES[r * 6 + c];
        if (!spec) continue;
        const btn = new xb.UIButton({
          label: spec.label,
          ariaLabel: `Architecture ${spec.label}`,
          style: {
            flexGrow: 1,
            flexBasis: 0,
            height: 36,
            fontSize: 12,
            borderRadius: 10,
            backgroundColor: INACTIVE_BG,
            paddingLeft: 2,
            paddingRight: 2,
          },
          onClick: () => callbacks.onSelectArchitecture(spec.id),
        });
        this.archButtons.set(spec.id, btn);
        rowBtns.push(btn);
      }
      archRows.push(
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 4 },
          children: rowBtns,
        })
      );
    }

    // Crop grid (3 rows x 3)
    const cropRows: xb.UIPanel[] = [];
    for (let r = 0; r < 3; r++) {
      const rowBtns: xb.UIButton[] = [];
      for (let c = 0; c < 3; c++) {
        const cropId = CROP_ORDER[r * 3 + c];
        const spec = CROPS[cropId];
        const btn = new xb.UIButton({
          label: spec.label,
          ariaLabel: `Select crop ${spec.label}`,
          style: {
            flexGrow: 1,
            flexBasis: 0,
            height: 40,
            fontSize: 15,
            borderRadius: 10,
            backgroundColor: INACTIVE_BG,
            paddingLeft: 8,
            paddingRight: 8,
          },
          onClick: () => callbacks.onSelectCrop(cropId),
        });
        this.cropButtons.set(cropId, btn);
        rowBtns.push(btn);
      }
      cropRows.push(
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: rowBtns,
        })
      );
    }

    // Width & Tiers steppers
    this.widthValueText = new xb.UIText({
      text: '2.2m',
      style: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', minWidth: 50 },
    });
    this.tiersValueText = new xb.UIText({
      text: '5',
      style: { fontSize: 16, fontWeight: 'bold', textAlign: 'center', minWidth: 28 },
    });

    const dimensionRow = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
      },
      children: [
        new xb.UIPanel({
          style: {
            flexGrow: 1,
            flexBasis: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 8,
            borderRadius: 12,
            backgroundColor: SUBPANEL_BG,
          },
          children: [
            new xb.UIText({ text: 'WIDTH', style: { fontSize: 14, opacity: 0.85 } }),
            new xb.UIButton({
              label: '-',
              ariaLabel: 'Decrease system width',
              style: { width: 38, height: 36, fontSize: 18, borderRadius: 8 },
              onClick: () => callbacks.onAdjustWidth(-0.2),
            }),
            this.widthValueText,
            new xb.UIButton({
              label: '+',
              ariaLabel: 'Increase system width',
              style: { width: 38, height: 36, fontSize: 18, borderRadius: 8 },
              onClick: () => callbacks.onAdjustWidth(0.2),
            }),
          ],
        }),
        new xb.UIPanel({
          style: {
            flexGrow: 1,
            flexBasis: 0,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 8,
            borderRadius: 12,
            backgroundColor: SUBPANEL_BG,
          },
          children: [
            new xb.UIText({ text: 'TIERS', style: { fontSize: 14, opacity: 0.85 } }),
            new xb.UIButton({
              label: '-',
              ariaLabel: 'Decrease tiers',
              style: { width: 38, height: 36, fontSize: 18, borderRadius: 8 },
              onClick: () => callbacks.onAdjustTiers(-1),
            }),
            this.tiersValueText,
            new xb.UIButton({
              label: '+',
              ariaLabel: 'Increase tiers',
              style: { width: 38, height: 36, fontSize: 18, borderRadius: 8 },
              onClick: () => callbacks.onAdjustTiers(1),
            }),
          ],
        }),
      ],
    });

    // Growth slider & play button
    this.growthValueText = new xb.UIText({
      text: '6.5mo',
      style: { fontSize: 15, fontWeight: 'bold', color: '#4ade80', minWidth: 52, textAlign: 'right' },
    });
    this.growthSlider = new xb.UISlider({
      ariaLabel: 'Crop growth month',
      min: 0,
      max: 12,
      step: 0.5,
      value: 6.5,
      style: { flexGrow: 1, height: 36 },
      onInput: (v) => callbacks.onChangeGrowthMonth(v),
    });
    this.growthPlayBtn = new xb.UIButton({
      label: 'Play',
      icon: 'play_arrow',
      ariaLabel: 'Toggle crop growth animation',
      style: { width: 96, height: 38, fontSize: 15, borderRadius: 10 },
      onClick: () => callbacks.onToggleGrowthAnim(),
    });

    // Solar time slider & play button
    this.timeValueText = new xb.UIText({
      text: '11:30',
      style: { fontSize: 15, fontWeight: 'bold', color: '#fbbf24', minWidth: 52, textAlign: 'right' },
    });
    this.timeSlider = new xb.UISlider({
      ariaLabel: 'Solar time of day',
      min: 6,
      max: 18,
      step: 0.5,
      value: 11.5,
      style: { flexGrow: 1, height: 36 },
      onInput: (v) => callbacks.onChangeTimeOfDay(v),
    });
    this.timePlayBtn = new xb.UIButton({
      label: 'Sun',
      icon: 'wb_sunny',
      ariaLabel: 'Toggle solar cycle animation',
      style: { width: 96, height: 38, fontSize: 15, borderRadius: 10 },
      onClick: () => callbacks.onToggleTimeAnim(),
    });

    // Spatial tools row
    const placeBtn = new xb.UIButton({
      label: 'Place',
      icon: 'add_location_alt',
      ariaLabel: 'Place system mode',
      style: { flexGrow: 1, flexBasis: 0, height: 42, fontSize: 14, borderRadius: 10, paddingLeft: 6, paddingRight: 6 },
      onClick: () => callbacks.onSelectTool('PLACE'),
    });
    const moveBtn = new xb.UIButton({
      label: 'Move',
      icon: 'open_with',
      ariaLabel: 'Move system mode',
      style: { flexGrow: 1, flexBasis: 0, height: 42, fontSize: 14, borderRadius: 10, paddingLeft: 6, paddingRight: 6 },
      onClick: () => callbacks.onSelectTool('MOVE'),
    });
    const eraseBtn = new xb.UIButton({
      label: 'Erase',
      icon: 'delete',
      ariaLabel: 'Erase system mode',
      style: { flexGrow: 1, flexBasis: 0, height: 42, fontSize: 14, borderRadius: 10, paddingLeft: 6, paddingRight: 6 },
      onClick: () => callbacks.onSelectTool('ERASE'),
    });
    this.toolButtons.set('PLACE', placeBtn);
    this.toolButtons.set('MOVE', moveBtn);
    this.toolButtons.set('ERASE', eraseBtn);

    this.autoScanBtn = new xb.UIButton({
      label: 'Scan',
      icon: 'radar',
      ariaLabel: 'Run spatial auto layout scan',
      style: {
        flexGrow: 1,
        flexBasis: 0,
        height: 42,
        fontSize: 14,
        borderRadius: 10,
        backgroundColor: '#0284c7',
        paddingLeft: 6,
        paddingRight: 6,
      },
      onClick: () => callbacks.onAutoScan(),
    });
    const resetBtn = new xb.UIButton({
      label: 'Reset',
      icon: 'restart_alt',
      ariaLabel: 'Reset farm layout',
      style: { flexGrow: 1, flexBasis: 0, height: 42, fontSize: 14, borderRadius: 10, paddingLeft: 6, paddingRight: 6 },
      onClick: () => callbacks.onResetScene(),
    });

    this.statusBannerText = new xb.UIText({
      text: 'Point at the floor and click to place units.',
      style: { width: '100%', fontSize: 14, opacity: 0.78, textAlign: 'center' },
    });

    this.architectCard = new xb.UICard({
      size: { width: 0.96, height: 'auto' },
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 10,
        padding: 18,
        borderRadius: 22,
        backgroundColor: CARD_SURFACE_BG,
        borderColor: CARD_BORDER,
        borderWidth: 1.5,
      },
      children: [
        archHeader,
        this.sectionLabel('ARCHITECTURE'),
        ...archRows,
        this.sectionLabel('BOTANICAL CROP'),
        ...cropRows,
        this.sectionLabel('DIMENSIONS & SIMULATION'),
        dimensionRow,
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10 },
          children: [
            new xb.UIText({ text: 'GROW', style: { fontSize: 14, width: 52, opacity: 0.85 } }),
            this.growthSlider,
            this.growthValueText,
            this.growthPlayBtn,
          ],
        }),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', alignItems: 'center', gap: 10 },
          children: [
            new xb.UIText({ text: 'SOLAR', style: { fontSize: 14, width: 52, opacity: 0.85 } }),
            this.timeSlider,
            this.timeValueText,
            this.timePlayBtn,
          ],
        }),
        this.sectionLabel('SPATIAL TOOLS'),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: [placeBtn, moveBtn, eraseBtn, this.autoScanBtn, resetBtn],
        }),
        this.statusBannerText,
      ],
    });
    this.architectCard.name = 'Hydroponics Architect Card';
    this.architectCard.position.set(-1.21, 1.44, -1.28);
    this.architectCard.rotation.y = 0.46;

    // =========================================================================
    // RIGHT SPATIAL CARD: ASSEMBLY & BOM / CAPABILITY DIAGNOSTICS
    // =========================================================================
    this.phaseBadgeText = new xb.UIText({
      text: 'PHASE 10 / 10',
      style: { fontSize: 15, fontWeight: 'bold', color: '#38bdf8' },
    });

    const assemblyHeader = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      children: [
        new xb.UIPanel({
          style: { flexDirection: 'row', alignItems: 'center', gap: 10 },
          children: [
            new xb.UIIcon({
              icon: 'construction',
              style: { width: 26, height: 26, color: '#38bdf8' },
            }),
            new xb.UIText({
              text: 'ENGINEERING & BOM',
              style: { fontSize: 21, fontWeight: 'bold' },
            }),
          ],
        }),
        this.phaseBadgeText,
      ],
    });

    this.tabBomBtn = new xb.UIButton({
      label: 'Assembly & BOM',
      icon: 'build',
      ariaLabel: 'Show assembly and bill of materials',
      style: {
        flexGrow: 1,
        flexBasis: 0,
        height: 36,
        fontSize: 14,
        borderRadius: 10,
        backgroundColor: ACTIVE_BG,
      },
      onClick: () => this.setRightTab('BOM'),
    });
    this.tabCapBtn = new xb.UIButton({
      label: 'Capability & Fit',
      icon: 'analytics',
      ariaLabel: 'Show capability diagnostics and optimization',
      style: {
        flexGrow: 1,
        flexBasis: 0,
        height: 36,
        fontSize: 14,
        borderRadius: 10,
        backgroundColor: INACTIVE_BG,
      },
      onClick: () => this.setRightTab('CAPABILITY'),
    });

    const tabRow = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 8 },
      children: [this.tabBomBtn, this.tabCapBtn],
    });

    // Step buttons 1..10 (2 rows x 5)
    const stepRows: xb.UIPanel[] = [];
    for (let r = 0; r < 2; r++) {
      const rowBtns: xb.UIButton[] = [];
      for (let c = 0; c < 5; c++) {
        const s = r * 5 + c + 1;
        const btn = new xb.UIButton({
          label: String(s),
          ariaLabel: `Assembly phase ${s}`,
          style: {
            flexGrow: 1,
            flexBasis: 0,
            height: 36,
            fontSize: 16,
            borderRadius: 10,
            backgroundColor: INACTIVE_BG,
          },
          onClick: () => callbacks.onSelectAssemblyStep(s),
        });
        this.stepButtons.set(s, btn);
        rowBtns.push(btn);
      }
      stepRows.push(
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: rowBtns,
        })
      );
    }

    this.phaseTitleText = new xb.UIText({
      text: 'BIOLOGICAL LOADING',
      style: { fontSize: 19, fontWeight: 'bold' },
    });
    this.phaseToolsText = new xb.UIText({
      text: 'Tools: 2" Net Pots, LECA Clay Pebbles',
      style: { width: '100%', fontSize: 14, color: '#93c5fd' },
    });
    this.phaseChecklistText = new xb.UIText({
      text: '',
      style: {
        width: '100%',
        fontSize: 15,
        lineHeight: 1.35,
        whiteSpace: 'pre-line',
        opacity: 0.92,
      },
    });

    const phasePanel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 8,
        padding: 14,
        borderRadius: 14,
        backgroundColor: SUBPANEL_BG,
      },
      children: [
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          children: [
            this.phaseTitleText,
            new xb.UIPanel({
              style: { flexDirection: 'row', gap: 8 },
              children: [
                new xb.UIButton({
                  icon: 'chevron_left',
                  ariaLabel: 'Previous assembly phase',
                  style: {
                    width: 38,
                    height: 34,
                    borderRadius: 8,
                    padding: 0,
                    paddingTop: 0,
                    paddingRight: 0,
                    paddingBottom: 0,
                    paddingLeft: 0,
                  },
                  onClick: () => {
                    const cur = this.lastConfig?.assemblyStep ?? 10;
                    callbacks.onSelectAssemblyStep(Math.max(1, cur - 1));
                  },
                }),
                new xb.UIButton({
                  icon: 'chevron_right',
                  ariaLabel: 'Next assembly phase',
                  style: {
                    width: 38,
                    height: 34,
                    borderRadius: 8,
                    padding: 0,
                    paddingTop: 0,
                    paddingRight: 0,
                    paddingBottom: 0,
                    paddingLeft: 0,
                  },
                  onClick: () => {
                    const cur = this.lastConfig?.assemblyStep ?? 10;
                    callbacks.onSelectAssemblyStep(Math.min(10, cur + 1));
                  },
                }),
              ],
            }),
          ],
        }),
        this.phaseToolsText,
        this.phaseChecklistText,
      ],
    });

    // Bill of Materials grid
    this.bomSystemsText = this.metricValue('1');
    this.bomLengthText = this.metricValue('11.0m');
    this.bomElbowsText = this.metricValue('10');
    this.bomPlantsText = this.metricValue('40');
    this.bomTanksText = this.metricValue('100L');
    this.bomYieldText = this.metricValue('96 kg');

    const bomGrid = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'column', gap: 8 },
      children: [
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: [
            this.metricBox('SYSTEMS', this.bomSystemsText),
            this.metricBox('PVC RUN', this.bomLengthText),
            this.metricBox('ELBOWS', this.bomElbowsText),
          ],
        }),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: [
            this.metricBox('NET POTS', this.bomPlantsText),
            this.metricBox('TANK VOL', this.bomTanksText),
            this.metricBox('YIELD / YR', this.bomYieldText),
          ],
        }),
      ],
    });

    // Telemetry grid
    this.telPhText = this.metricValue('6.00');
    this.telEcText = this.metricValue('1.42 mS');
    this.telTempText = this.metricValue('21.5 °C');
    this.telLuxText = this.metricValue('54k lx');

    const telemetryGrid = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'row', gap: 8 },
      children: [
        this.metricBox('pH', this.telPhText),
        this.metricBox('EC', this.telEcText),
        this.metricBox('TEMP', this.telTempText),
        this.metricBox('LUX', this.telLuxText),
      ],
    });

    this.capQuickLineText = new xb.UIText({
      text: 'FIT 88% GOOD · 192W · 24.4 DLI · 92% H2O',
      style: {
        width: '100%',
        fontSize: 13,
        fontWeight: 'bold',
        color: '#38bdf8',
        textAlign: 'center',
      },
    });

    this.bomView = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'column', gap: 10 },
      children: [
        ...stepRows,
        phasePanel,
        this.sectionLabel('BILL OF MATERIALS'),
        bomGrid,
        this.sectionLabel('IOT TELEMETRY'),
        telemetryGrid,
        this.capQuickLineText,
      ],
    });

    // Capability Diagnostics View
    this.capScoreBadgeText = new xb.UIText({
      text: '88% · GOOD',
      style: { fontSize: 20, fontWeight: 'bold', color: '#38bdf8' },
    });
    this.capRecArchText = new xb.UIText({
      text: 'BEST: TOWERS',
      style: { fontSize: 14, fontWeight: 'bold', color: '#cbd5e1' },
    });
    this.capReasonText = new xb.UIText({
      text: 'High-oxygen channels suit compact leafy greens.',
      style: {
        width: '100%',
        fontSize: 15,
        lineHeight: 1.35,
        opacity: 0.92,
      },
    });

    const capVerdictPanel = new xb.UIPanel({
      style: {
        width: '100%',
        flexDirection: 'column',
        gap: 8,
        padding: 14,
        borderRadius: 14,
        backgroundColor: SUBPANEL_BG,
      },
      children: [
        new xb.UIPanel({
          style: {
            width: '100%',
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
          },
          children: [this.capScoreBadgeText, this.capRecArchText],
        }),
        this.capReasonText,
      ],
    });

    this.capFootprintText = this.metricValue('3.0 m²');
    this.capDensityText = this.metricValue('32.0 kg/m²');
    this.capDailyYieldText = this.metricValue('263 g/d');
    this.capPowerText = this.metricValue('192 W');
    this.capDliText = this.metricValue('24.4 mol');
    this.capWaterSaveText = this.metricValue('92%');

    const capGrid = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'column', gap: 8 },
      children: [
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: [
            this.metricBox('FOOTPRINT', this.capFootprintText),
            this.metricBox('SPACE YIELD', this.capDensityText),
            this.metricBox('DAILY HARVEST', this.capDailyYieldText),
          ],
        }),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 8 },
          children: [
            this.metricBox('LOAD / DAY', this.capPowerText),
            this.metricBox('LIGHT DLI', this.capDliText),
            this.metricBox('WATER SAVED', this.capWaterSaveText),
          ],
        }),
      ],
    });

    this.capOptimizeBtn = new xb.UIButton({
      label: 'Auto-Fit Rig',
      icon: 'tune',
      ariaLabel: 'Auto-optimize architecture for selected crop',
      style: {
        flexGrow: 1,
        flexBasis: 0,
        height: 44,
        fontSize: 15,
        borderRadius: 12,
        backgroundColor: ACTIVE_GREEN_BG,
      },
      onClick: () => callbacks.onOptimizeForCrop(),
    });
    this.capDiagBtn = new xb.UIButton({
      label: '3D Envelope: OFF',
      icon: 'analytics',
      ariaLabel: 'Toggle 3D clearance and PPFD cone diagnostics',
      style: {
        flexGrow: 1,
        flexBasis: 0,
        height: 44,
        fontSize: 15,
        borderRadius: 12,
        backgroundColor: INACTIVE_BG,
      },
      onClick: () => callbacks.onToggleDiagnostics(),
    });

    this.capView = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'column', gap: 12 },
      children: [
        this.sectionLabel('CROP-RIG COMPATIBILITY'),
        capVerdictPanel,
        this.sectionLabel('RESOURCE & YIELD CAPABILITY'),
        capGrid,
        this.sectionLabel('SPATIAL OPTIMIZATION'),
        new xb.UIPanel({
          style: { width: '100%', flexDirection: 'row', gap: 10 },
          children: [this.capOptimizeBtn, this.capDiagBtn],
        }),
      ],
    });

    this.rightBodySlot = new xb.UIPanel({
      style: { width: '100%', flexDirection: 'column' },
      children: [this.bomView],
    });

    this.assemblyCard = new xb.UICard({
      size: { width: 0.76, height: 'auto' },
      manipulation: true,
      edge: true,
      style: {
        flexDirection: 'column',
        gap: 10,
        padding: 20,
        borderRadius: 22,
        backgroundColor: CARD_SURFACE_BG,
        borderColor: CARD_BORDER,
        borderWidth: 1.5,
      },
      children: [assemblyHeader, tabRow, this.rightBodySlot],
    });
    this.assemblyCard.name = 'Assembly Navigator and BOM Card';
    this.assemblyCard.position.set(1.14, 1.44, -1.28);
    this.assemblyCard.rotation.y = -0.46;

    // =========================================================================
    // VIEW-SPACE TOP HUD BAR (UNOBSTRUCTED CENTER & BOTTOM SIM CONTROLS)
    // =========================================================================
    this.hudSummaryText = new xb.UIText({
      text: 'ZIG-ZAG · Lettuce · 88% FIT · 1 Sys',
      pointerEvents: 'none',
      style: { fontSize: 14, fontWeight: 'bold', flexGrow: 1 },
    });
    this.hudAutoFitBtn = new xb.UIButton({
      label: 'Fit',
      icon: 'tune',
      ariaLabel: 'Auto-fit optimal architecture for crop',
      style: {
        width: 86,
        height: 40,
        fontSize: 14,
        borderRadius: 12,
        backgroundColor: ACTIVE_GREEN_BG,
        paddingLeft: 6,
        paddingRight: 6,
      },
      onClick: () => callbacks.onOptimizeForCrop(),
    });
    this.hudDiagBtn = new xb.UIButton({
      label: 'Diag',
      icon: 'analytics',
      ariaLabel: 'Toggle 3D spatial capability envelope',
      style: {
        width: 92,
        height: 40,
        fontSize: 14,
        borderRadius: 12,
        paddingLeft: 6,
        paddingRight: 6,
      },
      onClick: () => callbacks.onToggleDiagnostics(),
    });
    this.hudAutoScanBtn = new xb.UIButton({
      label: 'Scan',
      icon: 'radar',
      ariaLabel: 'Auto scan room layout',
      style: {
        width: 94,
        height: 40,
        fontSize: 14,
        borderRadius: 12,
        backgroundColor: '#0284c7',
        paddingLeft: 6,
        paddingRight: 6,
      },
      onClick: () => callbacks.onAutoScan(),
    });
    this.hudGrowthBtn = new xb.UIButton({
      label: 'Grow',
      icon: 'eco',
      ariaLabel: 'Toggle crop growth animation',
      style: {
        width: 94,
        height: 40,
        fontSize: 14,
        borderRadius: 12,
        paddingLeft: 6,
        paddingRight: 6,
      },
      onClick: () => callbacks.onToggleGrowthAnim(),
    });
    this.hudToggleCardsBtn = new xb.UIButton({
      label: 'Hide UI',
      icon: 'visibility_off',
      ariaLabel: 'Toggle floating spatial panels',
      style: {
        width: 118,
        height: 40,
        fontSize: 14,
        borderRadius: 12,
        paddingLeft: 6,
        paddingRight: 6,
      },
      onClick: () => callbacks.onToggleCards(),
    });

    const exitBtn = new xb.UIExitButton({
      style: {
        position: 'relative',
        top: 0,
        left: 0,
        flexShrink: 0,
      },
    });

    this.hudOverlay = new xb.UIOverlay({
      style: {
        width: 920,
        position: 'absolute',
        top: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 18,
        backgroundColor: CARD_SURFACE_BG,
        borderColor: CARD_BORDER,
        borderWidth: 1.5,
      },
      children: [
        exitBtn,
        this.hudSummaryText,
        this.hudAutoFitBtn,
        this.hudDiagBtn,
        this.hudAutoScanBtn,
        this.hudGrowthBtn,
        this.hudToggleCardsBtn,
      ],
    });
    this.hudOverlay.name = 'HydroSpatial HUD Overlay';
  }

  public setRightTab(tab: 'BOM' | 'CAPABILITY'): void {
    if (this.rightTab === tab) return;
    this.rightTab = tab;
    if (tab === 'CAPABILITY') {
      this.rightBodySlot.remove(this.bomView);
      this.rightBodySlot.add(this.capView);
      this.tabBomBtn.style.backgroundColor = INACTIVE_BG;
      this.tabCapBtn.style.backgroundColor = ACTIVE_BG;
    } else {
      this.rightBodySlot.remove(this.capView);
      this.rightBodySlot.add(this.bomView);
      this.tabBomBtn.style.backgroundColor = ACTIVE_BG;
      this.tabCapBtn.style.backgroundColor = INACTIVE_BG;
    }
  }

  private sectionLabel(text: string): xb.UIText {
    return new xb.UIText({
      text,
      style: { fontSize: 13, fontWeight: 'bold', opacity: 0.68 },
    });
  }

  private metricValue(initial: string): xb.UIText {
    return new xb.UIText({
      text: initial,
      style: { fontSize: 16, fontWeight: 'bold', color: '#f8fafc' },
    });
  }

  private metricBox(label: string, valueText: xb.UIText): xb.UIPanel {
    return new xb.UIPanel({
      style: {
        flexGrow: 1,
        flexBasis: 0,
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: 8,
        borderRadius: 10,
        backgroundColor: SUBPANEL_BG,
      },
      children: [
        new xb.UIText({
          text: label,
          style: { fontSize: 12, opacity: 0.72, fontWeight: 'bold' },
        }),
        valueText,
      ],
    });
  }

  public sync(
    config: HydroConfig,
    bom: BillOfMaterials,
    telemetry: TelemetrySnapshot,
    capability: CapabilityReport,
    tool: SpatialToolMode,
    flags: {
      isGrowthAnimating: boolean;
      isTimeAnimating: boolean;
      isScanning: boolean;
      cardsVisible: boolean;
      showDiagnostics: boolean;
      statusMessage?: string;
    }
  ): void {
    this.lastConfig = { ...config };
    this.cardsVisible = flags.cardsVisible;
    this.architectCard.visible = flags.cardsVisible;
    this.assemblyCard.visible = flags.cardsVisible;

    const cropLabel = CROPS[config.crop].label;
    this.archSummaryText.text = `${config.architecture} · ${cropLabel.toUpperCase()}`;

    for (const [id, btn] of this.archButtons) {
      btn.style.backgroundColor = id === config.architecture ? ACTIVE_BG : INACTIVE_BG;
    }
    for (const [id, btn] of this.cropButtons) {
      btn.style.backgroundColor = id === config.crop ? ACTIVE_GREEN_BG : INACTIVE_BG;
    }
    for (const [stepNum, btn] of this.stepButtons) {
      btn.style.backgroundColor =
        stepNum === config.assemblyStep
          ? ACTIVE_BG
          : stepNum < config.assemblyStep
            ? 'rgba(16, 185, 129, 0.34)'
            : INACTIVE_BG;
    }
    for (const [t, btn] of this.toolButtons) {
      const activeColor = t === 'ERASE' ? ACTIVE_RED_BG : t === 'MOVE' ? ACTIVE_AMBER_BG : ACTIVE_BG;
      btn.style.backgroundColor = t === tool ? activeColor : INACTIVE_BG;
    }

    this.widthValueText.text = `${config.width.toFixed(1)}m`;
    this.tiersValueText.text = String(config.tiers);
    this.growthValueText.text = `${config.growthMonth.toFixed(1)}mo`;
    this.growthSlider.value = config.growthMonth;
    this.growthPlayBtn.label = flags.isGrowthAnimating ? 'Pause' : 'Play';
    this.growthPlayBtn.icon = flags.isGrowthAnimating ? 'pause' : 'play_arrow';

    this.timeValueText.text = formatTimeOfDay(config.timeOfDay);
    this.timeSlider.value = config.timeOfDay;
    this.timePlayBtn.label = flags.isTimeAnimating ? 'Pause' : 'Sun';
    this.timePlayBtn.icon = flags.isTimeAnimating ? 'pause' : 'wb_sunny';

    this.autoScanBtn.disabled = flags.isScanning;
    this.autoScanBtn.label = flags.isScanning ? 'Scan...' : 'Scan';
    this.hudAutoScanBtn.disabled = flags.isScanning;
    this.hudAutoScanBtn.label = flags.isScanning ? 'Scan...' : 'Scan';

    this.hudDiagBtn.style.backgroundColor = flags.showDiagnostics ? '#0284c7' : INACTIVE_BG;
    this.capDiagBtn.label = flags.showDiagnostics ? '3D Envelope: ON' : '3D Envelope: OFF';
    this.capDiagBtn.style.backgroundColor = flags.showDiagnostics ? ACTIVE_BG : INACTIVE_BG;

    this.hudGrowthBtn.label = flags.isGrowthAnimating ? 'Pause' : 'Grow';
    this.hudToggleCardsBtn.label = this.cardsVisible ? 'Hide UI' : 'Show UI';
    this.hudToggleCardsBtn.icon = this.cardsVisible ? 'visibility_off' : 'visibility';

    if (flags.statusMessage) {
      this.statusBannerText.text = flags.statusMessage;
    }

    // Assembly step details
    const stepData = ASSEMBLY_STEPS[config.assemblyStep - 1];
    this.phaseBadgeText.text = `PHASE ${stepData.step} / 10`;
    this.phaseTitleText.text = stepData.title.toUpperCase();
    this.phaseToolsText.text = `Tools: ${stepData.tools}`;
    this.phaseChecklistText.text = stepData.lines.join('\n');

    // BOM
    this.bomSystemsText.text = String(bom.systems);
    this.bomLengthText.text = `${bom.lengthMeters.toFixed(1)}m`;
    this.bomElbowsText.text = String(bom.elbows);
    this.bomPlantsText.text = String(bom.plants);
    this.bomTanksText.text = `${bom.waterLiters}L`;
    this.bomYieldText.text = `${bom.estYieldKgYear.toFixed(0)} kg`;

    // Telemetry
    this.telPhText.text = telemetry.ph.toFixed(2);
    this.telEcText.text = `${telemetry.ec.toFixed(2)} mS`;
    this.telTempText.text = `${telemetry.waterTempC.toFixed(1)} °C`;
    this.telLuxText.text = `${(telemetry.solarLux / 1000).toFixed(1)}k lx`;

    // Capability metrics
    const ratingColor =
      capability.rating === 'OPTIMAL'
        ? '#4ade80'
        : capability.rating === 'SUBOPTIMAL'
          ? '#fbbf24'
          : '#38bdf8';
    this.capQuickLineText.text = `FIT ${capability.score}% ${capability.rating} · ${capability.powerWatts}W · ${capability.dliMolPerM2Day} DLI · ${capability.waterSavingsPct}% H2O`;
    this.capQuickLineText.style.color = ratingColor;

    this.capScoreBadgeText.text = `${capability.score}% · ${capability.rating}`;
    this.capScoreBadgeText.style.color = ratingColor;
    this.capRecArchText.text =
      config.architecture === capability.recommendedArch
        ? 'PEAK MATCH'
        : `BEST: ${capability.recommendedArch}`;
    this.capReasonText.text = capability.reason;
    this.capFootprintText.text = `${capability.footprintM2.toFixed(1)} m²`;
    this.capDensityText.text = `${capability.yieldPerM2Year.toFixed(1)} kg/m²`;
    this.capDailyYieldText.text = `${capability.dailyYieldGrams} g/d`;
    this.capPowerText.text = `${capability.powerWatts}W · ${capability.energyKwhDay}kWh`;
    this.capDliText.text = `${capability.dliMolPerM2Day.toFixed(1)} mol`;
    this.capWaterSaveText.text = `${capability.waterSavingsPct}%`;

    this.capOptimizeBtn.label = `Auto-Fit ${capability.recommendedArch}`;
    const alreadyOptimal =
      config.architecture === capability.recommendedArch &&
      config.width === capability.recommendedWidth &&
      config.tiers === capability.recommendedTiers;
    this.hudAutoFitBtn.style.backgroundColor = alreadyOptimal ? 'rgba(16, 185, 129, 0.35)' : ACTIVE_GREEN_BG;

    // Top HUD summary
    this.hudSummaryText.text = `${config.architecture} · ${cropLabel} · ${capability.score}% ${capability.rating} · ${bom.systems} Sys`;
  }
}
