import React, { useEffect, useRef } from 'react';

interface Triangle {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
  color: string;
}

const TRIANGLE_COLORS = [
  'rgba(255, 102, 170, ',  // osu-pink
  'rgba(0, 216, 255, ',    // osu-cyan
  'rgba(155, 89, 182, ',   // osu-purple
  'rgba(255, 255, 255, ',  // white
];

/**
 * Faithful port of osu.Game.Graphics.Backgrounds.Triangles from ppy/osu.
 * Renders the iconic upward-drifting pastel triangles on a deep violet background.
 */
export const TrianglesBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Initialize triangles
    const count = Math.floor((width * height) / 22000);
    const triangles: Triangle[] = [];

    for (let i = 0; i < count; i++) {
      triangles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 30 + Math.random() * 80,
        speed: 0.3 + Math.random() * 0.8,
        alpha: 0.03 + Math.random() * 0.08,
        color: TRIANGLE_COLORS[Math.floor(Math.random() * TRIANGLE_COLORS.length)],
      });
    }

    const draw = () => {
      // Deep purple/violet background gradient
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#1c1024');
      grad.addColorStop(0.5, '#160b1e');
      grad.addColorStop(1, '#0e0714');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw each triangle (equilateral, pointing upwards)
      for (let i = 0; i < triangles.length; i++) {
        const t = triangles[i];

        // Move upward
        t.y -= t.speed;
        if (t.y + t.size < 0) {
          t.y = height + t.size;
          t.x = Math.random() * width;
        }

        ctx.beginPath();
        const halfSize = t.size / 2;
        const heightTriangle = (Math.sqrt(3) / 2) * t.size;

        ctx.moveTo(t.x, t.y - heightTriangle / 2);
        ctx.lineTo(t.x - halfSize, t.y + heightTriangle / 2);
        ctx.lineTo(t.x + halfSize, t.y + heightTriangle / 2);
        ctx.closePath();

        ctx.fillStyle = `${t.color}${t.alpha})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-80"
    />
  );
};
