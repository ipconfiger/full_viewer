import { useState, useEffect, useRef, useCallback } from 'react';
import { useFishEyePanorama } from './react';
import { parseUrlParams, isValidImageUrl } from './utils/urlParams';
import './App.css';

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="error-message">
      <svg className="error-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
        <circle cx="12" cy="16" r="1" fill="currentColor"/>
      </svg>
      <p>{message}</p>
    </div>
  );
}

function LoadingIndicator() {
  return (
    <div className="loading-indicator">
      <div className="spinner"></div>
      <p>Loading panorama...</p>
    </div>
  );
}

function debounce(func: () => void, wait: number): () => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(func, wait);
  };
}

function App() {
  const params = parseUrlParams();
  console.log('[App] URL params parsed:', {
    src: params.src,
    labels: params.labels,
    projection: params.projection,
    labelsCount: params.labels?.length
  });
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Error handling
  if (!params.src) {
    return <ErrorMessage message="Error: Image URL (src) is required" />;
  }

  if (!isValidImageUrl(params.src)) {
    return <ErrorMessage message="Error: Invalid image URL format" />;
  }

  // Handle image load errors
  const handleError = useCallback((error: Error) => {
    console.error('Panorama load error:', error);
    setLoadError(`Error: Failed to load image - ${error.message}`);
  }, []);

  // Initialize panorama hook
  const { canvasRef, loading, error } = useFishEyePanorama({
    src: params.src,
    width: dimensions.width,
    height: dimensions.height,
    labels: params.labels,
    projectionType: params.projection,
    initialYaw: params.initialYaw,
    initialPitch: params.initialPitch,
    initialZoom: params.initialZoom,
    minZoom: params.minZoom,
    maxZoom: params.maxZoom,
    enableKeyboard: true,
    onError: handleError,
  });

  // Responsive dimensions with ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const width = Math.max(Math.floor(rect.width), 100);
        const height = Math.max(Math.floor(rect.height), 100);

        setDimensions({ width, height });
      }
    };

    const debouncedUpdate = debounce(updateDimensions, 100);

    const resizeObserver = new ResizeObserver(() => {
      debouncedUpdate();
    });

    // Initial measurement
    updateDimensions();

    // Observe container
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  if (loadError) {
    return <ErrorMessage message={loadError} />;
  }

  return (
    <div ref={containerRef} className="embed-container">
      {loading && <LoadingIndicator />}
      {error && <ErrorMessage message={`Error: ${error.message}`} />}
      <canvas ref={canvasRef} />
    </div>
  );
}

export default App;
