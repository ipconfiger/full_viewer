/**
 * Equirectangular projection utilities
 * Converts between viewport coordinates and equirectangular image coordinates
 */

import { ProjectionType } from './types';

/**
 * Pixel coordinate in the viewport
 */
export interface PixelCoord {
  x: number;
  y: number;
}

/**
 * Spherical coordinate (angles)
 */
export interface SphericalCoord {
  lat: number;  // Latitude in radians [-PI/2, PI/2]
  lon: number;  // Longitude in radians [-PI, PI]
}

/**
 * Sample coordinate in the source image
 */
export interface SampleCoord {
  x: number;  // Pixel x in source image
  y: number;  // Pixel y in source image
}

/**
 * 投影策略接口
 */
interface ProjectionStrategy {
  /**
   * 将归一化视口坐标投影到视角
   * @param aspectRatio - 视口宽高比
   */
  viewportToAngles(
    nx: number,
    ny: number,
    fov: number,
    aspectRatio: number
  ): { theta: number; phi: number };

  /**
   * 将视角投影到归一化视口坐标
   * @param aspectRatio - 视口宽高比
   */
  anglesToViewport(
    theta: number,
    phi: number,
    fov: number,
    aspectRatio: number
  ): { nx: number; ny: number };

  /**
   * 计算拖动速度（基于位置的自适应灵敏度）
   */
  getDragVelocity(
    nx: number,
    ny: number,
    baseSensitivity: number
  ): { x: number; y: number };
}

/**
 * Stereographic 投影策略（推荐默认）
 */
class StereographicProjection implements ProjectionStrategy {
  viewportToAngles(nx: number, ny: number, fov: number, aspectRatio: number): { theta: number; phi: number } {
    // 考虑宽高比，调整x方向
    const adjustedNx = nx * aspectRatio;
    const r = Math.sqrt(adjustedNx * adjustedNx + ny * ny);

    if (r < 0.0001) {
      return { theta: 0, phi: 0 };
    }

    // Stereographic 公式: θ = 2 * atan(r / (2 * tan(fov/4)))
    const maxAngle = fov / 2;
    const angle = 2 * Math.atan(r / (2 * Math.tan(maxAngle / 2)));

    const theta = angle * (adjustedNx / r);
    const phi = angle * (ny / r);

    return { theta, phi };
  }

  anglesToViewport(theta: number, phi: number, fov: number, aspectRatio: number): { nx: number; ny: number } {
    const angle = Math.sqrt(theta * theta + phi * phi);

    if (angle < 0.0001) {
      return { nx: 0, ny: 0 };
    }

    // 反向公式: r = 2 * tan(θ/2) * 2 * tan(fov/4)
    const maxAngle = fov / 2;
    const r = 2 * Math.tan(angle / 2) * (2 * Math.tan(maxAngle / 2));

    let nx = r * (theta / angle);
    const ny = r * (phi / angle);

    // 移除宽高比调整
    nx = nx / aspectRatio;

    return { nx, ny };
  }

  getDragVelocity(nx: number, ny: number, baseSensitivity: number): { x: number; y: number } {
    // 基于距离中心的位置调整速度
    // 边缘较慢，中心较快，体验更自然
    const r = Math.sqrt(nx * nx + ny * ny);

    // 余弦衰减：中心 1.0，边缘约 0.7
    const falloff = Math.cos(r * Math.PI / 4);

    return {
      x: baseSensitivity * falloff,
      y: baseSensitivity * falloff
    };
  }
}

/**
 * Equidistant Fisheye 投影策略（推荐默认）
 *
 * 特性：
 * - 线性角度到距离映射：r = f × θ
 * - 均匀角分辨率
 * - 无边缘拉伸
 * - 支持 > 180° FOV
 */
class EquidistantProjection implements ProjectionStrategy {
  viewportToAngles(nx: number, ny: number, fov: number, aspectRatio: number): { theta: number; phi: number } {
    // 1. 考虑宽高比，调整 x 方向
    const adjustedNx = nx * aspectRatio;

    // 2. 计算径向距离
    const r = Math.sqrt(adjustedNx * adjustedNx + ny * ny);

    // 3. 处理中心点（避免除零）
    if (r < 0.0001) {
      return { theta: 0, phi: 0 };
    }

    // 4. 等距投影核心公式：angle = r × (fov / 2) / maxRadius
    const maxRadius = Math.sqrt(aspectRatio * aspectRatio + 1);
    const angle = r * (fov / 2) / maxRadius;

    // 5. 分解为 theta 和 phi
    const theta = angle * (adjustedNx / r);
    const phi = angle * (ny / r);

    return { theta, phi };
  }

