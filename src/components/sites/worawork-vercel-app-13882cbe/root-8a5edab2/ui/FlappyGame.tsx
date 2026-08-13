"use client";

import { useEffect, useRef } from "react";
import { ICON_WORAWORK_LOGO } from "../assetPaths";

const CANVAS_W = 360;
const CANVAS_H = 520;
const GROUND_H = 26;
const PLAY_H = CANVAS_H - GROUND_H;
const GRAVITY = 1500;
const FLAP_VELOCITY = -420;
const BIRD_X = 70;
const BIRD_R = 16;
const PIPE_WIDTH = 56;
const PIPE_CAP_H = 14;
const PIPE_GAP = 150;
const PIPE_SPEED = 170;
const PIPE_SPACING = 210;
const PIPE_MARGIN = 70;

const CLOUDS = [
  { x: 40, y: 60, r: 22 },
  { x: 150, y: 40, r: 15 },
  { x: 270, y: 85, r: 26 },
  { x: 330, y: 45, r: 13 },
  { x: 200, y: 130, r: 12 },
];

interface Pipe {
  x: number;
  gapY: number;
  scored: boolean;
}

// Bird treated as a circle, pipes as rects — close enough for a casual game,
// no physics library needed for one collision shape pair.
function rectOverlapsCircle(
  rectX: number,
  rectY: number,
  rectW: number,
  rectH: number,
  cx: number,
  cy: number,
  r: number
): boolean {
  const closestX = Math.max(rectX, Math.min(cx, rectX + rectW));
  const closestY = Math.max(rectY, Math.min(cy, rectY + rectH));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function FlappyGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const birdImgRef = useRef<HTMLImageElement | null>(null);

  const phaseRef = useRef<"ready" | "playing" | "over">("ready");
  const birdYRef = useRef(PLAY_H / 2);
  const birdVYRef = useRef(0);
  const birdRotRef = useRef(0);
  const pipesRef = useRef<Pipe[]>([]);
  const scoreRef = useRef(0);
  const bestRef = useRef(0);
  const groundOffsetRef = useRef(0);

  const reset = () => {
    birdYRef.current = PLAY_H / 2;
    birdVYRef.current = 0;
    birdRotRef.current = 0;
    scoreRef.current = 0;
    pipesRef.current = [{ x: CANVAS_W + 60, gapY: PLAY_H / 2, scored: false }];
  };

  const flap = () => {
    if (phaseRef.current !== "playing") {
      reset();
      phaseRef.current = "playing";
    }
    birdVYRef.current = FLAP_VELOCITY;
  };

  useEffect(() => {
    const img = new Image();
    img.src = ICON_WORAWORK_LOGO;
    birdImgRef.current = img;
    reset();

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    let raf = 0;
    let last = performance.now();

    const skyGradient = ctx.createLinearGradient(0, 0, 0, PLAY_H);
    skyGradient.addColorStop(0, "#f7d9a3");
    skyGradient.addColorStop(1, "#e2a25e");

    const spawnPipeIfNeeded = () => {
      const pipes = pipesRef.current;
      const rightmost = pipes.length ? pipes[pipes.length - 1].x : -Infinity;
      if (rightmost < CANVAS_W - PIPE_SPACING) {
        const gapY = PIPE_MARGIN + Math.random() * (PLAY_H - PIPE_MARGIN * 2);
        pipes.push({ x: CANVAS_W + PIPE_WIDTH, gapY, scored: false });
      }
    };

    const step = (now: number) => {
      const dt = Math.min((now - last) / 1000, 1 / 30);
      last = now;

      if (phaseRef.current === "playing") {
        birdVYRef.current += GRAVITY * dt;
        birdYRef.current += birdVYRef.current * dt;
        birdRotRef.current = Math.max(-0.5, Math.min(1.1, birdVYRef.current / 500));
        groundOffsetRef.current = (groundOffsetRef.current + PIPE_SPEED * dt) % 24;

        const pipes = pipesRef.current;
        for (const p of pipes) p.x -= PIPE_SPEED * dt;
        while (pipes.length && pipes[0].x < -PIPE_WIDTH) pipes.shift();
        spawnPipeIfNeeded();

        for (const p of pipes) {
          if (!p.scored && p.x + PIPE_WIDTH < BIRD_X - BIRD_R) {
            p.scored = true;
            scoreRef.current += 1;
          }
        }

        let hit = birdYRef.current - BIRD_R < 0 || birdYRef.current + BIRD_R > PLAY_H;
        if (!hit) {
          for (const p of pipes) {
            if (p.x < BIRD_X + BIRD_R && p.x + PIPE_WIDTH > BIRD_X - BIRD_R) {
              const gapTop = p.gapY - PIPE_GAP / 2;
              const gapBottom = p.gapY + PIPE_GAP / 2;
              if (
                rectOverlapsCircle(p.x, 0, PIPE_WIDTH, gapTop, BIRD_X, birdYRef.current, BIRD_R) ||
                rectOverlapsCircle(p.x, gapBottom, PIPE_WIDTH, CANVAS_H - gapBottom, BIRD_X, birdYRef.current, BIRD_R)
              ) {
                hit = true;
                break;
              }
            }
          }
        }
        if (hit) {
          phaseRef.current = "over";
          bestRef.current = Math.max(bestRef.current, scoreRef.current);
        }
      }

      // Sky + drifting clouds
      ctx.fillStyle = skyGradient;
      ctx.fillRect(0, 0, CANVAS_W, PLAY_H);
      ctx.fillStyle = "rgba(255, 246, 226, 0.75)";
      for (const c of CLOUDS) {
        ctx.beginPath();
        ctx.ellipse(c.x, c.y, c.r, c.r * 0.65, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      // Pipes: shaft with a cylindrical gradient + a darker cap band at the gap edge
      for (const p of pipesRef.current) {
        const gapTop = p.gapY - PIPE_GAP / 2;
        const gapBottom = p.gapY + PIPE_GAP / 2;
        const pipeGradient = ctx.createLinearGradient(p.x, 0, p.x + PIPE_WIDTH, 0);
        pipeGradient.addColorStop(0, "#e0a868");
        pipeGradient.addColorStop(0.5, "#a9772f");
        pipeGradient.addColorStop(1, "#e0a868");
        ctx.fillStyle = pipeGradient;
        ctx.strokeStyle = "#6b4a2b";
        ctx.lineWidth = 3;

        ctx.fillRect(p.x, 0, PIPE_WIDTH, gapTop);
        ctx.strokeRect(p.x, 0, PIPE_WIDTH, gapTop);
        ctx.fillRect(p.x, gapBottom, PIPE_WIDTH, CANVAS_H - gapBottom);
        ctx.strokeRect(p.x, gapBottom, PIPE_WIDTH, CANVAS_H - gapBottom);

        ctx.fillStyle = "#8a5f36";
        const topCapY = Math.max(0, gapTop - PIPE_CAP_H);
        ctx.fillRect(p.x, topCapY, PIPE_WIDTH, gapTop - topCapY);
        ctx.strokeRect(p.x, topCapY, PIPE_WIDTH, gapTop - topCapY);
        const bottomCapH = Math.min(PIPE_CAP_H, CANVAS_H - gapBottom);
        ctx.fillRect(p.x, gapBottom, PIPE_WIDTH, bottomCapH);
        ctx.strokeRect(p.x, gapBottom, PIPE_WIDTH, bottomCapH);
      }

      // Ground strip: grass edge + scrolling dirt ticks
      ctx.fillStyle = "#8bbf5e";
      ctx.fillRect(0, PLAY_H, CANVAS_W, 6);
      ctx.fillStyle = "#6b4a2b";
      ctx.fillRect(0, PLAY_H + 6, CANVAS_W, GROUND_H - 6);
      ctx.strokeStyle = "rgba(255, 246, 226, 0.35)";
      ctx.lineWidth = 2;
      for (let x = -groundOffsetRef.current; x < CANVAS_W; x += 24) {
        ctx.beginPath();
        ctx.moveTo(x, PLAY_H + 10);
        ctx.lineTo(x + 10, PLAY_H + 10);
        ctx.stroke();
      }

      // Bird — cream badge behind the logo so it pops against the sky
      ctx.save();
      ctx.translate(BIRD_X, birdYRef.current);
      ctx.rotate(birdRotRef.current);
      ctx.fillStyle = "#fff6e2";
      ctx.strokeStyle = "#6b4a2b";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R + 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      if (birdImgRef.current?.complete) {
        ctx.drawImage(birdImgRef.current, -BIRD_R, -BIRD_R, BIRD_R * 2, BIRD_R * 2);
      }
      ctx.restore();

      // Score pill
      const scoreText = String(scoreRef.current);
      ctx.font = "bold 24px Coiny, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const pillW = Math.max(48, ctx.measureText(scoreText).width + 32);
      roundedRectPath(ctx, CANVAS_W / 2 - pillW / 2, 16, pillW, 40, 20);
      ctx.fillStyle = "#fbe0ac";
      ctx.fill();
      ctx.strokeStyle = "#6b4a2b";
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = "#5c3d22";
      ctx.fillText(scoreText, CANVAS_W / 2, 38);

      if (phaseRef.current !== "playing") {
        ctx.fillStyle = "rgba(40, 26, 12, 0.5)";
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        const cardW = 280;
        const cardH = phaseRef.current === "over" ? 190 : 150;
        const cardX = CANVAS_W / 2 - cardW / 2;
        const cardY = CANVAS_H / 2 - cardH / 2;
        roundedRectPath(ctx, cardX, cardY, cardW, cardH, 22);
        ctx.fillStyle = "#fbe0ac";
        ctx.fill();
        ctx.strokeStyle = "#6b4a2b";
        ctx.lineWidth = 3;
        ctx.stroke();

        let y = cardY + 40;
        ctx.fillStyle = "#5c3d22";
        ctx.font = "bold 22px Coiny, sans-serif";
        ctx.fillText(phaseRef.current === "over" ? "Game Over" : "Flappy WoraWork", CANVAS_W / 2, y);

        if (phaseRef.current === "over") {
          y += 40;
          ctx.font = "16px Coiny, sans-serif";
          ctx.fillText(`Score ${scoreRef.current} · Best ${bestRef.current}`, CANVAS_W / 2, y);
        }

        y = cardY + cardH - 34;
        const hint = `Click or press Space to ${phaseRef.current === "over" ? "retry" : "start"}`;
        ctx.font = "13px system-ui, sans-serif";
        const hintW = Math.max(160, ctx.measureText(hint).width + 28);
        roundedRectPath(ctx, CANVAS_W / 2 - hintW / 2, y - 16, hintW, 32, 16);
        ctx.fillStyle = "#f6dfae";
        ctx.fill();
        ctx.strokeStyle = "#a9772f";
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = "#6b4a2b";
        ctx.fillText(hint, CANVAS_W / 2, y);
      }

      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);

    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="ww-flappy">
      <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H} className="ww-flappy-canvas" onClick={flap} />
    </div>
  );
}
