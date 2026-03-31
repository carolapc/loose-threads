// Verlet rope physics simulation for Loose Threads

const GRAVITY = 0.3;
const DAMPING = 0.97;
const CONSTRAINT_ITERATIONS = 4;
const POINTS_PER_THREAD = 10;

export function createThreadPoints(anchorX, anchorY, height, pointCount = POINTS_PER_THREAD) {
  const points = [];
  const segmentLength = height / (pointCount - 1);
  for (let i = 0; i < pointCount; i++) {
    const y = anchorY - i * segmentLength;
    points.push({
      x: anchorX,
      y,
      prevX: anchorX,
      prevY: y,
      fixed: i === 0, // bottom point is fixed
    });
  }
  return points;
}

export function createConstraints(points) {
  const constraints = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    constraints.push({
      a: i,
      b: i + 1,
      length: Math.sqrt(dx * dx + dy * dy),
    });
  }
  return constraints;
}

function windForce(pointIndex, totalPoints, time, threadPhase, threadFreq) {
  // Each point sways more the further from anchor (bottom)
  const influence = pointIndex / totalPoints;
  const wave = Math.sin(time * threadFreq + threadPhase) * 0.4;
  const wave2 = Math.sin(time * threadFreq * 0.7 + threadPhase * 1.3) * 0.15;
  return (wave + wave2) * influence * influence;
}

export function simulateThread(points, constraints, time, threadPhase, threadFreq, scrollVelocity = 0, dragPoint = null) {
  // Verlet integration
  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.fixed) continue;

    const vx = (p.x - p.prevX) * DAMPING;
    const vy = (p.y - p.prevY) * DAMPING;

    p.prevX = p.x;
    p.prevY = p.y;

    const wind = windForce(i, points.length, time, threadPhase, threadFreq);
    // Scroll tilt: threads lean opposite to scroll direction
    const scrollForce = -scrollVelocity * 0.03 * (i / points.length);

    p.x += vx + wind + scrollForce;
    p.y += vy + GRAVITY;
  }

  // Apply drag if active
  if (dragPoint && dragPoint.pointIndex >= 0) {
    const p = points[dragPoint.pointIndex];
    if (!p.fixed) {
      p.x += (dragPoint.x - p.x) * 0.5;
      p.y += (dragPoint.y - p.y) * 0.5;
    }
  }

  // Satisfy distance constraints
  for (let iter = 0; iter < CONSTRAINT_ITERATIONS; iter++) {
    for (const c of constraints) {
      const a = points[c.a];
      const b = points[c.b];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
      const diff = (c.length - dist) / dist * 0.5;
      const offsetX = dx * diff;
      const offsetY = dy * diff;

      if (!a.fixed) {
        a.x -= offsetX;
        a.y -= offsetY;
      }
      if (!b.fixed) {
        b.x += offsetX;
        b.y += offsetY;
      }
    }
  }
}

export function findNearestPoint(points, x, y, maxDist = 40) {
  let best = -1;
  let bestDist = maxDist;
  for (let i = 0; i < points.length; i++) {
    const dx = points[i].x - x;
    const dy = points[i].y - y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

// Apply a sympathetic wobble to a thread (used when a neighbor is touched)
export function applyWobble(points, intensity = 2) {
  for (let i = 1; i < points.length; i++) {
    if (!points[i].fixed) {
      points[i].x += (Math.random() - 0.5) * intensity;
    }
  }
}
