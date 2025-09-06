#!/bin/bash

# 启动应用前的准备工作
echo "正在准备启动QQGroupAlbumDownload应用..."

echo "1. 配置nvm环境..."
export NVM_DIR=~/.nvm
source /opt/homebrew/opt/nvm/nvm.sh

echo "2. 使用项目指定的Node.js版本..."
nvm use

if [ $? -ne 0 ]; then
  echo "警告: 无法自动切换到指定的Node.js版本，正在尝试手动设置..."
  nvm use 22.10.0
fi

echo "3. 查看当前Node.js版本..."
node --version

# 检查是否需要安装依赖
echo "4. 检查项目依赖..."
if [ ! -d "node_modules" ]; then
  echo "   依赖不存在，正在安装..."
  npm install
fi

# 构建项目（可选，根据需要取消注释）
echo "5. 构建项目..."
npm run build

# 启动应用
echo "6. 启动应用..."
npm run electron-build-pro