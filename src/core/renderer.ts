/**
 * Fish-Eye Panorama Renderer
 * Framework-agnostic core for rendering equirectangular panoramas on canvas
 */

import type {
  ViewState,
  RendererConfig,
  RendererCallbacks,
  InputType,
  InputData,
  PanoramaLabel,
} from './types';
import { CONSTRAINTS, ProjectionType } from './types';
import {
  projectToSource,
  degToRad,
  radToDeg,
  clamp,
  normalizeAngle,
  getProjectionStrategy,
} from './projection';
import { LabelRenderer } from './labelRenderer';

/**
 * Main renderer class for fish-eye panorama viewing
 */
export class FishEyePanoramaRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private image: HTMLImageElement | null = null;
  private state: ViewState;
  private config: Required<RendererConfig>;
  private callbacks: RendererCallbacks;
  private animationFrameId: number | null = null;
  private isDirty = true;
  private dragStart: { x: number; y: number } | null = null;
  private _dragStartState: { yaw: number; pitch: number } | null = null;

  // Offscreen canvas for source image data
  private sourceCanvas: HTMLCanvasElement | null = null;
  private sourceCtx: CanvasRenderingContext2D | null = null;
  private sourceData: ImageData | null = null;

  // Label renderer
  private labelRenderer: LabelRenderer | null = null;

  // Projection type
  private projectionType: ProjectionType = ProjectionType.STEREOGRAPHIC;

  constructor(
    canvas: HTMLCanvasElement,
    config: RendererConfig = {},
    callbacks: RendererCallbacks = {}
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;

    // Apply default config
    this.config = {
      initialYaw: config.initialYaw ?? 0,
      initialPitch: config.initialPitch ?? 0,
      initialZoom: config.initialZoom ?? 1.0,
      minZoom: config.minZoom ?? CONSTRAINTS.DEFAULT_MIN_ZOOM,
      maxZoom: config.maxZoom ?? CONSTRAINTS.DEFAULT_MAX_ZOOM,
      fov: config.fov ?? CONSTRAINTS.DEFAULT_FOV,
      enableKeyboard: config.enableKeyboard ?? true,
      sensitivity: config.sensitivity ?? 0.5,
      projectionType: config.projectionType ?? ProjectionType.EQUIDISTANT,
    };

    this.callbacks = callbacks;

    // Initialize projection type (default to Stereographic for better experience)
    this.projectionType = this.config.projectionType;

    // Initialize state
    this.state = {
      yaw: this.config.initialYaw,
      pitch: clamp(this.config.initialPitch, CONSTRAINTS.MIN_PITCH, CONSTRAINTS.MAX_PITCH),
      zoom: clamp(this.config.initialZoom, this.config.minZoom, this.config.maxZoom),
      isDragging: false,
    };

    // Initialize label renderer
    this.labelRenderer = new LabelRenderer();

    this.setupEventListeners();
  }

  /**
   * Load a panoramic image
   */
  async loadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        // Validate image dimensions
        if (
          img.width < CONSTRAINTS.MIN_IMAGE_WIDTH ||
          img.height < CONSTRAINTS.MIN_IMAGE_HEIGHT
        ) {
          reject(
            new Error(
              `Image too small: ${img.width}x${img.height}. ` +
                `Minimum: ${CONSTRAINTS.MIN_IMAGE_WIDTH}x${CONSTRAINTS.MIN_IMAGE_HEIGHT}`
            )
          );
          return;
        }

        if (
          img.width > CONSTRAINTS.MAX_IMAGE_WIDTH ||
          img.height > CONSTRAINTS.MAX_IMAGE_HEIGHT
        ) {
          reject(
            new Error(
              `Image too large: ${img.width}x${img.height}. ` +
                `Maximum: ${CONSTRAINTS.MAX_IMAGE_WIDTH}x${CONSTRAINTS.MAX_IMAGE_HEIGHT}`
            )
          );
          return;
        }

        this.image = img;
        console.log('[FishEyePanoramaRenderer] Image loaded:', {
          width: img.width,
          height: img.height,
          aspectRatio: img.width / img.height
        });
        this.isDirty = true;
        this.render();

        if (this.callbacks.onLoad) {
          this.callbacks.onLoad();
        }

        resolve();
      };

      img.onerror = () => {
        // Provide detailed CORS error message
        let errorMsg = `Failed to load image: ${src}`;

        // Check if it might be a CORS issue
        if (src.startsWith('http://') || src.startsWith('https://')) {
          const hostname = new URL(src).hostname;
          errorMsg += `\n\nPossible causes:\n`;
          errorMsg += `1. CORS not configured on ${hostname}\n`;
          errorMsg += `2. Image doesn't exist or is inaccessible\n`;
          errorMsg += `3. Network connectivity issues\n\n`;
          errorMsg += `For OSS/AWS S3/CloudFront: Configure CORS rules to allow GET requests from your domain.`;
        }

        const error = new Error(errorMsg);
        if (this.callbacks.onError) {
          this.callbacks.onError(error);
        }
        reject(error);
      };

      img.src = src;
    });
  }

  /**
   * Main render loop
   */
  private render = (): void => {
    if (!this.isDirty || !this.image) {
      return;
    }

    const { width, height } = this.canvas;
    const { yaw, pitch, zoom } = this.state;
    const fov = degToRad(this.config.fov);

    // Clear canvas
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, width, height);

    // Create source canvas if needed (for full resolution source image)
    if (!this.sourceCanvas) {
      this.sourceCanvas = document.createElement('canvas');
      this.sourceCanvas.width = this.image.width;
      this.sourceCanvas.height = this.image.height;
      this.sourceCtx = this.sourceCanvas.getContext('2d', { willReadFrequently: true });
      if (!this.sourceCtx) {
        this.callbacks.onError?.(new Error('Failed to create source canvas context'));
        return;
      }
      // Draw image once and cache the data
      this.sourceCtx.drawImage(this.image, 0, 0);
      this.sourceData = this.sourceCtx.getImageData(0, 0, this.image.width, this.image.height);
    }

    // Get destination image data
    const imageData = this.ctx.createImageData(width, height);
    const dest = imageData.data;
    const source = this.sourceData!.data;

    const imageWidth = this.image.width;
    const imageHeight = this.image.height;

    // Render each pixel
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const sample = projectToSource(
          x,
          y,
          width,
          height,
          imageWidth,
          imageHeight,
          degToRad(yaw),
          degToRad(pitch),
          zoom,
          fov,
          this.projectionType
        );

        // Bilinear interpolation
        const srcX = Math.floor(sample.x);
        const srcY = Math.floor(sample.y);

        // Wrap x coordinate for horizontal wraparound
        const wrappedSrcX = ((srcX % imageWidth) + imageWidth) % imageWidth;
        const wrappedSrcY = Math.max(0, Math.min(imageHeight - 1, srcY));

        const destIndex = (y * width + x) * 4;
        const srcIndex = (wrappedSrcY * imageWidth + wrappedSrcX) * 4;

        dest[destIndex] = source[srcIndex];         // R
        dest[destIndex + 1] = source[srcIndex + 1]; // G
        dest[destIndex + 2] = source[srcIndex + 2]; // B
        dest[destIndex + 3] = 255;                  // A
      }
    }

    // Put image data to canvas
    this.ctx.putImageData(imageData, 0, 0);

    // Render labels
    if (this.labelRenderer) {
      console.log('[Renderer] Rendering labels with params:', {
        viewport: { width, height },
        image: { imageWidth, imageHeight },
        camera: { yaw, pitch, zoom, fov },
        projectionType: this.projectionType
      });
      this.labelRenderer.render(
        this.ctx,
        width,
        height,
        imageWidth,
        imageHeight,
        degToRad(yaw),
        degToRad(pitch),
        zoom,
        fov,
        this.projectionType
      );
    }

    this.isDirty = false;
  }

  /**
   * Schedule a render on the next animation frame
   */
  private scheduleRender(): void {
    if (this.animationFrameId !== null) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.render();
      this.animationFrameId = null;

      if (this.callbacks.onViewChange) {
        this.callbacks.onViewChange({ ...this.state });
      }
    });
  }

  /**
   * Mark render as dirty and schedule render
   */
  private markDirty(): void {
    this.isDirty = true;
    this.scheduleRender();
  }

  /**
   * Handle input events
   */
  handleInput(type: InputType, data: InputData): void {
    switch (type) {
      case 'mouse-down':
        this.handleMouseDown(data);
        break;
      case 'mouse-move':
        this.handleMouseMove(data);
        break;
      case 'mouse-up':
      case 'mouse-leave':
        this.handleMouseUp();
        break;
      case 'wheel':
        this.handleWheel(data);
        break;
      case 'touch-start':
        this.handleTouchStart(data);
        break;
      case 'touch-move':
        this.handleTouchMove(data);
        break;
      case 'touch-end':
        this.handleTouchEnd();
        break;
      case 'key-down':
        this.handleKeyDown(data);
        break;
    }
  }

  private handleMouseDown(data: InputData): void {
    if (data.x !== undefined && data.y !== undefined) {
      this.dragStart = { x: data.x, y: data.y };
      this._dragStartState = { yaw: this.state.yaw, pitch: this.state.pitch };
      this.state.isDragging = true;
    }
  }

  private handleMouseMove(data: InputData): void {
    if (!this.state.isDragging) {
      return;
    }

    if (data.dx !== undefined && data.dy !== undefined) {
      const baseSensitivity = this.config.sensitivity;

      // 获取投影策略以计算速度
      const strategy = getProjectionStrategy(this.projectionType);

      // 简化：使用中心点（可以改进为跟踪实际鼠标位置）
      const velocity = strategy.getDragVelocity(0, 0, baseSensitivity);

      // 应用速度调整后的移动
      this.state.yaw -= data.dx * velocity.x;
      this.state.pitch -= data.dy * velocity.y;

      // 限制 pitch
      this.state.pitch = clamp(
        this.state.pitch,
        CONSTRAINTS.MIN_PITCH,
        CONSTRAINTS.MAX_PITCH
      );

      // 归一化 yaw
      this.state.yaw = radToDeg(normalizeAngle(degToRad(this.state.yaw)));

      this.markDirty();
    }
  }

  private handleMouseUp(): void {
    this.state.isDragging = false;
    this.dragStart = null;
    this._dragStartState = null;
  }

  private handleWheel(data: InputData): void {
    if (data.deltaY !== undefined) {
      const zoomDelta = data.deltaY > 0 ? -0.1 : 0.1;
      this.state.zoom = clamp(
        this.state.zoom + zoomDelta,
        this.config.minZoom,
        this.config.maxZoom
      );
      this.markDirty();
    }
  }

  private handleTouchStart(data: InputData): void {
    if (data.touches && data.touches.length > 0) {
      const touch = data.touches[0];
      this.handleMouseDown({ x: touch.x, y: touch.y });
    }
  }

  private handleTouchMove(data: InputData): void {
    if (data.touches && data.touches.length > 0) {
      const touch = data.touches[0];
      if (this.dragStart) {
        const dx = touch.x - this.dragStart.x;
        const dy = touch.y - this.dragStart.y;
        this.handleMouseMove({ dx, dy });
        // Update drag start for relative movement
        this.dragStart = { x: touch.x, y: touch.y };
        this._dragStartState = { yaw: this.state.yaw, pitch: this.state.pitch };
      }
    }
  }

  private handleTouchEnd(): void {
    this.handleMouseUp();
  }

  private handleKeyDown(data: InputData): void {
    if (!this.config.enableKeyboard) {
      return;
    }

    const step = 5;
    let changed = false;

    switch (data.key) {
      case 'ArrowLeft':
        this.state.yaw -= step;
        changed = true;
        break;
      case 'ArrowRight':
        this.state.yaw += step;
        changed = true;
        break;
      case 'ArrowUp':
        this.state.pitch = Math.min(
          CONSTRAINTS.MAX_PITCH,
          this.state.pitch + step
        );
        changed = true;
        break;
      case 'ArrowDown':
        this.state.pitch = Math.max(
          CONSTRAINTS.MIN_PITCH,
          this.state.pitch - step
        );
        changed = true;
        break;
    }

    if (changed) {
      this.state.yaw = radToDeg(normalizeAngle(degToRad(this.state.yaw)));
      this.markDirty();
    }
  }

  /**
   * Set up event listeners
   */
  private setupEventListeners(): void {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => {
      this.handleInput('mouse-down', { x: e.clientX, y: e.clientY });
    });

    this.canvas.addEventListener('mousemove', (e) => {
      this.handleInput('mouse-move', { dx: e.movementX, dy: e.movementY });
    });

    this.canvas.addEventListener('mouseup', () => {
      this.handleInput('mouse-up', {});
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.handleInput('mouse-leave', {});
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.handleInput('wheel', { deltaY: e.deltaY });
    }, { passive: false });

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.handleInput('touch-start', {
        touches: [{ x: touch.clientX - rect.left, y: touch.clientY - rect.top }]
      });
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      const rect = this.canvas.getBoundingClientRect();
      this.handleInput('touch-move', {
        touches: [{ x: touch.clientX - rect.left, y: touch.clientY - rect.top }]
      });
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.handleInput('touch-end', {});
    });

    // Keyboard events
    if (this.config.enableKeyboard) {
      this.canvas.addEventListener('keydown', (e) => {
        this.handleInput('key-down', { key: e.key });
      });
      // Make canvas focusable for keyboard events
      this.canvas.tabIndex = 0;
    }
  }

  /**
   * Get current view state
   */
  getState(): Readonly<ViewState> {
    return { ...this.state };
  }

  /**
   * Set view state
   */
  setState(partialState: Partial<ViewState>): void {
    if (partialState.yaw !== undefined) {
      this.state.yaw = partialState.yaw;
    }
    if (partialState.pitch !== undefined) {
      this.state.pitch = clamp(
        partialState.pitch,
        CONSTRAINTS.MIN_PITCH,
        CONSTRAINTS.MAX_PITCH
      );
    }
    if (partialState.zoom !== undefined) {
      this.state.zoom = clamp(
        partialState.zoom,
        this.config.minZoom,
        this.config.maxZoom
      );
    }
    this.markDirty();
  }

  /**
   * Set labels for overlay rendering
   */
  setLabels(labels: PanoramaLabel[]): void {
    console.log('[FishEyePanoramaRenderer] setLabels called:', {
      labelCount: labels?.length || 0,
      labels: labels
    });
    if (this.labelRenderer) {
      this.labelRenderer.setLabels(labels);
      console.log('[FishEyePanoramaRenderer] Labels passed to labelRenderer');
      this.markDirty();
    } else {
      console.warn('[FishEyePanoramaRenderer] labelRenderer is null!');
    }
  }

  /**
   * Resize the canvas
   */
  resize(width: number, height: number): void {
    if (width < CONSTRAINTS.MIN_CANVAS_SIZE || height < CONSTRAINTS.MIN_CANVAS_SIZE) {
      throw new Error(
        `Canvas too small: ${width}x${height}. Minimum: ${CONSTRAINTS.MIN_CANVAS_SIZE}x${CONSTRAINTS.MIN_CANVAS_SIZE}`
      );
    }

    this.canvas.width = width;
    this.canvas.height = height;
    this.markDirty();
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // Clear the canvas and remove event listeners (safer for React)
    // Don't manipulate DOM - let React handle the canvas lifecycle
    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    // Remove all event listeners by cloning the canvas reference
    // This is safer than replacing the DOM node
    this.canvas = null as any;

    // Clean up source canvas
    if (this.sourceCanvas) {
      this.sourceCanvas.width = 1;
      this.sourceCanvas.height = 1;
      this.sourceCanvas = null;
      this.sourceCtx = null;
      this.sourceData = null;
    }

    // Clean up label renderer
    this.labelRenderer = null;
  }
}
