# Claude Code Adapter

把 Claude Code 的 hook 事件翻译成 AgentDeck 的 `adapter-event` 协议。

> **覆盖范围**: Claude Code CLI 和 VSCode 插件共用同一份 `~/.claude/settings.json`,
> 因此同一份 adapter + 同一份 hook 配置在两种载体里都生效,无需区分。
> 已在 VSCode 插件下端到端验证: SessionStart / UserPromptSubmit /
> PreToolUse / PostToolUse / Stop 全部正常触发。

## 安装

1. 确保已安装 Node.js 18+
2. 把 `claude-code-adapter.js` 路径记下来,例如 `f:/AI-Visualize/packages/adapters/claude-code/claude-code-adapter.js`
3. 在 `~/.claude/settings.json` 顶级加 `hooks` 字段:

```json
{
  "hooks": {
    "SessionStart": [
      { "hooks": [{ "type": "command", "command": "node <ABS_PATH>/claude-code-adapter.js session_start",  "timeout": 0.5 }] }
    ],
    "UserPromptSubmit": [
      { "hooks": [{ "type": "command", "command": "node <ABS_PATH>/claude-code-adapter.js user_prompt",    "timeout": 0.5 }] }
    ],
    "PreToolUse": [
      { "matcher": "*", "hooks": [{ "type": "command", "command": "node <ABS_PATH>/claude-code-adapter.js pre_tool_use",  "timeout": 0.5 }] }
    ],
    "PostToolUse": [
      { "matcher": "*", "hooks": [{ "type": "command", "command": "node <ABS_PATH>/claude-code-adapter.js post_tool_use", "timeout": 0.5 }] }
    ],
    "Notification": [
      { "hooks": [{ "type": "command", "command": "node <ABS_PATH>/claude-code-adapter.js notification",   "timeout": 0.5 }] }
    ],
    "Stop": [
      { "hooks": [{ "type": "command", "command": "node <ABS_PATH>/claude-code-adapter.js stop",           "timeout": 0.5 }] }
    ],
    "SubagentStop": [
      { "hooks": [{ "type": "command", "command": "node <ABS_PATH>/claude-code-adapter.js subagent_stop",  "timeout": 0.5 }] }
    ],
    "SessionEnd": [
      { "hooks": [{ "type": "command", "command": "node <ABS_PATH>/claude-code-adapter.js session_end",     "timeout": 0.5 }] }
    ]
  }
}
```

**Schema 注意**:
- 所有 hook 类型都需要 `{hooks: [{type, command, timeout?}]}` 包装,不是早期文档说的扁平 `[{type, command}]`
- `timeout` 单位是**秒**(`number`,可小数,`0.5` = 500ms),不是毫秒
- `PreToolUse` / `PostToolUse` 需要 `matcher` 字段(支持 `"*"` 通配)

4. 在 VSCode 里 `Ctrl+Shift+P` → `Developer: Reload Window` (CLI 用户重启 `claude` 进程)
5. 启动 AgentDeck 后端 (`packages/backend`)
6. 任何 Claude Code 会话的 hook 事件都会进 AgentDeck

## 环境变量

| 变量 | 默认值 | 说明 |
|---|---|---|
| `AGENTDECK_HOST` | `127.0.0.1` | 后端主机 |
| `AGENTDECK_PORT` | `7891` | 后端 HTTP 端口 |

## Hook 事件映射

| Claude Code Hook | adapter-event `event_type` | 触发时机 |
|---|---|---|
| `SessionStart` | `session_start` | 会话启动 / VSCode 窗口加载 |
| `UserPromptSubmit` | `user_prompt` | 用户发送一条消息 |
| `PreToolUse` | `tool_use_start` | 工具调用前 |
| `PostToolUse` | `tool_use_end` | 工具调用后 |
| `Notification` | `decision_required` | 仅 `permission_prompt` / `elicitation_dialog`(等待用户决策);`idle_prompt` / `auth_success` 等被 adapter 静默丢弃 |
| `Stop` | `response_complete` | 一次响应结束 → state `done`,**保留 agent**(不删) |
| `SubagentStop` | `response_complete` | Task 子 agent 结束 → 同上 |
| `SessionEnd` | `session_end` | 会话真正结束(`reason`: clear / logout / …)→ 后端移除 agent |

## 设计原则

- **静默失败**:后端未启动或网络异常时,adapter 必须立刻返回 0,不能阻塞 Claude Code
- **短超时**:HTTP 请求最多等 500ms
- **零依赖**:只用 Node 内建模块,单文件分发
- **不干预 hook 输入/输出**:adapter 是被动事件订阅者,不返回 `permissionDecision` 或 `decision`,
  不影响 Claude Code 的行为(这是 AgentDeck 的硬约束:只读)

## 调试

测试 adapter 是否能连通后端:

```bash
echo '{"session_id":"test","tool_name":"Bash","tool_input":{"command":"echo hi"}}' | \
  node claude-code-adapter.js pre_tool_use
```

然后 `curl http://127.0.0.1:7891/agents` 应看到一个 `claude-code:test` agent。

VSCode 插件下验证 hooks 是否真的触发:在后端 `http-server.ts` 里 log 每个收到的事件,
然后做几个工具调用,观察日志是否有 `event ... tool_use_start` / `tool_use_end` 对出现。
