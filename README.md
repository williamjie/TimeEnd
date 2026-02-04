# TimeEnd - 强制中断计时器

一个Windows桌面应用，帮助您专注工作，并在计时结束时强制弹出输入框，要求您记录工作内容后才能继续。

## 功能特点

- ⏰ **倒计时功能** - 可配置的专注时长和休息时长
- 🔔 **强制中断** - 计时结束后强制弹出输入框，必须输入内容才能关闭
- 📊 **数据统计** - 记录完成的专注次数、今日专注时长、累计专注时长
- ⚙️ **灵活配置** - 可自定义专注时长和休息时长
- 💾 **数据持久化** - 自动保存统计数据，跨会话保持

## 技术栈

- **Electron** - 跨平台桌面应用框架
- **Node.js** - 后端运行时
- **HTML/CSS/JavaScript** - 前端界面
- **electron-store** - 数据持久化

## 安装和运行

### 方式一：使用快速启动脚本（推荐）

**Windows 用户**：双击 `快速开始.bat` 文件，脚本会自动检测环境并安装依赖。

**PowerShell 用户**：运行 `.\setup.ps1` 脚本。

### 方式二：手动安装

#### 1. 安装 Node.js

**重要**：必须先安装 Node.js 才能运行此项目。

- 访问 https://nodejs.org/ 下载并安装 LTS 版本（推荐 v18+）
- **安装时务必勾选 "Add to PATH" 选项**
- 安装完成后重启终端或计算机

验证安装：
```bash
node --version
npm --version
```

#### 2. 安装项目依赖

```bash
npm install
```

如果下载速度慢，可以使用国内镜像：
```bash
npm install --registry=https://registry.npmmirror.com
```

#### 3. 运行应用

```bash
npm start
```

### 故障排除

#### 问题：`npm` 命令未找到

**错误信息**：`无法将"npm"项识别为 cmdlet、函数、脚本文件或可运行程序的名称`

**解决方案**：
1. 确认已安装 Node.js：访问 https://nodejs.org/ 下载安装
2. 安装时勾选 "Add to PATH" 选项
3. 重启 PowerShell 或命令提示符
4. 如果仍不行，手动添加 Node.js 到 PATH：
   - 找到 Node.js 安装目录（通常在 `C:\Program Files\nodejs\`）
   - 添加到系统环境变量 PATH 中
   - 重启计算机

#### 问题：依赖安装失败

**解决方案**：
- 检查网络连接
- 使用国内镜像：`npm install --registry=https://registry.npmmirror.com`
- 清除 npm 缓存：`npm cache clean --force`
- 删除 `node_modules` 文件夹后重新安装

#### 问题：Electron 下载慢

**解决方案**：
- 使用代理或 VPN
- 设置 Electron 镜像：`npm config set electron_mirror https://npmmirror.com/mirrors/electron/`

### 打包应用

```bash
npm run build
```

打包后的安装程序将在 `dist` 目录中。

## 使用说明

1. **设置时长**：点击"⚙️ 设置"按钮，配置专注时长和休息时长
2. **开始计时**：点击"开始"按钮开始倒计时
3. **暂停/继续**：计时过程中可以暂停和继续
4. **强制中断**：计时结束后会自动弹出输入框，必须输入工作内容才能关闭
5. **查看统计**：主界面显示完成的专注次数和时长统计

## 强制中断机制

当计时结束时：
- 自动弹出置顶窗口（Always on Top）
- 窗口为模态对话框，无法操作其他窗口
- 必须输入内容才能提交
- 提交后自动更新统计数据

## 项目结构

```
TimeEnd/
├── src/
│   ├── main/           # Electron主进程
│   │   ├── main.js     # 主进程入口
│   │   └── timer.js    # 计时器逻辑
│   └── renderer/       # 渲染进程（前端）
│       ├── index.html  # 主窗口
│       ├── interrupt.html  # 中断窗口
│       ├── styles/     # 样式文件
│       └── scripts/    # 前端脚本
├── package.json
└── README.md
```

## 开发计划

- [x] 项目初始化和配置
- [x] 主窗口UI开发
- [x] 计时器核心逻辑
- [x] 强制中断窗口实现
- [x] 数据存储功能
- [x] 配置功能
- [ ] 打包和测试
- [ ] 系统托盘图标（可选）
- [ ] 通知提醒（可选）
- [ ] 主题切换（可选）

## 许可证

MIT License
