# 安装指南

## 快速开始

### 1. 安装 Node.js

确保您的系统已安装 Node.js (版本 16 或更高)。

下载地址：https://nodejs.org/

### 2. 安装项目依赖

在项目根目录打开命令行，运行：

```bash
npm install
```

这将安装以下依赖：
- `electron` - 桌面应用框架
- `electron-store` - 数据存储
- `electron-builder` - 应用打包工具（开发依赖）

### 3. 运行应用

```bash
npm start
```

## 打包为 Windows 安装程序

运行以下命令打包应用：

```bash
npm run build
```

打包完成后，安装程序将位于 `dist` 目录中。

## 开发模式

如果需要开发调试，可以使用：

```bash
npm run dev
```

## 常见问题

### 1. 安装依赖失败

如果遇到网络问题，可以使用国内镜像：

```bash
npm install --registry=https://registry.npmmirror.com
```

### 2. Electron 下载慢

Electron 二进制文件较大，首次安装可能需要较长时间，请耐心等待。

### 3. 运行时错误

确保已正确安装所有依赖，如果仍有问题，尝试删除 `node_modules` 文件夹后重新安装：

```bash
rmdir /s node_modules
npm install
```

## 系统要求

- Windows 7 或更高版本
- Node.js 16+ 
- 至少 100MB 可用磁盘空间
