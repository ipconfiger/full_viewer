/**
 * View state representing the current camera orientation
 */
export interface ViewState {
  /** Horizontal rotation in degrees, -180 to 180 */
  yaw: number;
  /** Vertical rotation in degrees, -90 to 90 */
  pitch: number;
  /** Zoom/scale factor, typically 0.5 to 3.0 */
  zoom: number;
  /** Whether user is currently dragging */
  isDragging: boolean;
}

/**
 * Configuration options for the renderer
 */
export interface RendererConfig {
  /** Initial yaw angle in degrees */
  initialYaw?: number;
  /** Initial pitch angle in degrees */
  initialPitch?: number;
  /** Initial zoom level */
  initialZoom?: number;
  /** Minimum zoom level (default: 0.5) */
  minZoom?: number;
  /** Maximum zoom level (default: 3.0) */
  maxZoom?: number;
  /** Horizontal field of view in degrees (default: 90) */
  fov?: number;
  /** Enable keyboard controls (default: true) */
  enableKeyboard?: boolean;
  /** Mouse movement sensitivity (default: 0.5) */
  sensitivity?: number;
  /** 投影类型（默认: STEREOGRAPHIC） */
  projectionType?: ProjectionType;
}

/**
 * Event callbacks for framework integration
 */
export interface RendererCallbacks {
  /** Called when view state changes (during drag/zoom) */
  onViewChange?: (state: Readonly<ViewState>) => void;
  /** Called when image loads successfully */
  onLoad?: () => void;
  /** Called when an error occurs */
  onError?: (error: Error) => void;
}

/**
 * Input event types
 */
export type InputType =
  | 'mouse-down'
  | 'mouse-move'
  | 'mouse-up'
  | 'mouse-leave'
  | 'wheel'
  | 'touch-start'
  | 'touch-move'
  | 'touch-end'
  | 'key-down';

/**
 * Input event data
 */
export interface InputData {
  x?: number;
  y?: number;
  dx?: number;
  dy?: number;
  deltaY?: number;
  key?: string;
  touches?: Array<{ x: number; y: number }>;
}

/**
 * Panorama label definition
 */
export interface PanoramaLabel {
  /** Unique identifier */
  id: string;
  /** Source image X coordinate (pixels) */
  x: number;
  /** Source image Y coordinate (pixels) */
  y: number;
  /** Width (source image pixels) */
  w: number;
  /** Height (source image pixels) */
  h: number;
  /** Display text */
  title?: string;
}

/**
 * Projection type enumeration
 */
export enum ProjectionType {
  /** Rectilinear (perspective) projection - 当前实现 */
  RECTILINEAR = 'rectilinear',

  /** Stereographic (fisheye) projection - 推荐默认 */
  STEREOGRAPHIC = 'stereographic',

  /** Equidistant fisheye - 线性角度到距离 */
  EQUIDISTANT = 'equidistant',

  /** Equisolid angle - 保持立体角 */
  EQUISOLID = 'equisolid',
}

/**
 * Validation constraints
 */
export const CONSTRAINTS = {
  MIN_CANVAS_SIZE: 100,
  MIN_IMAGE_WIDTH: 512,
  MIN_IMAGE_HEIGHT: 256,
  MAX_IMAGE_WIDTH: 8192,
  MAX_IMAGE_HEIGHT: 4096,
  DEFAULT_FOV: 90,
  DEFAULT_MIN_ZOOM: 0.5,
  DEFAULT_MAX_ZOOM: 3.0,
  MIN_PITCH: -90,
  MAX_PITCH: 90,
} as const;
