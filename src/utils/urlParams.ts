import { PanoramaLabel, ProjectionType } from '../core';

export interface UrlParams {
  src: string;
  labels?: PanoramaLabel[];
  projection?: ProjectionType;
  initialYaw?: number;
  initialPitch?: number;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
}

/**
 * Parse all URL parameters from window.location.search
 */
export function parseUrlParams(): UrlParams {
  const searchParams = new URLSearchParams(window.location.search);

  const src = searchParams.get('src') || '';
  const labelsParam = searchParams.get('labels');
  const projection = parseProjection(searchParams.get('projection') || '');
  const initialYaw = parseNumberParam(searchParams.get('initialYaw') || undefined, 0, -180, 180);
  const initialPitch = parseNumberParam(searchParams.get('initialPitch') || undefined, 0, -90, 90);
  const initialZoom = parseNumberParam(searchParams.get('initialZoom') || undefined, 1.0, 0.5, 3.0);
  const minZoom = parseNumberParam(searchParams.get('minZoom') || undefined, 0.5, 0.1);
  const maxZoom = parseNumberParam(searchParams.get('maxZoom') || undefined, 3.0, 0.1);

  const labels = labelsParam ? parseLabels(labelsParam) : undefined;

  return {
    src,
    labels,
    projection,
    initialYaw,
    initialPitch,
    initialZoom,
    minZoom,
    maxZoom,
  };
}

/**
 * Parse labels from base64 or URL-encoded JSON
 */
export function parseLabels(labelsParam: string): PanoramaLabel[] | undefined {
  console.log('[parseLabels] Input labelsParam:', labelsParam);

  try {
    let decoded: string;

    // Check if it looks like base64 first
    // Base64 strings only contain A-Z, a-z, 0-9, +, /, = and no spaces
    const looksLikeBase64 = /^[A-Za-z0-9+/]+=*$/.test(labelsParam) && !labelsParam.includes(' ');

    if (looksLikeBase64) {
      // Try base64 decoding
      try {
        decoded = atob(labelsParam);
        console.log('[parseLabels] Base64 decoded successfully');
      } catch {
        // If base64 fails, fall back to URL decoding
        decoded = decodeURIComponent(labelsParam);
        console.log('[parseLabels] URL decoded successfully (fallback)');
      }
    } else {
      // Try URL-decoding first (for Chinese characters)
      try {
        decoded = decodeURIComponent(labelsParam);
        console.log('[parseLabels] URL decoded successfully');
      } catch {
        // If URL decoding fails, try base64
        decoded = atob(labelsParam);
        console.log('[parseLabels] Base64 decoded successfully (fallback)');
      }
    }

    console.log('[parseLabels] Decoded string:', decoded);

    const labels = JSON.parse(decoded) as unknown[];
    console.log('[parseLabels] Parsed labels:', labels);

    // Validate array structure
    if (!Array.isArray(labels)) {
      console.error('Labels parameter is not an array');
      return undefined;
    }

    // Transform and validate each label
    const validLabels: PanoramaLabel[] = [];
    for (const label of labels) {
      // Try to transform legacy format first
      const transformedLabel = transformLegacyLabel(label);

      // If it's not legacy format, use as-is
      const labelToValidate = transformedLabel || label;

      console.log('[parseLabels] Processing label:', {
        original: label,
        transformed: transformedLabel,
        toValidate: labelToValidate,
        isValid: isValidLabel(labelToValidate)
      });

      if (isValidLabel(labelToValidate)) {
        // Sanitize title field (text content only)
        if (labelToValidate.title) {
          labelToValidate.title = String(labelToValidate.title).replace(/[<>]/g, '');
        }
        validLabels.push(labelToValidate);
      } else {
        console.warn('Invalid label structure, skipping:', label);
      }
    }

    console.log('[parseLabels] Final validLabels:', validLabels);
    return validLabels.length > 0 ? validLabels : undefined;
  } catch (err) {
    console.error('Failed to parse labels parameter:', err);
    return undefined;
  }
}

/**
 * Transform legacy label format to new format
 * Legacy format: { angle, pitch, text, color }
 * New format: { id, x, y, w, h, title }
 */
function transformLegacyLabel(label: any): PanoramaLabel | null {
  // Check if it's old format
  if (
    typeof label === 'object' &&
    label !== null &&
    'angle' in label &&
    'pitch' in label &&
    'text' in label
  ) {
    // Transform to new format
    // Convert angle (-180 to 180) to x coordinate (0 to 3600)
    // Convert pitch (-90 to 90) to y coordinate (0 to 1800)
    return {
      id: crypto.randomUUID(),
      x: (label.angle + 180) * 10, // Scale: 1 degree = 10 units
      y: (label.pitch + 90) * 10,   // Scale: 1 degree = 10 units
      w: 100,                        // Default width
      h: 50,                         // Default height
      title: label.text,
    };
  }
  return null;
}

/**
 * Validate if an object is a valid PanoramaLabel
 * Accepts both new format (id, x, y, w, h, title) and legacy format (angle, pitch, text, color)
 */
function isValidLabel(obj: unknown): obj is PanoramaLabel {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const label = obj as Record<string, unknown>;

  // Check new format
  const hasNewFormat =
    typeof label.id === 'string' &&
    typeof label.x === 'number' &&
    typeof label.y === 'number' &&
    typeof label.w === 'number' &&
    typeof label.h === 'number' &&
    (label.title === undefined || typeof label.title === 'string');

  if (hasNewFormat) {
    return true;
  }

  // Legacy format is already transformed by transformLegacyLabel,
  // so we should never reach here with legacy format.
  // This check is just for safety.
  return false;
}

/**
 * Validate image URL (prevent XSS)
 */
export function isValidImageUrl(url: string): boolean {
  try {
    // Check for dangerous protocols
    const lowerUrl = url.toLowerCase().trim();
    if (lowerUrl.startsWith('javascript:') ||
        lowerUrl.startsWith('data:') ||
        lowerUrl.startsWith('vbscript:') ||
        lowerUrl.startsWith('file:')) {
      return false;
    }

    // Try to parse as URL
    new URL(url, window.location.origin);

    // Only allow http, https, and relative paths
    const parsed = new URL(url, window.location.origin);
    return parsed.protocol === 'http:' ||
           parsed.protocol === 'https:' ||
           parsed.protocol === 'file:'; // For local testing
  } catch {
    // Invalid URL format
    return false;
  }
}

/**
 * Parse projection type with fallback
 */
export function parseProjection(value: string): ProjectionType | undefined {
  if (!value) return undefined;

  const normalized = value.toLowerCase().trim();

  switch (normalized) {
    case 'equidistant':
      return ProjectionType.EQUIDISTANT;
    case 'stereographic':
      return ProjectionType.STEREOGRAPHIC;
    case 'equisolid':
      return ProjectionType.EQUISOLID;
    case 'rectilinear':
      return ProjectionType.RECTILINEAR;
    default:
      console.warn(`Unknown projection type: ${value}, using default`);
      return undefined;
  }
}

/**
 * Parse number with min/max clamping
 */
export function parseNumberParam(
  param: string | undefined,
  defaultValue: number,
  min?: number,
  max?: number
): number {
  if (!param) return defaultValue;

  const num = parseFloat(param);

  if (isNaN(num)) {
    return defaultValue;
  }

  let result = num;

  if (min !== undefined && result < min) {
    result = min;
  }

  if (max !== undefined && result > max) {
    result = max;
  }

  return result;
}
