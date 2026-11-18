import { ConceptNode } from "../types/schema";

/**
 * Choose an uncluttered orbital position around targetNode so the newly attracted
 * concept lands smoothly next to its parent/linked node without overlapping siblings.
 */
export function computeMagneticTargetPosition(
  movingNode: ConceptNode,
  targetNode: ConceptNode,
  allNodes: ConceptNode[],
  orbitRadius = 215
): { x: number; y: number } {
  const dx = movingNode.x - targetNode.x;
  const dy = movingNode.y - targetNode.y;
  const baseAngle = Math.atan2(dy || 1, dx || 1);

  let bestPos = {
    x: targetNode.x + Math.cos(baseAngle) * orbitRadius,
    y: targetNode.y + Math.sin(baseAngle) * orbitRadius,
  };
  let bestScore = -Infinity;

  // Test 12 candidate angles around the target node
  for (let i = 0; i < 12; i++) {
    const angle = baseAngle + (i * Math.PI * 2) / 12;
    const cx = targetNode.x + Math.cos(angle) * orbitRadius;
    const cy = targetNode.y + Math.sin(angle) * orbitRadius;

    let minDist = Infinity;
    for (const other of allNodes) {
      if (other.id === movingNode.id || other.id === targetNode.id) continue;
      const dist = Math.hypot(cx - other.x, cy - other.y);
      if (dist < minDist) minDist = dist;
    }

    // Slightly prefer angles closer to current approach direction
    const anglePenalty = Math.abs(Math.atan2(Math.sin(angle - baseAngle), Math.cos(angle - baseAngle))) * 18;
    const score = (minDist === Infinity ? 500 : Math.min(minDist, 320)) - anglePenalty;

    if (score > bestScore) {
      bestScore = score;
      bestPos = { x: Math.round(cx), y: Math.round(cy) };
    }
  }

  return bestPos;
}

export function runSpringPullAnimation(
  fromNode: ConceptNode,
  toNode: ConceptNode,
  allNodes: ConceptNode[],
  onTick: (x: number, y: number) => void,
  onDone: (x: number, y: number) => void
): () => void {
  const target = computeMagneticTargetPosition(fromNode, toNode, allNodes);
  let cx = fromNode.x;
  let cy = fromNode.y;
  let vx = 0;
  let vy = 0;
  let rafId = 0;

  const step = () => {
    const dx = target.x - cx;
    const dy = target.y - cy;
    vx = (vx + dx * 0.16) * 0.68;
    vy = (vy + dy * 0.16) * 0.68;
    cx += vx;
    cy += vy;
    onTick(Math.round(cx), Math.round(cy));
    if (Math.hypot(dx, dy) > 1.8 || Math.hypot(vx, vy) > 0.6) {
      rafId = requestAnimationFrame(step);
    } else {
      onDone(target.x, target.y);
    }
  };
  rafId = requestAnimationFrame(step);
  return () => cancelAnimationFrame(rafId);
}
