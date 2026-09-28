import React, { useEffect, useRef } from 'react';
import { useTheme } from '../../hooks/useTheme';

export const InteractiveGridBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse coordinates and smooth interpolated coordinates
    const targetMouse = { x: -2000, y: -2000, active: false };
    const currentMouse = { x: -2000, y: -2000 };
    const gridOffset = { x: 0, y: 0 };
    const targetGridOffset = { x: 0, y: 0 };

    const cellSize = 32;

    let isMoving = false;
    let idleTimer: NodeJS.Timeout | null = null;

    // Smooth theme transition interpolation (0 = light, 1 = dark)
    let currentThemeVal = theme === 'dark' ? 1 : 0;
    let targetThemeVal = theme === 'dark' ? 1 : 0;

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    const handleResize = () => {
      // Don't re-render/resize canvas if it's just the mobile address bar expanding/collapsing
      const newWidth = window.innerWidth;
      const newHeight = window.innerHeight;
      if (canvas.width > 0 && Math.abs(newWidth - width) < 2 && Math.abs(newHeight - height) < 90) {
        return;
      }

      const dpr = Math.min(window.devicePixelRatio || 1, isTouchDevice ? 1.5 : 2);
      width = newWidth;
      height = newHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.scale(dpr, dpr);
      render();
    };

    const handlePointerMove = (e: PointerEvent) => {
      targetMouse.x = e.clientX;
      targetMouse.y = e.clientY;
      targetMouse.active = true;

      // Subtle parallax target offset (grid moves smoothly as cursor moves)
      targetGridOffset.x = ((e.clientX - width / 2) / width) * (isTouchDevice ? 4 : 10);
      targetGridOffset.y = ((e.clientY - height / 2) / height) * (isTouchDevice ? 4 : 10);

      if (!isMoving) {
        isMoving = true;
        loop();
      }

      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        targetMouse.active = false;
      }, 3000);
    };

    const handlePointerLeave = () => {
      targetMouse.active = false;
      targetGridOffset.x = 0;
      targetGridOffset.y = 0;
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerLeave, { passive: true });
    window.addEventListener('pointercancel', handlePointerLeave, { passive: true });
    window.addEventListener('blur', handlePointerLeave);
    document.addEventListener('mouseleave', handlePointerLeave);

    handleResize();

    function render() {
      if (!ctx) return;

      // 1. Smoothly interpolated pure background (from #F9FAFB to #000000)
      const bgR = Math.round(249 * (1 - currentThemeVal));
      const bgG = Math.round(250 * (1 - currentThemeVal));
      const bgB = Math.round(251 * (1 - currentThemeVal));
      ctx.fillStyle = `rgb(${bgR}, ${bgG}, ${bgB})`;
      ctx.fillRect(0, 0, width, height);

      const offsetX = gridOffset.x % cellSize;
      const offsetY = gridOffset.y % cellSize;

      const startX = -cellSize + offsetX;
      const startY = -cellSize + offsetY;

      // 2. Base Grid Lines - Smoothly interpolated between light & dark
      ctx.lineWidth = 1;
      const lineVal = Math.round(255 * currentThemeVal);
      const lineAlpha = 0.055 + (0.065 - 0.055) * currentThemeVal;
      ctx.strokeStyle = `rgba(${lineVal}, ${lineVal}, ${lineVal}, ${lineAlpha})`;

      ctx.beginPath();
      for (let x = startX; x <= width + cellSize; x += cellSize) {
        const px = Math.floor(x) + 0.5;
        ctx.moveTo(px, 0);
        ctx.lineTo(px, height);
      }
      for (let y = startY; y <= height + cellSize; y += cellSize) {
        const py = Math.floor(y) + 0.5;
        ctx.moveTo(0, py);
        ctx.lineTo(width, py);
      }
      ctx.stroke();

      // 3. Architectural Blueprint Crosshair Highlight (Desktop mouse only)
      if (!isTouchDevice && targetMouse.active && currentMouse.x > -500) {
        const relX = currentMouse.x - offsetX;
        const colIndex = Math.round(relX / cellSize);
        const nearestLineX = Math.floor(colIndex * cellSize + offsetX) + 0.5;

        const relY = currentMouse.y - offsetY;
        const rowIndex = Math.round(relY / cellSize);
        const nearestLineY = Math.floor(rowIndex * cellSize + offsetY) + 0.5;

        const beamSpan = 140;

        // Vertical crosshair beam
        const vGrad = ctx.createLinearGradient(0, currentMouse.y - beamSpan, 0, currentMouse.y + beamSpan);
        const beamCenterAlpha = 0.16 + (0.22 - 0.16) * currentThemeVal;
        vGrad.addColorStop(0, 'rgba(128, 72, 168, 0)');
        vGrad.addColorStop(0.5, `rgba(168, 85, 247, ${beamCenterAlpha})`);
        vGrad.addColorStop(1, 'rgba(128, 72, 168, 0)');
        ctx.strokeStyle = vGrad;
        ctx.beginPath();
        ctx.moveTo(nearestLineX, Math.max(0, currentMouse.y - beamSpan));
        ctx.lineTo(nearestLineX, Math.min(height, currentMouse.y + beamSpan));
        ctx.stroke();

        // Horizontal crosshair beam
        const hGrad = ctx.createLinearGradient(currentMouse.x - beamSpan, 0, currentMouse.x + beamSpan, 0);
        hGrad.addColorStop(0, 'rgba(128, 72, 168, 0)');
        hGrad.addColorStop(0.5, `rgba(168, 85, 247, ${beamCenterAlpha})`);
        hGrad.addColorStop(1, 'rgba(128, 72, 168, 0)');
        ctx.strokeStyle = hGrad;
        ctx.beginPath();
        ctx.moveTo(Math.max(0, currentMouse.x - beamSpan), nearestLineY);
        ctx.lineTo(Math.min(width, currentMouse.x + beamSpan), nearestLineY);
        ctx.stroke();

        // Active grid cell subtle highlight
        const cellLeft = Math.floor((currentMouse.x - offsetX) / cellSize) * cellSize + offsetX;
        const cellTop = Math.floor((currentMouse.y - offsetY) / cellSize) * cellSize + offsetY;
        const cellAlpha = 0.04 + (0.06 - 0.04) * currentThemeVal;
        ctx.fillStyle = `rgba(128, 72, 168, ${cellAlpha})`;
        ctx.fillRect(cellLeft, cellTop, cellSize, cellSize);
      }

      // 4. Centered Grid Dots (Smooth Gaussian illumination + smooth theme fade)
      const dotHalf = cellSize / 2;
      const baseDotVal = Math.round(255 * currentThemeVal);
      const baseDotAlpha = 0.15 + (0.20 - 0.15) * currentThemeVal;

      for (let x = startX; x <= width + cellSize; x += cellSize) {
        for (let y = startY; y <= height + cellSize; y += cellSize) {
          const originX = x + dotHalf;
          const originY = y + dotHalf;

          let dotRadius = 1;
          let dotColor = `rgba(${baseDotVal}, ${baseDotVal}, ${baseDotVal}, ${baseDotAlpha})`;

          if (targetMouse.active && currentMouse.x > -500) {
            const dx = originX - currentMouse.x;
            const dy = originY - currentMouse.y;
            const dist = Math.hypot(dx, dy);

            if (dist < 180) {
              const sigma = 65;
              const gauss = Math.exp(-(dist * dist) / (2 * sigma * sigma));

              if (gauss > 0.01) {
                dotRadius = 1 + gauss * 0.9;

                if (gauss > 0.35) {
                  const isGold = (Math.round(x / cellSize) + Math.round(y / cellSize)) % 3 === 0;
                  if (isGold) {
                    dotColor = currentThemeVal > 0.5
                      ? `rgba(245, 158, 81, ${0.35 + gauss * 0.6})`
                      : `rgba(217, 119, 6, ${0.35 + gauss * 0.6})`;
                  } else {
                    dotColor = currentThemeVal > 0.5
                      ? `rgba(168, 85, 247, ${0.35 + gauss * 0.6})`
                      : `rgba(128, 72, 168, ${0.35 + gauss * 0.6})`;
                  }
                } else {
                  dotColor = `rgba(${baseDotVal}, ${baseDotVal}, ${baseDotVal}, ${baseDotAlpha + gauss * 0.6})`;
                }
              }
            }
          }

          ctx.beginPath();
          ctx.arc(originX, originY, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = dotColor;
          ctx.fill();
        }
      }
    }

    function loop() {
      // Smooth interpolation for cursor tracking
      const dx = targetMouse.x - currentMouse.x;
      const dy = targetMouse.y - currentMouse.y;
      currentMouse.x += dx * 0.18;
      currentMouse.y += dy * 0.18;

      // Smooth interpolation for parallax grid shift
      gridOffset.x += (targetGridOffset.x - gridOffset.x) * 0.12;
      gridOffset.y += (targetGridOffset.y - gridOffset.y) * 0.12;

      // Smooth interpolation for theme change
      const themeDiff = targetThemeVal - currentThemeVal;
      currentThemeVal += themeDiff * 0.10;

      render();

      const dist = Math.hypot(dx, dy);
      const offsetDist = Math.hypot(
        targetGridOffset.x - gridOffset.x,
        targetGridOffset.y - gridOffset.y
      );
      const isThemeChanging = Math.abs(themeDiff) > 0.005;

      if (dist > 0.2 || offsetDist > 0.05 || targetMouse.active || isThemeChanging) {
        animationFrameId = requestAnimationFrame(loop);
      } else {
        currentThemeVal = targetThemeVal;
        isMoving = false;
      }
    }

    // When theme prop changes, smoothly animate to the new theme
    targetThemeVal = theme === 'dark' ? 1 : 0;
    if (!isMoving) {
      isMoving = true;
      loop();
    }

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (idleTimer) clearTimeout(idleTimer);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerdown', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerLeave);
      window.removeEventListener('pointercancel', handlePointerLeave);
      window.removeEventListener('blur', handlePointerLeave);
      document.removeEventListener('mouseleave', handlePointerLeave);
    };
  }, [theme]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 select-none block"
      style={{
        width: '100%',
        height: '100%',
      }}
    />
  );
};
