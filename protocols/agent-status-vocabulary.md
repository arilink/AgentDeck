# Agent Status Vocabulary

AgentDeck 的 Agent 状态 + 工具分类词表,**单一事实来源**。

- 运行时定义在 [`packages/backend/src/status-vocabulary.ts`](../packages/backend/src/status-vocabulary.ts)(导出类型 + `toolCategory()` 函数)
- 前端 / design / adapter 都应当读取或对齐这份词表,任何新增/改动先改这里,再同步代码

## 1. Agent 状态(5 种)

`state` 字段的取值范围。一个 agent 在任意时刻处于且仅处于其中一种。状态变化由 backend `state.ts` 的 `applyTransition` 根据 adapter 事件推导。

| state | 中文 | 含义 | Mascot 姿态 | 状态色 |
|---|---|---|---|---|
| `idle` | 空闲 | 会话存在但没有活动,超过 60s 未收事件 | 趴桌睡觉,zZz | `#3A3A3A` |
| `thinking` | 思考 | 正在生成 token,没在调用工具 | 抬头 + 思考气泡 + ? | `#7C7CF0` |
| `tool_use` | 工具调用 | 正在跑某个工具(读/写/搜/执行...) | 低头打字,监视器滚代码 | `#2DD4BF` |
| `waiting` | 等待用户 | 需要用户在 CLI/IDE 里做决定 | 举鳍呼叫,头顶 ! | `#F59E0B` |
| `done` | 完成 | 一次响应结束,等待用户下一次输入 | 双鳍举起,小光点 | `#10B981` |

> **没有 `session_end` / `compacting` 作为独立状态。** session 结束直接从 registry 删 agent;context compact 用 `metadata.compacting = true` 旗标 + label "Compacting context" 表示,不改 state。

## 2. 工具分类(13 种,只在 `state === 'tool_use'` 时有意义)

`adapter-event` 里的 `payload.tool_name` 经 `toolCategory(source, name)` 映射到一个 `ToolCategory`。前端据此切换 Rive 子动画,design 据此画配饰 / 监视器内容。

| category | 中文 | 含义 | 动画提示 |
|---|---|---|---|
| `reading` | 读取 | 读文件/笔记本/网页 | 翻页 / 滚动行 |
| `editing` | 编辑 | 写入/修改文件 | 光标打字 / 字符流 |
| `searching` | 搜索 | 按名/按内容搜文件 | 放大镜 / 扫描线 |
| `executing` | 执行 | 跑 shell / 后台进程 | 终端光标闪烁 |
| `browsing` | 联网 | 抓网页 / web 搜索 | 地球转 / 抓取动画 |
| `delegating` | 委派 | 派生子 agent / 子任务 | 分支树展开 |
| `planning` | 规划 | 维护 TODO / 进出 plan 模式 | 清单勾选 |
| `asking` | 问询 | 主动向用户提问 | 问号呼吸灯 |
| `skill` | Skill | 调用 skill / 子流程 | 魔法卷轴展开 |
| `designing` | 设计 | 操作设计稿 / 画板 | 画笔笔触 |
| `scheduling` | 调度 | 定时任务 / 唤醒 | 钟表走针 |
| `mcp_other` | 外部服务 | 未分类的 MCP server 调用 | 插头脉冲 |
| `unknown` | 未知工具 | 没在映射表里的工具 | 通用 tool_use 动画 |

> **Skill 的可观测粒度**:hook 只能看到 `tool_name: "Skill"` 和 `tool_input.skill: "<name>"`,**看不到 skill 内部又调了哪些子工具**(那些在 Claude 主进程内消化,不会再触发 hook)。如果想在 deck 上显示 skill 名,从 `tool_args_preview` 里取即可。

## 3. 工具名映射(按 source 分表)

词表跨 AI 通用,**只有"这家 AI 把工具叫什么名"是映射问题**,因此映射表按 `source` 分列。新接入一家 AI:在 [`status-vocabulary.ts`](../packages/backend/src/status-vocabulary.ts) 的 `TOOL_NAME_TO_CATEGORY` 里加一列,然后回来更下表。

### 3.1 `claude-code`(Claude Code CLI / VSCode 插件)

| 工具 | category |
|---|---|
| `Read`, `NotebookRead` | `reading` |
| `Write`, `Edit`, `MultiEdit`, `NotebookEdit` | `editing` |
| `Glob`, `Grep`, `LS` | `searching` |
| `Bash`, `BashOutput`, `KillBash`, `KillShell`, `TaskOutput`, `TaskStop` | `executing` |
| `WebFetch`, `WebSearch` | `browsing` |
| `Agent`, `Task` | `delegating` |
| `TodoWrite`, `ExitPlanMode`, `EnterPlanMode`, `EnterWorktree`, `ExitWorktree` | `planning` |
| `AskUserQuestion` | `asking` |
| `Skill` | `skill` |
| `CronCreate`, `CronDelete`, `CronList`, `ScheduleWakeup` | `scheduling` |

### 3.2 其它 AI(待接入)

`codex` / `cursor` / `aider` / `cline` / `opencode` 等接入时在此节补表。

### 3.3 MCP 工具(跨 source,前缀匹配)

MCP 协议本身是中立的,所有 source 共享一份 MCP 前缀映射。`mcp__<server>__<tool>` 格式按 server 名匹配:

| server prefix | category |
|---|---|
| `mcp__pencil__*` | `designing` |
| 其它 `mcp__*__*` | `mcp_other` |

## 4. 给前端的伪代码

```ts
import { toolCategory, AGENT_STATES, TOOL_CATEGORIES } from '@backend/status-vocabulary';

function pickAnimation(agent: AgentInfo) {
  if (agent.state !== 'tool_use') {
    return { kind: 'state', key: agent.state };
  }
  return { kind: 'tool', key: toolCategory(agent.source, agent.current_tool) };
}
```

Rive 状态机建议结构:**顶层 5 个 state 节点 + `tool_use` 内层 13 个子节点**(子节点用 `toolCategory` 字符串作为 input)。

## 5. 不计入状态机的"装饰文案"

Claude Code 自带 spinner 文案(`churning / puzzing / coalescing / unravelling / pondering / noodling / ...`)是 UI 装饰,**不绑定内部状态**,AgentDeck 也不应当用 hook payload 推断它们。如果想给 `thinking` 状态加点趣味,自己内置一份词表随机抽即可,纯前端,不进协议。
