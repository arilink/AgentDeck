import { z } from 'zod';

export const PROTOCOL_VERSION = '1.0';

export const AgentStateSchema = z.enum([
  'idle',
  'thinking',
  'tool_use',
  'waiting',
  'done',
]);
export type AgentState = z.infer<typeof AgentStateSchema>;

export const DecisionOptionSchema = z.object({
  key: z.string(),
  label: z.string(),
});
export type DecisionOption = z.infer<typeof DecisionOptionSchema>;

export const PendingDecisionSchema = z.object({
  message: z.string(),
  options: z.array(DecisionOptionSchema),
  timeout_ms: z.number().optional(),
});
export type PendingDecision = z.infer<typeof PendingDecisionSchema>;

export const AgentInfoSchema = z.object({
  id: z.string(),
  source: z.string(),
  state: AgentStateSchema,
  label: z.string().optional(),
  current_tool: z.string().nullable().optional(),
  pending_decision: PendingDecisionSchema.nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});
export type AgentInfo = z.infer<typeof AgentInfoSchema>;

const HelloAckSchema = z.object({
  type: z.literal('hello_ack'),
  protocol_version: z.string(),
  supported: z.boolean(),
});

const AgentListSchema = z.object({
  type: z.literal('agent_list'),
  agents: z.array(AgentInfoSchema),
});

const AgentUpdateSchema = z.object({
  type: z.literal('agent_update'),
  agent_id: z.string(),
  state: AgentStateSchema,
  label: z.string().optional(),
  current_tool: z.string().nullable().optional(),
  pending_decision: PendingDecisionSchema.nullable().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const AgentRemoveSchema = z.object({
  type: z.literal('agent_remove'),
  agent_id: z.string(),
});

const DecisionShowSchema = z.object({
  type: z.literal('decision_show'),
  agent_id: z.string(),
  decision: PendingDecisionSchema,
});

const DecisionHideSchema = z.object({
  type: z.literal('decision_hide'),
  agent_id: z.string(),
});

export const FrontendOutboundSchema = z.discriminatedUnion('type', [
  HelloAckSchema,
  AgentListSchema,
  AgentUpdateSchema,
  AgentRemoveSchema,
  DecisionShowSchema,
  DecisionHideSchema,
]);
export type FrontendOutbound = z.infer<typeof FrontendOutboundSchema>;

export type FrontendInbound =
  | { type: 'hello'; protocol_version: string }
  | { type: 'decision_response'; agent_id: string; choice: string }
  | { type: 'agent_pin'; agent_id: string; screen_id: string }
  | { type: 'agent_unpin'; agent_id: string };
