// Canvas rendering for threads, bows, knots, and frayed ends
// Twisted-ply twine rendering for photorealistic kitchen string look

// ─── Color helpers ──────────────────────────────────────────

function parseHex(hex) {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function toHex(r, g, b) {
  const clamp = v => Math.max(0, Math.min(255, Math.round(v)));
  return '#' + [r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('');
}

function lightenColor(hex, amount) {
  const [r, g, b] = parseHex(hex);
  return toHex(
    r + (255 - r) * amount,
    g + (255 - g) * amount,
    b + (255 - b) * amount,
  );
}

function darkenColor(hex, amount) {
  const [r, g, b] = parseHex(hex);
  return toHex(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

// ─── Path resampling ────────────────────────────────────────

function resamplePath(points, step = 3) {
  const path = [];
  if (points.length < 2) return path;

  // Build the same quadratic bezier curve used for rendering
  // and sample it at regular intervals
  const segments = [];

  // First point
  segments.push({ x: points[0].x, y: points[0].y });

  // Intermediate bezier segments
  for (let i = 1; i < points.length - 1; i++) {
    const p0 = i === 1 ? points[0] : {
      x: (points[i - 1].x + points[i].x) / 2,
      y: (points[i - 1].y + points[i].y) / 2,
    };
    const p1 = points[i]; // control point
    const p2 = {
      x: (points[i].x + points[i + 1].x) / 2,
      y: (points[i].y + points[i + 1].y) / 2,
    };

    // Sample this quadratic bezier
    const segLen = Math.sqrt((p2.x - p0.x) ** 2 + (p2.y - p0.y) ** 2);
    const steps = Math.max(2, Math.ceil(segLen / step));
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const mt = 1 - t;
      segments.push({
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y,
      });
    }
  }

  // Last point
  const last = points[points.length - 1];
  segments.push({ x: last.x, y: last.y });

  // Compute cumulative arc length
  let arcLen = 0;
  for (let i = 0; i < segments.length; i++) {
    if (i > 0) {
      const dx = segments[i].x - segments[i - 1].x;
      const dy = segments[i].y - segments[i - 1].y;
      arcLen += Math.sqrt(dx * dx + dy * dy);
    }
    path.push({ x: segments[i].x, y: segments[i].y, t: arcLen });
  }

  return path;
}

function computeNormal(path, i) {
  let dx, dy;
  if (i === 0) {
    dx = path[1].x - path[0].x;
    dy = path[1].y - path[0].y;
  } else if (i === path.length - 1) {
    dx = path[i].x - path[i - 1].x;
    dy = path[i].y - path[i - 1].y;
  } else {
    dx = path[i + 1].x - path[i - 1].x;
    dy = path[i + 1].y - path[i - 1].y;
  }
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Perpendicular: rotate tangent 90 degrees
  return { x: -dy / len, y: dx / len };
}

// ─── Main thread drawing ────────────────────────────────────

export function drawThread(ctx, points, color, thickness, status, opacity = 1) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opacity;

  // Resample path at high resolution
  const path = resamplePath(points, 3);
  if (path.length < 2) { ctx.restore(); return; }

  // ── Drop shadow for 3D roundness ──
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.01)';
  ctx.lineWidth = thickness * 1.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.35)';
  ctx.shadowBlur = thickness * 2;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  // ── Twisted ply rendering ──
  const TWIST_FREQ = 0.35; // radians per pixel of arc length
  const RADIUS = thickness * 0.35;
  const PLY_WIDTH = thickness * 0.5;
  const phases = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];
  const colors = [
    darkenColor(color, 0.20),  // shadow ply (drawn first, behind)
    color,                      // mid ply
    lightenColor(color, 0.18),  // highlight ply (drawn last, in front)
  ];

  // Draw back-to-front for natural occlusion at crossings
  for (let s = 0; s < 3; s++) {
    ctx.beginPath();
    ctx.strokeStyle = colors[s];
    ctx.lineWidth = PLY_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < path.length; i++) {
      const n = computeNormal(path, i);
      const t = path[i].t;
      // Ply offset with micro-noise for organic feel
      const noise = Math.sin(t * 17.3) * Math.cos(t * 23.7) * 0.3;
      const offset = Math.sin(t * TWIST_FREQ + phases[s]) * RADIUS + noise;
      // Subtle opacity variation along the ply (fiber texture)
      ctx.globalAlpha = opacity * (0.85 + Math.sin(t * 7 + phases[s]) * 0.15);

      const px = path[i].x + n.x * offset;
      const py = path[i].y + n.y * offset;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  ctx.globalAlpha = opacity;

  // ── Status decorations ──
  if (status === 'loose') {
    drawFrayedEnd(ctx, points, color, thickness);
  } else if (status === 'knotted') {
    drawKnot(ctx, points, color, thickness);
  } else if (status === 'bowed') {
    drawBow(ctx, points, color, thickness);
  }

  ctx.restore();
}

