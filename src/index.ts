import * as xb from 'xrblocks';
import { HydroScene } from './HydroScene';

document.addEventListener('DOMContentLoaded', () => {
  const options = new xb.Options();
  options.setAppTitle('HydroSpatial XR');
  options.setAppDescription(
    'Parametric XR Hydroponics Architect & 10-Step Spatial Assembly Studio.'
  );
  options.enableReticles();
  options.enableDepth();
  options.enablePlaneDetection();
  options.enableHands();
  options.hands.visualization = true;
  options.xrButton.showEnterSimulatorButton = true;

  const params = new URLSearchParams(window.location.search);
  if (params.get('autostart') === '1') {
    options.xrButton.alwaysAutostartSimulator = true;
  }

  options.simulator.instructions.customInstructions = [
    {
      header: 'HydroSpatial XR',
      description:
        'Use the left Spatial Card to choose architectures, crops, and parametric dimensions. Use the right card to step through the 10 assembly phases, BOM, and IoT telemetry. Click or pinch the floor to place units.',
    },
  ];

  xb.add(new HydroScene());
  xb.init(options);
});
