/**
 * fisheye-panorama-embed/core
 *
 * Framework-agnostic fish-eye panorama viewer component
 * (Inlined from @fisheye-panorama/core)
 */

export { FishEyePanoramaRenderer } from './renderer';
export type {
  ViewState,
  RendererConfig,
  RendererCallbacks,
  InputType,
  InputData,
  PanoramaLabel,
} from './types';
export { ProjectionType, CONSTRAINTS } from './types';
export {
  projectToSource,
  projectToViewport,
  normalizeAngle,
  clamp,
  degToRad,
  radToDeg,
  getProjectionStrategy,
} from './projection';
export type {
  PixelCoord,
  SphericalCoord,
  SampleCoord,
} from './projection';
export { LabelRenderer } from './labelRenderer';
