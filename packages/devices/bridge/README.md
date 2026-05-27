# Device Bridge (占位)

把本地外接硬件(USB / Serial / BLE)桥接到 AgentDeck 后端。

**当前状态**:占位包,仅有协议设计。v1 MVP 不实现,v2 起步时开发。

## 角色定位

一个常驻守护进程,启动后:

1. 扫描并接管本地所有 AgentDeck 兼容外设(按 vendor/product ID 或 BLE service UUID 识别)
2. 与后端建立 WebSocket `ws://127.0.0.1:7894/device`
3. 上行:把硬件信号翻译成 `device-event` 协议(见 `protocols/device-event.schema.json`)
4. 下行:把后端的 `device-command` 翻译成硬件指令(见 `protocols/device-command.schema.json`)
5. 心跳保活、自动重连、设备热插拔处理

## 为什么独立进程而不是后端内嵌

- 串口/USB/BLE 操作平台差异大,隔离崩溃风险
- 用户可能想跑多台 bridge(主机 + 树莓派 USB hub)
- bridge 可用 Rust / Go 写,无需绑定后端语言
- 协议化后,**任何**第三方都可以实现一个 bridge(给自家硬件做适配)——这是生态扩展的关键

## 计划支持的硬件类别

| device_kind | 描述 | 典型形态 |
|---|---|---|
| `button_panel` | 1–6 数字 + Y/N 物理按键 | USB HID / 自研 PCB |
| `sub_display` | 磁吸副屏(每 Agent 一块) | Serial + pogo pins |
| `sensor` | 环境光 / 距离 / 电量 | I2C / BLE |
| `led_strip` | 状态指示灯条 | WS2812 USB 桥 |
| `rotary_encoder` | 旋钮(切换聚焦 Agent) | USB HID |
| `composite` | 一台设备聚合多种 | 自研 main board |

## 第三方接入约定

任何想接入 AgentDeck 的硬件厂商,只需:

1. 实现 device-event / device-command 两个 JSON schema
2. 连接 `ws://127.0.0.1:7894/device`
3. 在 `device_connect` 事件中上报 `capabilities[]` 声明支持哪些命令

不需要修改后端任何代码。

## 实现技术选型(待定)

候选:
- **Rust + tokio-tungstenite + serialport + btleplug**(性能 / 跨平台 / 单二进制)
- **Node + serialport + noble**(与现有 adapter 技术栈一致)
- **Go + bluetooth + go.bug.st/serial**(单二进制 / GC 小)

v2 启动时再决定。优先 Rust——bridge 是长期运行的系统级进程,值得追求资源占用。

## v1 MVP 期间怎么办

后端 WebSocket Server 会在 7894 端口开个 `/device` 路径占位,接受连接但不做事(只回 `hello_ack`)。这样:

- 第三方硬件厂商可以提前测试连接
- v2 启用真实路由时不需要破坏性升级
- 协议测试工具可以从 v1 开始写
