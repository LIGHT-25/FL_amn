import { describe, expect, it } from "vitest";
import type { FlowDefinition } from "@flowforge/shared";
import { detectCycles, topologicalSort, validateFlowStructure } from "./validation.js";

const baseFlow = (): FlowDefinition => ({
  schemaVersion: 1,
  nodes: [
    {
      id: "a",
      type: "trigger.manual",
      typeVersion: 1,
      name: "Start",
      position: { x: 0, y: 0 },
      config: {},
    },
    {
      id: "b",
      type: "core.log",
      typeVersion: 1,
      name: "Log",
      position: { x: 200, y: 0 },
      config: {},
    },
  ],
  edges: [{ id: "e1", source: "a", target: "b" }],
});

describe("validateFlowStructure", () => {
  it("accepts a simple acyclic flow", () => {
    expect(validateFlowStructure(baseFlow())).toEqual([]);
  });

  it("detects cycles", () => {
    const flow = baseFlow();
    flow.edges.push({ id: "e2", source: "b", target: "a" });
    expect(detectCycles(flow.nodes, flow.edges).some((i) => i.code === "CYCLE_DETECTED")).toBe(
      true,
    );
  });

  it("topologicalSort returns dependency order", () => {
    expect(topologicalSort(baseFlow().nodes, baseFlow().edges)).toEqual(["a", "b"]);
  });
});
