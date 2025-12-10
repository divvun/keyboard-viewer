import { useSignal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type { KeyboardLayout } from "../types/keyboard-simple.ts";

interface UseKeyboardScalingOptions {
  layout: KeyboardLayout | null;
  onScaleChange?: (scale: number, scaledHeight: number) => void;
}

export function useKeyboardScaling({
  layout,
  onScaleChange,
}: UseKeyboardScalingOptions) {
  const scale = useSignal<number>(1);
  const scaledHeight = useSignal<number>(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const keyboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !layout) return;

    const calculateScale = () => {
      if (!containerRef.current || !keyboardRef.current) {
        return;
      }

      const containerWidth = containerRef.current.offsetWidth;
      const keyboardNaturalWidth = keyboardRef.current.scrollWidth;

      if (keyboardNaturalWidth === 0) {
        return;
      }

      // Calculate scale factor to fit keyboard in container
      // Add small buffer (0.98) to prevent horizontal scrollbar from rounding errors
      const scaleFactor = (containerWidth / keyboardNaturalWidth) * 0.98;

      // Clamp scale between 0.2 (minimum for small phones) and 1.0 (natural size, don't upscale)
      const clampedScale = Math.max(0.2, Math.min(scaleFactor, 1.0));

      scale.value = clampedScale;

      // Calculate and store the visual height after scaling
      const naturalHeight = keyboardRef.current.scrollHeight;
      const calculatedHeight = naturalHeight * clampedScale;
      scaledHeight.value = calculatedHeight;

      // Notify callback if provided
      if (onScaleChange) {
        requestAnimationFrame(() => {
          onScaleChange(clampedScale, calculatedHeight);
        });
      }
    };

    // Initial calculation after keyboard renders
    requestAnimationFrame(() => {
      calculateScale();
    });

    const resizeObserver = new ResizeObserver(() => {
      calculateScale();
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
    };
  }, [layout]);

  return {
    scale,
    scaledHeight,
    containerRef,
    keyboardRef,
  };
}
