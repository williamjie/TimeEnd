# Git 提交代码到 Gitee

## 当前状态

- ✅ Git 仓库已初始化
- ✅ 文件已添加到暂存区
- ✅ 远程仓库已添加：`git@gitee.com:wiliam216/time-end.git`
- ⏳ 等待提交和推送

## 提交步骤

请在 Cursor 终端中依次运行以下命令：

### 方法1：使用批处理文件（推荐）

```powershell
.\git-commit.bat
```

### 方法2：手动执行命令

```powershell
# 1. 提交代码
git commit -m "first commit"

# 2. 推送到远程仓库
git push -u origin master
```

## 如果推送失败

### 问题1：SSH 密钥未配置

如果提示权限错误，可以改用 HTTPS：

```powershell
# 更改远程仓库地址为 HTTPS
git remote set-url origin https://gitee.com/wiliam216/time-end.git

# 然后推送
git push -u origin master
```

使用 HTTPS 时，Gitee 会要求输入用户名和密码。

### 问题2：分支名称问题

如果提示找不到 master 分支，可以：

```powershell
# 查看当前分支
git branch

# 如果分支是 main，使用：
git push -u origin main

# 或者重命名为 master：
git branch -M master
git push -u origin master
```

## 验证提交

提交成功后，访问以下地址查看代码：

https://gitee.com/wiliam216/time-end

## 后续操作

提交成功后，后续更新代码：

```powershell
git add .
git commit -m "更新说明"
git push
```