  anglesToViewport(theta: number, phi: number, fov: number, aspectRatio: number): { nx: number; ny: number } {
    // 1. 计算视角角度
    const angle = Math.sqrt(theta * theta + phi * phi);

    // 2. 处理中心点
    if (angle < 0.0001) {
      return { nx: 0, ny: 0 };
    }

    // 3. 等距投影反向公式：r = angle × maxRadius / (fov / 2)
    const maxRadius = Math.sqrt(aspectRatio * aspectRatio + 1);
    const r = angle * maxRadius / (fov / 2);

    // 4. 分解为 nx, ny
    let nx = r * (theta / angle);
    const ny = r * (phi / angle);

    // 5. 移除宽高比调整
    nx = nx / aspectRatio;

    return { nx, ny };
  }

  getDragVelocity(nx: number, ny: number, baseSensitivity: number): { x: number; y: number } {
    // 等距投影角分辨率均匀，使用轻微线性衰减
    const r = Math.sqrt(nx * nx + ny * ny);

    // 边缘（r=1）时约为 0.85，中心时为 1.0
    const falloff = 1 - (r * 0.15);

    return {
      x: baseSensitivity * Math.max(0.5, falloff),
      y: baseSensitivity * Math.max(0.5, falloff)
    };
  }
}

/**
 * Equisolid 投影策略
 *
 * 特性：
 * - 保持立体角：r = 2f × sin(θ/2)
 * - 均匀面积投影
 * - 边缘压缩介于等距和立体投影之间
 * - 常用于鱼眼镜头
 */
class EquisolidProjection implements ProjectionStrategy {
  viewportToAngles(nx: number, ny: number, _fov: number, aspectRatio: number): { theta: number; phi: number } {
    // 考虑宽高比，调整x方向
    const adjustedNx = nx * aspectRatio;
    const r = Math.sqrt(adjustedNx * adjustedNx + ny * ny);

    if (r < 0.0001) {
      return { theta: 0, phi: 0 };
    }

    // Equisolid 公式: angle = 2 × arcsin(r / 2)
    const angle = 2 * Math.asin(Math.min(r / 2, 1));

    const theta = angle * (adjustedNx / r);
    const phi = angle * (ny / r);

    return { theta, phi };
  }

  anglesToViewport(theta: number, phi: number, _fov: number, aspectRatio: number): { nx: number; ny: number } {
    const angle = Math.sqrt(theta * theta + phi * phi);

    if (angle < 0.0001) {
      return { nx: 0, ny: 0 };
    }

    // Equisolid 反向公式: r = 2 × sin(angle / 2)
    const r = 2 * Math.sin(angle / 2);

    let nx = r * (theta / angle);
    const ny = r * (phi / angle);

    // 移除宽高比调整
    nx = nx / aspectRatio;

    return { nx, ny };
  }

  getDragVelocity(nx: number, ny: number, baseSensitivity: number): { x: number; y: number } {
    const r = Math.sqrt(nx * nx + ny * ny);
    // 中等衰减（介于等距的 0.85 和立体的 0.7 之间）
    const falloff = 1 - (r * 0.2);
    return {
      x: baseSensitivity * Math.max(0.6, falloff),
      y: baseSensitivity * Math.max(0.6, falloff)
    };
  }
}

/**
 * Rectilinear 投影策略（当前实现，用于向后兼容）
 */
class RectilinearProjection implements ProjectionStrategy {
  viewportToAngles(nx: number, ny: number, fov: number, aspectRatio: number): { theta: number; phi: number } {
    const theta = Math.atan2(nx * aspectRatio * Math.tan(fov / 2), 1);
    const phi = Math.atan(ny * Math.tan(fov / 2));
    return { theta, phi };
  }

  anglesToViewport(theta: number, phi: number, fov: number, aspectRatio: number): { nx: number; ny: number } {
    const nx = Math.tan(theta) / (aspectRatio * Math.tan(fov / 2));
    const ny = Math.tan(phi) / Math.tan(fov / 2);
    return { nx, ny };
  }

  getDragVelocity(_nx: number, _ny: number, baseSensitivity: number): { x: number; y: number } {
    // 均匀速度
    return { x: baseSensitivity, y: baseSensitivity };
  }
}

// 策略注册表（部分实现，后续可扩展）
const projectionStrategies: Partial<Record<ProjectionType, ProjectionStrategy>> = {
  [ProjectionType.RECTILINEAR]: new RectilinearProjection(),
  [ProjectionType.STEREOGRAPHIC]: new StereographicProjection(),
  [ProjectionType.EQUIDISTANT]: new EquidistantProjection(),
  [ProjectionType.EQUISOLID]: new EquisolidProjection(),
};

/**
 * 获取投影策略
 */
export function getProjectionStrategy(type: ProjectionType): ProjectionStrategy {
  // 如果请求的投影类型不存在，默认使用 STEREOGRAPHIC
  return projectionStrategies[type] || projectionStrategies[ProjectionType.STEREOGRAPHIC]!;
}

