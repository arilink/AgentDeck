/**
 * AgentDeck Agent 状态 + 工具分类词表
 *
 * 单一事实来源。design / 前端 / 后端 / adapter 都看这份。
 * - 状态(AgentState):跨 AI 通用语义,对应 5 种 Mascot 姿态。
 * - 工具分类(ToolCategory):跨 AI 通用语义,只在 state === 'tool_use' 时生效。
 * - 工具名映射(TOOL_NAME_TO_CATEGORY):按 source 分表,每接入一家 AI 加一列。
 */

export type AgentState =
  | 'idle'
  | 'thinking'
  | 'tool_use'
  | 'waiting'
  | 'done';

export interface AgentStateMeta {
  label: string;
  description: string;
  mascotPose: string;
  color: string;
}

export const AGENT_STATES: Record<AgentState, AgentStateMeta> = {
  idle: {
    label: '空闲',
    description: '会话存在但没有活动,超过 60s 未收事件',
    mascotPose: '趴桌睡觉,zZz',
    color: '#3A3A3A',
  },
  thinking: {
    label: '思考',
    description: '正在生成 token,没在调用工具',
    mascotPose: '抬头 + 思考气泡 + ?',
    color: '#7C7CF0',
  },
  tool_use: {
    label: '工具调用',
    description: '正在跑某个工具(读/写/搜/执行...),具体类别看 tool_name',
    mascotPose: '低头打字,监视器滚代码',
    color: '#2DD4BF',
  },
  waiting: {
    label: '等待用户',
    description: '需要用户在 CLI/IDE 里做决定(权限确认 / 选项题)',
    mascotPose: '举鳍呼叫,头顶 !',
    color: '#F59E0B',
  },
  done: {
    label: '完成',
    description: '一次响应结束,等待用户下一次输入',
    mascotPose: '双鳍举起,小光点',
    color: '#10B981',
  },
};

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

export interface ToolCategoryMeta {
  label: string;
  description: string;
  animationHint: string;
}

export const TOOL_CATEGORIES: Record<ToolCategory, ToolCategoryMeta> = {
  reading:    { label: '读取',     description: '读文件/笔记本/网页',         animationHint: '翻页 / 滚动行' },
  editing:    { label: '编辑',     description: '写入/修改文件',              animationHint: '光标打字 / 字符流' },
  searching:  { label: '搜索',     description: '按名/按内容搜文件',          animationHint: '放大镜 / 扫描线' },
  executing:  { label: '执行',     description: '跑 shell / 后台进程',        animationHint: '终端光标闪烁' },
  browsing:   { label: '联网',     description: '抓网页 / web 搜索',          animationHint: '地球转 / 抓取动画' },
  delegating: { label: '委派',     description: '派生子 agent / 子任务',      animationHint: '分支树展开' },
  planning:   { label: '规划',     description: '维护 TODO / 进出 plan 模式', animationHint: '清单勾选' },
  asking:     { label: '问询',     description: '主动向用户提问',             animationHint: '问号呼吸灯' },
  skill:      { label: 'Skill',    description: '调用 skill / 子流程',        animationHint: '魔法卷轴展开' },
  designing:  { label: '设计',     description: '操作设计稿 / 画板',          animationHint: '画笔笔触' },
  scheduling: { label: '调度',     description: '定时任务 / 唤醒',            animationHint: '钟表走针' },
  mcp_other:  { label: '外部服务', description: '未分类的 MCP server 调用',   animationHint: '插头脉冲' },
  unknown:    { label: '未知工具', description: '没在映射表里的工具',         animationHint: '通用 tool_use 动画' },
};

/**
 * 按 source 分的工具名映射。
 * - 新接入一家 AI:在这里加一列,不动其它代码
 * - 工具名以 adapter 实际透传给后端的 payload.tool_name 为准
 * - 同名工具在不同 source 下可映到不同 category(避免撞车)
 */
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
  // codex / cursor / aider / cline 接入时在这里加列
};

/**
 * MCP server 前缀映射。`mcp__<server>__<tool>` 格式。
 * 跨 source 共享(MCP 协议本身是中立的)。
 */
const MCP_PREFIX_TO_CATEGORY: Record<string, ToolCategory> = {
  pencil: 'designing',
};

export function toolCategory(source: string, toolName: string | null | undefined): ToolCategory {
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

/** 给前端 / design 自检用:返回某个 source 下所有已知工具名(用于 mock / 单测)。 */
export function allKnownToolNames(source: string): string[] {
  return Object.keys(TOOL_NAME_TO_CATEGORY[source] ?? {}).sort();
}

/** 所有已接入的 source 列表。 */
export function allKnownSources(): string[] {
  return Object.keys(TOOL_NAME_TO_CATEGORY).sort();
}
