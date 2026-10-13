import { BaseEdge, getBezierPath, type Edge, type EdgeProps } from '@xyflow/react';

export interface WorkflowEdgeData extends Record<string, unknown> {
  sourceColor?: string;
  targetColor?: string;
}

export type WorkflowEdgeType = Edge<WorkflowEdgeData, 'workflow'>;

const FALLBACK = '#71717a';

/** Gradient edge flowing from the source node's color to the target's,
 * with a travelling dash overlay. Widths and glow states live in CSS. */
export default function WorkflowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  data,
}: EdgeProps<WorkflowEdgeType>) {
  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  const c1 = data?.sourceColor ?? FALLBACK;
  const c2 = data?.targetColor ?? FALLBACK;
  const gid = `wf-edge-${id}`;

  return (
    <>
      <defs>
        <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={sourceX} y1={sourceY} x2={targetX} y2={targetY}>
          <stop offset="0%" stopColor={c1} />
          <stop offset="100%" stopColor={c2} />
        </linearGradient>
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        interactionWidth={24}
        style={{
          stroke: `url(#${gid})`,
          ...(selected ? { filter: `drop-shadow(0 0 5px ${c2})` } : {}),
        }}
      />
      <path d={edgePath} fill="none" className="wf-edge-flow" />
    </>
  );
}
