#!/bin/bash

# 启动脚本 - 带日志记录功能
# 确保脚本有执行权限
chmod +x $0

# 停止可能正在运行的进程
pkill -f electron || true

# 清理之前的日志
rm -f app.log || true

# 使用electron直接启动应用并将所有输出重定向到日志文件
npm run electron-build-pro 2>&1 | tee app.log

# 提示用户如何查看日志
echo "\n应用已启动，日志已保存到app.log文件"
echo "\n日志查看方式："
echo "1. 主进程日志：在当前终端或通过以下命令在新终端查看实时日志："
echo "   tail -f app.log"
echo "2. 渲染进程日志：在应用窗口中按F12键打开开发者工具，切换到Console选项卡查看"
echo "3. 调试信息：在相册选择页面顶部可以看到直接显示的相册数据"