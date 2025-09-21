# 人脸过滤功能集成规划

## 需求概述

在QQ群相册下载完成后，自动调用`face_filter.py`脚本，将识别为"儿子"(match=true)的照片自动复制到单独的文件夹中。

## 现有功能分析

### face_filter.py 功能分析

`face_filter.py`是一个独立的Python脚本，主要功能包括：

1. 遍历源路径中的所有图片文件
2. 调用本地API (http://localhost:8000/recognize) 进行人脸识别
3. 对识别结果进行判断，如果`match=true`则认为是目标人物
4. 将匹配成功的图片复制到指定的目标路径
5. 支持错误重试、文件存在检查等功能

### 现有下载流程分析

项目的下载功能主要在`ipcMain.js`中实现，核心组件包括：

1. `queue`类：管理下载任务队列，控制并发下载数量
2. `AlbumTask`类：表示单个相册的下载任务，包含下载状态管理
3. `download`函数：实际执行文件下载操作

下载完成后，`AlbumTask`的状态会变为`TaskStatus.FINISH`，但目前没有触发任何后续操作的机制。

## 集成方案

### 方案一：在主进程中集成（推荐）

在`ipcMain.js`中添加功能，当相册下载完成后自动调用`face_filter.py`脚本。

#### 实现步骤

1. 在`ipcMain.js`中添加一个新的函数，用于调用Python脚本
2. 修改`AlbumTask`类的`run`方法，在任务完成时触发人脸过滤
3. 添加配置项，允许用户自定义是否启用自动人脸过滤及目标文件夹路径

#### 代码实现示例

```javascript
// 在ipcMain.js中添加
const { exec } = require('child_process');
const path = require('path');

// 执行人脸过滤脚本
function runFaceFilter(sourceDir, targetDir) {
  return new Promise((resolve, reject) => {
    const pythonScript = path.join(__dirname, 'face_filter.py');
    const command = `python3 "${pythonScript}" "${sourceDir}" "${targetDir}"`;
    
    console.log(`正在执行人脸过滤: ${command}`);
    
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`人脸过滤执行失败: ${error.message}`);
        reject(error);
        return;
      }
      if (stderr) {
        console.error(`人脸过滤脚本错误输出: ${stderr}`);
      }
      console.log(`人脸过滤执行成功: ${stdout}`);
      resolve(stdout);
    });
  });
}

// 在config.js中添加配置项
// 在AlbumTask类的run方法末尾添加
if (this.runStatus == TaskStatus.RUN) {
  // 回调完成
  this.runStatus = TaskStatus.FINISH;
  
  // 如果配置了自动人脸过滤，则执行
  if (config.autoFaceFilter && config.faceFilterTargetDir) {
    const albumDir = path.join(config.downloadPath, this.title);
    const targetDir = path.join(config.faceFilterTargetDir, this.title);
    
    runFaceFilter(albumDir, targetDir)
      .then(() => {
        console.log(`相册${this.title}人脸过滤完成`);
        // 可以发送IPC消息通知渲染进程
      })
      .catch(error => {
        console.error(`相册${this.title}人脸过滤失败:`, error);
      });
  }
}
```

### 方案二：通过渲染进程触发

在前端添加一个按钮，允许用户手动触发人脸过滤功能。

#### 实现步骤

1. 在`ipcMain.js`中添加IPC处理函数，用于接收前端的人脸过滤请求
2. 在前端组件中添加触发按钮和配置项
3. 用户下载完成后，点击按钮触发人脸过滤

#### 代码实现示例

```javascript
// 在ipcMain.js中添加
ipcMain.handle('runFaceFilter', async (event, sourceDir, targetDir) => {
  try {
    await runFaceFilter(sourceDir, targetDir);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// 在preload.js中添加
preloadInjectObj.runFaceFilter = async (sourceDir, targetDir) => {
  return await ipcRenderer.invoke('runFaceFilter', sourceDir, targetDir);
};

// 前端组件中使用
async function onRunFaceFilter() {
  try {
    await window.api.runFaceFilter(sourceDir, targetDir);
    alert('人脸过滤完成');
  } catch (error) {
    alert('人脸过滤失败: ' + error.message);
  }
}
```

### 方案三：创建独立的Node.js模块

将`face_filter.py`的功能用Node.js重新实现，避免跨语言调用的复杂性。

#### 实现步骤

1. 创建一个新的Node.js模块，实现与`face_filter.py`相同的功能
2. 使用Node.js的HTTP客户端调用人脸识别API
3. 使用Node.js的文件系统模块处理文件复制
4. 在下载完成后直接调用该模块

## 推荐方案

推荐使用**方案一**，因为：

1. 自动化程度高，用户无需额外操作
2. 与现有下载流程无缝集成
3. 不需要修改Python脚本的功能
4. 实现相对简单

## 配置项设计

需要在`config.js`中添加以下配置项：

```javascript
module.exports = {
  // 现有配置项...
  
  // 人脸过滤相关配置
  autoFaceFilter: true, // 是否自动执行人脸过滤
  faceFilterTargetDir: './QQdownload/儿子照片', // 人脸过滤结果保存目录
  faceFilterApiUrl: 'http://localhost:8000/recognize', // 人脸识别API地址
  faceFilterConfidenceThreshold: 0.8, // 置信度阈值
};
```

## 注意事项

1. 确保本地的人脸识别API服务(`http://localhost:8000/recognize`)在下载过程中是可用的
2. 考虑大文件处理和性能优化，避免阻塞主进程
3. 添加错误处理和日志记录，方便排查问题
4. 确保目标文件夹有足够的存储空间和写入权限
5. 考虑添加进度反馈，让用户了解人脸过滤的进度

## 后续优化建议

1. 添加人脸识别API服务状态检测
2. 实现批量相册的人脸过滤功能
3. 添加过滤结果的通知机制
4. 支持多种过滤条件和多个人物的识别
5. 在前端添加人脸过滤的历史记录和统计信息