/**
 * Project viewport pixel to source image sample coordinate
 *
 * @param x - Viewport x coordinate (0 to width)
 * @param y - Viewport y coordinate (0 to height)
 * @param width - Viewport width
 * @param height - Viewport height
 * @param imageWidth - Source image width
 * @param imageHeight - Source image height
 * @param yaw - Camera yaw in radians
 * @param pitch - Camera pitch in radians
 * @param zoom - Zoom level
 * @param fov - Field of view in radians
 * @param projectionType - Projection type to use (default: STEREOGRAPHIC)
 * @returns Sample coordinate in source image
 */
export function projectToSource(
  x: number,
  y: number,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number,
  yaw: number,
  pitch: number,
  zoom: number,
  fov: number,
  projectionType: ProjectionType = ProjectionType.STEREOGRAPHIC
): SampleCoord {
  // Normalize to [-1, 1]
  const nx = (2 * x / width) - 1;
  const ny = (2 * y / height) - 1;

  // Apply zoom (inverse scaling)
  const aspectRatio = width / height;
  const zoomedNx = nx / zoom;
  const zoomedNy = ny / zoom;

  // 获取投影策略
  const strategy = getProjectionStrategy(projectionType);

  // 使用策略转换到视角
  const { theta, phi } = strategy.viewportToAngles(zoomedNx, zoomedNy, fov, aspectRatio);

  // Apply camera rotation
  let lon = theta + yaw;
  let lat = phi + pitch;

  // Normalize longitude to [-PI, PI]
  while (lon > Math.PI) lon -= 2 * Math.PI;
  while (lon < -Math.PI) lon += 2 * Math.PI;

  // Clamp latitude to [-PI/2, PI/2]
  lat = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, lat));

  // Map to equirectangular image coordinates
  // Longitude goes from -PI to PI, map to [0, imageWidth]
  // Latitude goes from -PI/2 to PI/2, map to [0, imageHeight]
  const srcX = ((lon + Math.PI) / (2 * Math.PI)) * imageWidth;
  const srcY = ((lat + Math.PI / 2) / Math.PI) * imageHeight;

  return { x: srcX, y: srcY };
}

/**
 * Normalize angle to [-PI, PI]
 */
export function normalizeAngle(angle: number): number {
  while (angle > Math.PI) angle -= 2 * Math.PI;
  while (angle < -Math.PI) angle += 2 * Math.PI;
  return angle;
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Project source image coordinate to viewport pixel
 *
 * @param srcX - Source image X coordinate (pixels)
 * @param srcY - Source image Y coordinate (pixels)
 * @param imageWidth - Source image width
 * @param imageHeight - Source image height
 * @param width - Viewport width
 * @param height - Viewport height
 * @param yaw - Camera yaw in radians
 * @param pitch - Camera pitch in radians
 * @param zoom - Zoom level
 * @param fov - Field of view in radians
 * @param projectionType - Projection type to use (default: STEREOGRAPHIC)
 * @returns Viewport pixel coordinate or null if outside viewport
 */
export function projectToViewport(
  srcX: number,
  srcY: number,
  imageWidth: number,
  imageHeight: number,
  width: number,
  height: number,
  yaw: number,
  pitch: number,
  zoom: number,
  fov: number,
  projectionType: ProjectionType = ProjectionType.STEREOGRAPHIC
): PixelCoord | null {
  // 1. Convert source pixel to spherical coordinates (lon/lat)
  const lon = (srcX / imageWidth) * 2 * Math.PI - Math.PI;
  const lat = (srcY / imageHeight) * Math.PI - Math.PI / 2;

  // 2. Apply inverse camera rotation
  let theta = lon - yaw;
  let phi = lat - pitch;

  // 3. Normalize to [-PI, PI]
  theta = normalizeAngle(theta);

  // 4. 计算宽高比并获取投影策略
  const aspectRatio = width / height;
  const strategy = getProjectionStrategy(projectionType);

  // 5. 投影角度到视口坐标
  const { nx, ny } = strategy.anglesToViewport(theta, phi, fov, aspectRatio);

  // 6. 检查可见性
  if (Math.abs(nx) > 1.2 || Math.abs(ny) > 1.2) {
    return null; // 超出视野
  }

  // 7. 应用缩放
  const zoomedNx = nx * zoom;
  const zoomedNy = ny * zoom;

  // 8. 转换为像素坐标
  const x = ((zoomedNx + 1) / 2) * width;
  const y = ((zoomedNy + 1) / 2) * height;

  // 9. 边界检查
  if (x < -100 || x > width + 100 || y < -100 || y > height + 100) {
    return null;
  }

  return { x, y };
}
