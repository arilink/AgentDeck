# AgentDeck Backend

AgentDeck 的后端核心:HTTP 事件接入 + WebSocket 状态分发 + Agent 状态机推导。

**当前形态**:独立 Node 进程,可单独运行(`npm run dev`),无 Electron 依赖。Electron 套壳放在未来的 `packages/desktop/` 里包一层。

**未来形态**:整体重写为 Rust(axum + tokio-tungstenite),前端 / 接入层不变。

## 端口

| 端口 | 用途 |
|---|---|
| 7891 | HTTP — AI 接入层提交事件 |
| 7892 | WebSocket — 前端连接,推 Agent 状态 |
| 7894 | WebSocket — 设备 bridge 连接(v1 占位,只回 hello_ack) |

## 快速开始

```bash
cd packages/backend
npm install
npm run dev
```

启动后:

- 用 `curl` 验证 HTTP 入口:
  ```bash
  curl -X POST http://127.0.0.1:7891/event \
    -H "Content-Type: application/json" \
    -d '{
      "source": "claude-code",
      "session_id": "test-session-1",
      "event_type": "session_start",
      "timestamp": 1716700000000,
      "payload": { "workdir": "/tmp/demo", "model": "claude-sonnet-4.7" }
    }'
  ```
- 用浏览器开发工具 / wscat 连 `ws://127.0.0.1:7892`,发 `{"type":"hello","protocol_version":"1.0"}`,应收到 `hello_ack` + `agent_list`

## 目录

```
src/
├── index.ts          # 入口,启动所有 server
├── state.ts          # Agent 状态机 + 全局状态表
├── http-server.ts    # 7891 HTTP 入口
├── ws-frontend.ts    # 7892 前端 WebSocket
├── ws-device.ts      # 7894 设备 bridge WebSocket(占位)
├── protocol.ts       # 协议类型 + Zod schema
└── logger.ts         # 简单日志
```

## 架构约定

- **不依赖 Electron**:核心逻辑全部用纯 Node API,Electron 集成(托盘、快捷键、窗口)以后在 `packages/desktop/` 里 import 本包
- **状态在内存**:v1 不持久化,重启即重置(Agent session 本身是短命的,符合语义)
- **不主动连任何 AI 工具**:只被动接收 adapter POST,符合"不读本地文件"的隐私边界