// ─── Status decorations (unchanged) ─────────────────────────

function drawFrayedEnd(ctx, points, color, thickness) {
  const top = points[points.length - 1];
  const prev = points[points.length - 2];
  const angle = Math.atan2(top.y - prev.y, top.x - prev.x);
  const frayCount = 4;
  const frayLen = 8 + thickness * 2;

  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, thickness * 0.6);
  ctx.lineCap = 'round';

  for (let i = 0; i < frayCount; i++) {
    const spread = (i - (frayCount - 1) / 2) * 0.35;
    const frayAngle = angle + Math.PI + spread;
    ctx.globalAlpha = 0.5 + Math.random() * 0.3;
    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(
      top.x + Math.cos(frayAngle) * frayLen * (0.7 + Math.random() * 0.6),
      top.y + Math.sin(frayAngle) * frayLen * (0.7 + Math.random() * 0.6)
    );
    ctx.stroke();
  }
}

function drawKnot(ctx, points, color, thickness) {
  const knotIndex = Math.floor(points.length * 0.6);
  if (knotIndex >= points.length) return;
  const p = points[knotIndex];

  ctx.fillStyle = color;
  ctx.globalAlpha = 1;
  ctx.beginPath();
  const knotW = thickness * 2.5;
  const knotH = thickness * 1.8;
  ctx.ellipse(p.x, p.y, knotW, knotH, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.beginPath();
  ctx.ellipse(p.x - 1, p.y - 1, knotW * 0.5, knotH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

function drawBow(ctx, points, color, thickness) {
  const top = points[points.length - 1];

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = thickness * 0.8;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 1;

  const bowSize = 6 + thickness * 2;

  // Left loop
  ctx.beginPath();
  ctx.ellipse(top.x - bowSize, top.y - bowSize * 0.3, bowSize * 0.8, bowSize * 0.5, -0.4, 0, Math.PI * 2);
  ctx.stroke();

  // Right loop
  ctx.beginPath();
  ctx.ellipse(top.x + bowSize, top.y - bowSize * 0.3, bowSize * 0.8, bowSize * 0.5, 0.4, 0, Math.PI * 2);
  ctx.stroke();

  // Center knot
  ctx.beginPath();
  ctx.arc(top.x, top.y, thickness * 1.2, 0, Math.PI * 2);
  ctx.fill();

  // Tails
  ctx.beginPath();
  ctx.moveTo(top.x - 2, top.y + 1);
  ctx.lineTo(top.x - bowSize * 0.6, top.y + bowSize * 1.1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(top.x + 2, top.y + 1);
  ctx.lineTo(top.x + bowSize * 0.6, top.y + bowSize * 1.1);
  ctx.stroke();

  // Subtle glow
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(top.x, top.y - bowSize * 0.2, bowSize * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
}

export function drawThreadLabel(ctx, points, label, isHovered) {
  if (!isHovered) return;
  const top = points[points.length - 1];
  ctx.save();
  ctx.font = '13px "DM Sans", sans-serif';
  ctx.fillStyle = '#E8E0D8';
  ctx.globalAlpha = 0.9;
  ctx.textAlign = 'center';
  ctx.fillText(label, top.x, top.y - 20, 120);
  ctx.restore();
}

export function drawScrollFade(ctx, width, height, threadZoneTop) {
  const fadeWidth = 40;
  let grad = ctx.createLinearGradient(0, 0, fadeWidth, 0);
  grad.addColorStop(0, 'rgba(26,23,21,1)');
  grad.addColorStop(1, 'rgba(26,23,21,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, threadZoneTop, fadeWidth, height - threadZoneTop);

  grad = ctx.createLinearGradient(width - fadeWidth, 0, width, 0);
  grad.addColorStop(0, 'rgba(26,23,21,0)');
  grad.addColorStop(1, 'rgba(26,23,21,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(width - fadeWidth, threadZoneTop, fadeWidth, height - threadZoneTop);
}
