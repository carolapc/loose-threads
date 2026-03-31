// Canvas rendering for threads, bows, knots, and frayed ends

export function drawThread(ctx, points, color, thickness, status, opacity = 1) {
  if (points.length < 2) return;
  ctx.save();
  ctx.globalAlpha = opacity;

  // Draw layered strokes for fibrous texture
  const layers = [
    { offset: -1.2, alpha: 0.25, width: thickness + 1.5 },
    { offset: 0.8, alpha: 0.2, width: thickness + 1 },
    { offset: 0, alpha: 1, width: thickness },
  ];

  for (const layer of layers) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.globalAlpha = opacity * layer.alpha;
    ctx.lineWidth = layer.width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Smooth bezier curve through points
    ctx.moveTo(points[0].x + layer.offset, points[0].y);
    for (let i = 1; i < points.length - 1; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2 + layer.offset;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x + layer.offset, points[i].y, xc, yc);
    }
    const last = points[points.length - 1];
    ctx.lineTo(last.x + layer.offset, last.y);
    ctx.stroke();
  }

  ctx.globalAlpha = opacity;

  // Draw status-specific decorations
  if (status === 'loose') {
    drawFrayedEnd(ctx, points, color, thickness);
  } else if (status === 'knotted') {
    drawKnot(ctx, points, color, thickness);
  } else if (status === 'bowed') {
    drawBow(ctx, points, color, thickness);
  }

  ctx.restore();
}

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
  // Knot at ~60% up the thread
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

  // Inner highlight
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
  // Left fade
  const fadeWidth = 40;
  let grad = ctx.createLinearGradient(0, 0, fadeWidth, 0);
  grad.addColorStop(0, 'rgba(26,23,21,1)');
  grad.addColorStop(1, 'rgba(26,23,21,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, threadZoneTop, fadeWidth, height - threadZoneTop);

  // Right fade
  grad = ctx.createLinearGradient(width - fadeWidth, 0, width, 0);
  grad.addColorStop(0, 'rgba(26,23,21,0)');
  grad.addColorStop(1, 'rgba(26,23,21,1)');
  ctx.fillStyle = grad;
  ctx.fillRect(width - fadeWidth, threadZoneTop, fadeWidth, height - threadZoneTop);
}
