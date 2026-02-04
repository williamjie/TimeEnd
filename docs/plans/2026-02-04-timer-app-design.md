# 强制中断计时器应用设计文档

## 项目概述

开发一个Windows桌面应用，实现计时器功能，当计时结束时强制弹出输入框中断用户工作。

## 核心需求

1. **计时器功能**
   - 可配置的专注时长（默认25分钟）
   - 可配置的休息时长（默认5分钟）
   - 倒计时显示
   - 开始/暂停/停止控制

2. **强制中断机制**
   - 计时结束后立即弹出输入框窗口
   - 窗口必须置顶（Always on Top）
   - 模态对话框，无法关闭直到输入内容
   - 阻止用户操作其他应用

3. **数据统计**
   - 记录完成的专注次数
   - 记录今日专注时长
   - 记录累计专注时长
   - 数据持久化保存

## 技术选型

### 方案对比

**方案1：Electron + React/Vue**
- ✅ 开发速度快，界面现代化
- ✅ 可以实现强制弹窗和置顶
- ✅ 跨平台（虽然只需要Windows）
- ✅ 丰富的生态系统
- ❌ 应用体积较大

**方案2：Python + Tkinter**
- ✅ 开发简单快速
- ✅ 体积小
- ❌ 界面不够现代
- ❌ 强制弹窗实现较复杂

**方案3：C# WPF**
- ✅ Windows原生，性能好
- ✅ 强制弹窗容易实现
- ❌ 需要.NET环境
- ❌ 开发周期较长

### 推荐方案：Electron + React

选择Electron的原因：
1. 开发效率高，可以快速实现功能
2. 界面可以做得非常现代化和美观
3. Electron的BrowserWindow可以轻松实现置顶和模态窗口
4. 可以使用Web技术栈，便于后续扩展

## 架构设计

### 目录结构
```
TimeEnd/
├── src/
│   ├── main/           # Electron主进程
│   │   ├── main.js     # 主进程入口
│   │   └── timer.js    # 计时器逻辑
│   ├── renderer/       # 渲染进程（前端）
│   │   ├── index.html  # 主窗口HTML
│   │   ├── styles/     # 样式文件
│   │   └── scripts/    # 前端脚本
│   └── utils/          # 工具函数
│       └── storage.js  # 数据存储
├── package.json
├── README.md
└── docs/
```

### 核心功能模块

1. **主窗口（Main Window）**
   - 显示倒计时
   - 显示统计数据
   - 控制按钮（开始/暂停/停止）
   - 配置按钮

2. **计时器模块（Timer）**
   - 倒计时逻辑
   - 状态管理（专注/休息）
   - 时间更新事件

3. **强制中断窗口（Interrupt Window）**
   - 置顶窗口（alwaysOnTop: true）
   - 模态窗口（modal: true）
   - 输入框组件
   - 提交按钮

4. **数据存储（Storage）**
   - 使用electron-store或JSON文件
   - 存储统计数据
   - 存储配置信息

## UI设计要点

1. **主窗口**
   - 大号数字显示倒计时（如：25:00）
   - 状态指示（专注中/休息中）
   - 统计数据区域
   - 控制按钮区域

2. **强制中断窗口**
   - 全屏或大窗口，吸引注意力
   - 醒目的提示文字
   - 输入框（必填）
   - 提交按钮（输入后才能点击）

## 实现细节

### 强制中断实现

```javascript
// 创建置顶模态窗口
const interruptWindow = new BrowserWindow({
  width: 600,
  height: 400,
  alwaysOnTop: true,
  modal: true,
  resizable: false,
  frame: true,
  parent: mainWindow,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false
  }
});
```

### 计时器逻辑

- 使用setInterval每秒更新
- 时间到达0时触发中断事件
- 发送IPC消息通知渲染进程

### 数据持久化

- 使用electron-store存储配置和统计数据
- 自动保存，无需手动操作

## 开发计划

1. ✅ 项目初始化和配置
2. ✅ 主窗口UI开发
3. ✅ 计时器核心逻辑
4. ✅ 强制中断窗口实现
5. ✅ 数据存储功能
6. ✅ 配置功能
7. ✅ 打包和测试

## 后续扩展（可选）

- 系统托盘图标
- 通知提醒
- 主题切换
- 音效提醒
- 数据导出功能
