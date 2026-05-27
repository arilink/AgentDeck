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

export const AdapterEventSchema = z.object({
  source: z.string().min(1),
  session_id: z.string().min(1),
  event_type: z.enum([
    'session_start',
    'user_prompt',
    'thinking_start',
    'tool_use_start',
    'tool_use_end',
    'decision_required',
    'decision_resolved',
    'response_complete',
    'context_compact',
    'session_end',
  ]),
  timestamp: z.number(),
  payload: z.record(z.unknown()).optional(),
});
export type AdapterEvent = z.infer<typeof AdapterEventSchema>;

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

export type FrontendOutbound =
  | { type: 'hello_ack'; protocol_version: string; supported: boolean }
  | { type: 'agent_list'; agents: AgentInfo[] }
  | {
      type: 'agent_update';
      agent_id: string;
      state: AgentState;
      label?: string;
      current_tool?: string | null;
      pending_decision?: PendingDecision | null;
      metadata?: Record<string, unknown>;
    }
  | { type: 'agent_remove'; agent_id: string }
  | { type: 'decision_show'; agent_id: string; decision: PendingDecision }
  | { type: 'decision_hide'; agent_id: string };

export const FrontendInboundSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('hello'), protocol_version: z.string() }),
  z.object({ type: z.literal('decision_response'), agent_id: z.string(), choice: z.string() }),
  z.object({ type: z.literal('agent_pin'), agent_id: z.string(), screen_id: z.string() }),
  z.object({ type: z.literal('agent_unpin'), agent_id: z.string() }),
]);
export type FrontendInbound = z.infer<typeof FrontendInboundSchema>;

export const DeviceEventSchema = z.object({
  device_id: z.string().min(1),
  device_kind: z.string().optional(),
  event_type: z.enum([
    'device_connect',
    'device_disconnect',
    'button_press',
    'button_release',
    'rotary_turn',
    'dock_attach',
    'dock_detach',
    'sensor_reading',
    'heartbeat',
  ]),
  timestamp: z.number(),
  payload: z.record(z.unknown()).optional(),
});
export type DeviceEvent = z.infer<typeof DeviceEventSchema>;

export const DeviceInboundSchema = z.union([
  z.object({ type: z.literal('hello'), protocol_version: z.string() }),
  DeviceEventSchema,
]);
