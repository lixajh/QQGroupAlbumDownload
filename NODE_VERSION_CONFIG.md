# Node.js版本配置说明

## 项目背景

在运行QQGroupAlbumDownload项目时，我们遇到了Node.js版本兼容性问题。项目依赖的`@achrinza/node-ipc@9.2.9`模块需要Node.js 8-22版本，而当前系统默认安装的是Node.js 24.3.0版本。

## 已完成的配置

我们已经：
1. 通过Homebrew安装了Node版本管理器nvm (0.40.3)
2. 安装了兼容的Node.js版本 22.10.0
3. 配置了国内镜像源以加速依赖安装
4. 创建了`.nvmrc`文件指定项目需要的Node.js版本
5. 创建了`start-app.sh`启动脚本，自动处理版本切换和应用启动

## 如何确保关闭再打开项目时Node.js版本正确

以下是三种确保Node.js版本正确的方法：

### 方法一：使用启动脚本（推荐）

最简单的方法是使用我们创建的启动脚本：

```bash
# 在项目根目录执行
./start-app.sh
```

这个脚本会自动：
- 加载nvm环境
- 切换到项目指定的Node.js版本
- 检查并安装依赖（如果缺失）
- 构建项目
- 启动应用程序

### 方法二：手动配置nvm自动加载

为了确保每次打开终端时nvm可用，您可以手动将以下配置添加到`~/.zshrc`文件的末尾：

```bash
# 配置nvm
export NVM_DIR=~/.nvm
[ -s "/opt/homebrew/opt/nvm/nvm.sh" ] && . "/opt/homebrew/opt/nvm/nvm.sh"  # This loads nvm
[ -s "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm" ] && . "/opt/homebrew/opt/nvm/etc/bash_completion.d/nvm"  # This loads nvm bash_completion

# 进入项目目录时自动切换Node.js版本
# 注意：如果您使用自动切换功能，可能会在每次进入项目目录时略有延迟
cd() {
  builtin cd "$@" || return
  if [[ -f ".nvmrc" && -r ".nvmrc" ]]; then
    nvm use 2>/dev/null || echo "Warning: Failed to use Node version in .nvmrc"
  fi
}
```

添加后，执行以下命令使其生效：

```bash
source ~/.zshrc
```

### 方法三：手动切换Node.js版本

在每次进入项目目录后，手动执行以下命令：

```bash
# 加载nvm环境
export NVM_DIR=~/.nvm
source /opt/homebrew/opt/nvm/nvm.sh

# 切换到项目指定的Node.js版本
nvm use 22.10.0

# 启动应用
npm run electron-build-pro
```

## 验证Node.js版本

您可以通过以下命令验证当前使用的Node.js版本：

```bash
node --version
```

如果显示`v22.10.0`，则表示版本配置正确。

## 常见问题解决

1. **nvm命令找不到**：确保已正确加载nvm环境配置
2. **版本切换失败**：检查是否已安装指定版本的Node.js
3. **依赖安装缓慢**：我们已配置国内镜像源，应该会有所改善

如果遇到其他问题，请使用启动脚本`./start-app.sh`，它会提供详细的执行过程信息，帮助您排查问题。