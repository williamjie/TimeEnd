# Cursor 终端无法识别 npm 的解决方案

## 问题原因

Cursor 启动时可能没有加载完整的系统环境变量，导致 Node.js 和 npm 不在 PATH 中。

## 解决方案

### 方案1：临时修复（推荐，快速）

在 Cursor 终端中运行：

```powershell
.\fix-cursor-path.ps1
```

这个脚本会：
- 自动查找 Node.js 安装路径
- 将 Node.js 添加到当前终端会话的 PATH
- 验证修复是否成功

**注意**：此修复仅对当前终端会话有效，关闭终端后需要重新运行。

### 方案2：永久修复

#### 方法A：使用脚本（需要管理员权限）

1. 右键点击 PowerShell，选择"以管理员身份运行"
2. 进入项目目录：
   ```powershell
   cd e:\company_code\TimeEnd
   ```
3. 运行修复脚本：
   ```powershell
   .\fix-cursor-path-permanent.ps1
   ```
4. 重启 Cursor

#### 方法B：手动添加到系统 PATH

1. 找到 Node.js 安装路径（通常在 `C:\Program Files\nodejs\`）
2. 右键"此电脑" → 属性 → 高级系统设置
3. 点击"环境变量"
4. 在"系统变量"中找到 `Path`，点击"编辑"
5. 点击"新建"，添加 Node.js 路径（例如：`C:\Program Files\nodejs`）
6. 点击"确定"保存
7. **重启 Cursor**（重要！）

### 方案3：在 Cursor 终端中手动设置（每次打开终端时）

在 Cursor 终端中运行：

```powershell
# 替换为您的实际 Node.js 路径
$env:PATH = "C:\Program Files\nodejs;$env:PATH"

# 验证
node --version
npm --version
```

### 方案4：使用外部终端

如果以上方法都不行，可以在 Windows PowerShell 或命令提示符中运行项目：

1. 打开 Windows PowerShell（不是 Cursor 的终端）
2. 进入项目目录：
   ```powershell
   cd e:\company_code\TimeEnd
   ```
3. 运行命令：
   ```powershell
   npm install
   npm start
   ```

## 验证修复

修复后，在 Cursor 终端中运行：

```powershell
node --version
npm --version
```

如果显示版本号，说明修复成功。

## 查找 Node.js 安装路径

如果不确定 Node.js 安装在哪里，可以：

1. **在正常的 PowerShell 中运行**：
   ```powershell
   where.exe node
   ```

2. **检查常见位置**：
   - `C:\Program Files\nodejs\`
   - `C:\Program Files (x86)\nodejs\`
   - `%LOCALAPPDATA%\Programs\nodejs\`

3. **从注册表查找**：
   ```powershell
   reg query "HKLM\SOFTWARE\Node.js" /v InstallPath
   ```

## 为什么会出现这个问题？

- Cursor 启动时可能没有继承完整的系统环境变量
- Node.js 可能只添加到了用户 PATH，而不是系统 PATH
- Cursor 的终端会话可能使用了不同的环境变量配置

## 推荐做法

1. **立即使用**：运行 `.\fix-cursor-path.ps1` 临时修复
2. **长期使用**：手动将 Node.js 添加到系统 PATH（方案2方法B）
3. **重启 Cursor**：修改系统 PATH 后必须重启 Cursor 才能生效
