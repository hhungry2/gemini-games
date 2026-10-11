import { useLayoutEffect, useRef } from 'react';

/** Measure the Hub's available content area, including fullscreen and rotation. */
export function useGwViewport() {
  const viewportRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const device = viewport.querySelector<HTMLElement>('.gw-device');
    if (!device) return;
    const updateSize = () => {
      const maxWidth = Number.parseFloat(getComputedStyle(device).maxWidth) || Infinity;
      const availableWidth = Math.min(viewport.clientWidth - 8, maxWidth);
      const availableHeight = viewport.clientHeight - 8;
      device.style.width = `${availableWidth}px`;
      // Re-measure wrapped labels/controls as the shell narrows. The LCD ratio
      // remains fixed; only the actual room left for it determines its size.
      for (let attempt = 0; attempt < 6; attempt++) {
        const screens = [...device.querySelectorAll<HTMLElement>('.gw-lcd')].map(screen => screen.getBoundingClientRect());
        const shell = device.getBoundingClientRect();
        const columns = screens.length === 2 && Math.abs(screens[0].top - screens[1].top) < 8 ? 2 : 1;
        const screenHeight = columns === 2 ? Math.max(...screens.map(screen => screen.height)) : screens.reduce((sum, screen) => sum + screen.height, 0);
        if (screenHeight <= 0) break;
        const chrome = shell.height - screenHeight;
        const screenWidth = screens[0].width * columns;
        const width = Math.max(160, Math.min(availableWidth, shell.width - screenWidth + screenWidth * Math.max(0, availableHeight - chrome) / screenHeight));
        device.style.width = `${Math.floor(width)}px`;
        if (Math.abs(width - shell.width) < 1) break;
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, []);
  return viewportRef;
}
