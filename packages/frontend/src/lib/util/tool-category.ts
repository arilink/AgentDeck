/**
 * 前端版工具分类映射,镜像后端 packages/backend/src/status-vocabulary.ts。
 *
 * 用途:state === 'tool_use' 时把具体 tool_name 收敛到 13 个语义分类,
 * 供 LuluMascot 等组件挑动画 / 文案。
 *
 * 维护约定:后端 status-vocabulary.ts 改时同步改这里。两份文件结构保持一致,
 * 仅函数名加 Client 后缀以避免歧义。
 */

export type ToolCategory =
  | 'reading'
  | 'editing'
  | 'searching'
  | 'executing'
  | 'browsing'
  | 'delegating'
  | 'planning'
  | 'asking'
  | 'skill'
  | 'designing'
  | 'scheduling'
  | 'mcp_other'
  | 'unknown';

const TOOL_NAME_TO_CATEGORY: Record<string, Record<string, ToolCategory>> = {
  'claude-code': {
    Read:            'reading',
    NotebookRead:    'reading',
    Write:           'editing',
    Edit:            'editing',
    MultiEdit:       'editing',
    NotebookEdit:    'editing',
    Glob:            'searching',
    Grep:            'searching',
    LS:              'searching',
    Bash:            'executing',
    BashOutput:      'executing',
    KillBash:        'executing',
    KillShell:       'executing',
    TaskOutput:      'executing',
    TaskStop:        'executing',
    WebFetch:        'browsing',
    WebSearch:       'browsing',
    Agent:           'delegating',
    Task:            'delegating',
    TodoWrite:       'planning',
    ExitPlanMode:    'planning',
    EnterPlanMode:   'planning',
    EnterWorktree:   'planning',
    ExitWorktree:    'planning',
    AskUserQuestion: 'asking',
    Skill:           'skill',
    CronCreate:      'scheduling',
    CronDelete:      'scheduling',
    CronList:        'scheduling',
    ScheduleWakeup:  'scheduling',
  },
};

const MCP_PREFIX_TO_CATEGORY: Record<string, ToolCategory> = {
  pencil: 'designing',
};

export function toolCategoryClient(
  source: string,
  toolName: string | null | undefined,
): ToolCategory {
  if (!toolName) return 'unknown';

  const byName = TOOL_NAME_TO_CATEGORY[source]?.[toolName];
  if (byName) return byName;

  if (toolName.startsWith('mcp__')) {
    const server = toolName.split('__')[1];
    if (server && MCP_PREFIX_TO_CATEGORY[server]) return MCP_PREFIX_TO_CATEGORY[server];
    return 'mcp_other';
  }

  return 'unknown';
}
