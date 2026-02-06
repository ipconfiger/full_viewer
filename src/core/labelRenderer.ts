/**
 * Label Renderer
 * Renders overlay labels on panorama
 */

import type { PanoramaLabel } from './types';
import { ProjectionType } from './types';
import { projectToViewport } from './projection';

/**
 * Renders labels on panorama canvas
 */
export class LabelRenderer {
  private labels: PanoramaLabel[] = [];

  setLabels(labels: PanoramaLabel[]): void {
    this.labels = labels;
  }

  render(
    ctx: CanvasRenderingContext2D,
    viewportWidth: number,
    viewportHeight: number,
    imageWidth: number,
    imageHeight: number,
    yaw: number,
    pitch: number,
    zoom: number,
    fov: number,
    projectionType: ProjectionType = ProjectionType.STEREOGRAPHIC
  ): void {
    console.log('[LabelRenderer] render() called with', {
      labelCount: this.labels.length,
      labels: this.labels,
      viewport: { viewportWidth, viewportHeight },
      image: { imageWidth, imageHeight },
      camera: { yaw, pitch, zoom, fov },
      projectionType
    });

    // Fixed style
    const fillColor = 'rgba(255, 200, 0, 0.3)';
    const strokeColor = 'rgba(255, 200, 0, 0.8)';
    const textColor = '#ffffff';
    const fontSize = 14;

    for (const label of this.labels) {
      console.log('[LabelRenderer] Processing label:', label);

      // Project the four corners of the label
      const corners = [
        { x: label.x, y: label.y },
        { x: label.x + label.w, y: label.y },
        { x: label.x, y: label.y + label.h },
        { x: label.x + label.w, y: label.y + label.h },
      ];

      const projectedCorners = corners.map(corner =>
        projectToViewport(
          corner.x, corner.y,
          imageWidth, imageHeight,
          viewportWidth, viewportHeight,
          yaw, pitch, zoom, fov,
          projectionType
        )
      );

      console.log('[LabelRenderer] Projected corners:', {
        label,
        projectedCorners
      });

      // Check if at least one corner is visible
      const visibleCorners = projectedCorners.filter(c => c !== null);
      if (visibleCorners.length === 0) {
        console.log('[LabelRenderer] Label not visible, skipping');
        continue; // Label completely invisible
      }

      // Calculate viewport bounding box
      const xs = visibleCorners.map(c => c!.x);
      const ys = visibleCorners.map(c => c!.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const rectX = minX;
      const rectY = minY;
      const rectW = maxX - minX;
      const rectH = maxY - minY;

      console.log('[LabelRenderer] Drawing rect:', { rectX, rectY, rectW, rectH });

      // Draw semi-transparent rectangle
      ctx.fillStyle = fillColor;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = 2;

      ctx.fillRect(rectX, rectY, rectW, rectH);
      ctx.strokeRect(rectX, rectY, rectW, rectH);

      // Draw title (if present and box is large enough)
      if (label.title && rectW > 50 && rectH > 20) {
        ctx.fillStyle = textColor;
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label.title, rectX + rectW / 2, rectY + rectH / 2);
      }
    }
  }
}
