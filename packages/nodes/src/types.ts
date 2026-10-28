export type SafeLogEntry = {
  level: "info" | "warn" | "error";
  message: string;
  at: string;
};

export type NodeExecutionResult<TOutput = unknown> = {
  output: TOutput;
  branch?: string;
  logs?: SafeLogEntry[];
};

export type NodeExecutionContext = {
  nodeId: string;
  nodeType: string;
  config: Record<string, unknown>;
  input: unknown;
  trigger: unknown;
  /** Outputs of previously executed steps, keyed by stepKey / slug(name) / nodeId. */
  steps: Record<string, unknown>;
  env: Record<string, string | undefined>;
  signal: AbortSignal;
  now(): Date;
};

export type NodeDefinition = {
  type: string;
  version: number;
  displayName: string;
  category: "trigger" | "core" | "connector" | "ai";
  description: string;
  execute(ctx: NodeExecutionContext): Promise<NodeExecutionResult>;
};
