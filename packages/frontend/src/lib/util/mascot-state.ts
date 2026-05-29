import type { AgentRecord } from '$lib/stores/agents';
import { toolCategoryClient } from './tool-category';

/** Lulu 视频素材的 6 个状态分类。素材交付物的固定枚举。 */
export type LuluState = 'idle' | 'thinking' | 'waiting' | 'done' | 'reading' | 'writing';

/**
 * 把 AgentRecord 映射到 Lulu 的 6 个素材状态。
 *
 * 5 顶层后端态:idle / thinking / waiting / done 直接 1:1。
 * tool_use 拆 reading vs writing —— toolCategory === 'reading' 才走 reading,
 * 其余(editing / executing / searching / browsing / unknown 等)都归 writing,
 * 因为视觉上 writing 更接近"在干活"。
 */
export function agentToLuluState(a: AgentRecord): LuluState {
  switch (a.state) {
    case 'idle':     return 'idle';
    case 'thinking': return 'thinking';
    case 'waiting':  return 'waiting';
    case 'done':     return 'done';
    case 'tool_use': {
      const toolName =
        a.current_tool ??
        (typeof a.metadata?.tool_name === 'string' ? a.metadata.tool_name : null);
      const cat = toolCategoryClient(a.source, toolName);
      return cat === 'reading' ? 'reading' : 'writing';
    }
  }
}
