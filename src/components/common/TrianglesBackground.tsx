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
  'rgba(255, 102, 171, ',  // osu-web primary pink (--hsl-p)
  'rgba(90, 70, 80, ',     // osu-web warm surface (--hsl-b1)
  'rgba(136, 102, 238, ',  // osu-web purple
  'rgba(255, 255, 255, ',  // subtle highlight
];

/**
 * Faithful port of osu! / osu-web background triangles on --hsl-b6 (#1c1719).
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
    const count = Math.floor((width * height) / 26000);
    const triangles: Triangle[] = [];

    for (let i = 0; i < count; i++) {
      triangles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 35 + Math.random() * 75,
        speed: 0.2 + Math.random() * 0.55,
        alpha: 0.02 + Math.random() * 0.045,
        color: TRIANGLE_COLORS[Math.floor(Math.random() * TRIANGLE_COLORS.length)],
      });
    }

    const draw = () => {
      // Authentic osu-web --hsl-b6 charcoal-magenta background
      const grad = ctx.createLinearGradient(0, 0, 0, height);
      grad.addColorStop(0, '#20191d');
      grad.addColorStop(0.4, '#1c1719');
      grad.addColorStop(1, '#161214');
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
