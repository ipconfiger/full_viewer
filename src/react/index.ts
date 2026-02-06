/**
 * fisheye-panorama-embed/react
 *
 * React wrapper for fish-eye panorama viewer
 * (Inlined from @fisheye-panorama/react)
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { FishEyePanoramaRenderer, type ViewState, type RendererConfig, type PanoramaLabel, ProjectionType } from '../core';

export interface UseFishEyePanoramaOptions {
  src: string;
  width: number;
  height: number;
  initialYaw?: number;
  initialPitch?: number;
  initialZoom?: number;
  minZoom?: number;
  maxZoom?: number;
  labels?: PanoramaLabel[];
  projectionType?: ProjectionType;
  enableKeyboard?: boolean;
  sensitivity?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  onViewChange?: (state: ViewState) => void;
}

export interface UseFishEyePanoramaReturn {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  viewState: ViewState | null;
  loading: boolean;
  error: Error | null;
  loadImage: (src: string) => Promise<void>;
}

/**
 * React hook for fish-eye panorama viewer
 */
export function useFishEyePanorama(
  options: UseFishEyePanoramaOptions
): UseFishEyePanoramaReturn {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [viewState, setViewState] = useState<ViewState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const rendererRef = useRef<FishEyePanoramaRenderer | null>(null);

  const config: RendererConfig = {
    initialYaw: options.initialYaw,
    initialPitch: options.initialPitch,
    initialZoom: options.initialZoom,
    minZoom: options.minZoom,
    maxZoom: options.maxZoom,
    projectionType: options.projectionType,
    enableKeyboard: options.enableKeyboard,
    sensitivity: options.sensitivity,
  };

  const loadImage = useCallback(async (src: string) => {
    const renderer = rendererRef.current;
    if (!renderer) return;

    setLoading(true);
    setError(null);
    try {
      await renderer.loadImage(src);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initialize renderer on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const renderer = new FishEyePanoramaRenderer(
        canvas,
        config,
        {
          onLoad: () => {
            setLoading(false);
            options.onLoad?.();
          },
          onError: (err: Error) => {
            setError(err);
            setLoading(false);
            options.onError?.(err);
          },
          onViewChange: (state: ViewState) => {
            setViewState(state);
            options.onViewChange?.(state);
          },
        }
      );

      rendererRef.current = renderer;

      // Set canvas size
      canvas.width = options.width;
      canvas.height = options.height;

      // Set initial labels
      if (options.labels) {
        renderer.setLabels(options.labels);
      }

      // Load initial image
      loadImage(options.src);
    } catch (err) {
      setError(err as Error);
    }

    // Cleanup on unmount
    return () => {
      rendererRef.current?.destroy();
      rendererRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Watch for src changes
  useEffect(() => {
    loadImage(options.src);
  }, [options.src, loadImage]);

  // Watch for size changes
  useEffect(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    if (renderer && canvas) {
      canvas.width = options.width;
      canvas.height = options.height;
      renderer.resize(options.width, options.height);
    }
  }, [options.width, options.height]);

  // Watch for labels changes
  useEffect(() => {
    const renderer = rendererRef.current;
    console.log('[useFishEyePanorama] Labels changed:', {
      hasRenderer: !!renderer,
      labels: options.labels
    });
    if (renderer && options.labels) {
      console.log('[useFishEyePanorama] Setting labels on renderer:', options.labels);
      renderer.setLabels(options.labels);
    }
  }, [options.labels]);

  return {
    canvasRef,
    viewState,
    loading,
    error,
    loadImage,
  };
}

// Re-export types from core
export type { ViewState, RendererConfig, RendererCallbacks, PanoramaLabel } from '../core';
export { FishEyePanoramaRenderer, ProjectionType } from '../core';
