const fs = require('fs-extra'); // 导入fs-extra模块
const path = require('path');
const axios = require('axios');
const FormData = require('form-data'); // 预先导入FormData
const config = require('./config');

// 支持的图片格式
const supportedFormats = ['.jpg', '.jpeg', '.png', '.bmp', '.gif'];

/**
 * 检查文件是否为支持的图片格式
 * @param {string} filename - 文件名
 * @returns {boolean} - 是否为支持的图片格式
 */
function isImageFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  return supportedFormats.includes(ext);
}

/**
 * 调用人脸识别API识别图片中的人脸，返回匹配结果和置信度
 * @param {string} imagePath - 图片路径
 * @returns {Promise<{match: boolean, confidence: number|null}>}
 */
async function recognizeFace(imagePath) {
  const maxRetries = 3;
  const retryDelay = 2000; // 2秒
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // 检查图片文件是否存在
      if (!await fs.pathExists(imagePath)) {
        console.log(`[错误] 图片文件不存在: ${imagePath}`);
        return { match: false, confidence: null };
      }
      
      // 检查文件大小
      const fileSize = await fs.stat(imagePath);
      if (fileSize.size === 0) {
        console.log(`[错误] 图片文件为空: ${imagePath}`);
        return { match: false, confidence: null };
      }
      
      // 使用FormData正确地上传文件
      const formData = new FormData();
      formData.append('file', await fs.createReadStream(imagePath));
      
      // 调用API进行人脸识别
      const response = await axios.post(config.faceFilterApiUrl, 
        formData,
        {
          headers: {
            ...formData.getHeaders()
          },
          timeout: 30000 // 30秒超时
        }
      );
      
      // 检查状态码
      if (response.status !== 200) {
        if (attempt < maxRetries) {
          console.log(`[重试] API请求失败，状态码: ${response.status}，正在重试 (${attempt}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue;
        }
        console.log(`[错误] API请求失败，状态码: ${response.status}`);
        return { match: false, confidence: null };
      }
      
      // 解析JSON响应
      const result = response.data;
      
      // 获取匹配结果和置信度
      const match = result.match || false;
      const confidence = result.confidence || null;
      
      return { match, confidence };
      
    } catch (error) {
      if (attempt < maxRetries) {
        console.log(`[重试] API调用出错: ${error.message || '未知错误'}，正在重试 (${attempt}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        continue;
      }
      console.error(`[错误] API调用失败: ${error.message || '未知错误'}`);
      return { match: false, confidence: null };
    }
  }
}

/**
 * 遍历源目录中的所有图片文件
 * @param {string} sourceDir - 源目录路径
 * @returns {Promise<string[]>} - 图片文件路径列表
 */
async function getImageFiles(sourceDir) {
  const imageFiles = [];
  
  async function traverseDir(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory()) {
        await traverseDir(fullPath);
      } else if (entry.isFile() && isImageFile(entry.name)) {
        imageFiles.push(fullPath);
      }
    }
  }
  
  await traverseDir(sourceDir);
  return imageFiles;
}

/**
 * 执行人脸过滤
 * @param {string} sourceDir - 源目录路径
 * @param {string} targetDir - 目标目录路径
 * @param {Object} options - 选项参数
 * @param {Function} options.onFileProcessed - 文件处理完成回调
 * @param {Function} options.onProgress - 进度更新回调
 * @param {Function} options.shouldStop - 检查是否应停止处理的回调
 * @returns {Promise<{success: boolean, processed: number, matched: number, error?: string}>}
 */
async function runFaceFilter(sourceDir, targetDir, options = {}) {
  // 解构选项参数，设置默认值
  const {
    onFileProcessed = () => {},
    onProgress = () => {},
    shouldStop = () => false
  } = options;
  
  try {
    console.log(`[人脸过滤] 开始处理 - 源目录: ${sourceDir}, 目标目录: ${targetDir}`);
    
    // 确保目标目录存在
    await fs.ensureDir(targetDir);
    
    // 获取所有图片文件
    const imageFiles = await getImageFiles(sourceDir);
    console.log(`[人脸过滤] 找到 ${imageFiles.length} 个图片文件`);
    
    let processedCount = 0;
    let matchedCount = 0;
    
    // 逐个处理图片
    for (const imagePath of imageFiles) {
      // 检查是否需要停止处理
      if (shouldStop()) {
        console.log('[人脸过滤] 任务被停止');
        break;
      }
      
      processedCount++;
      let success = false;
      
      try {
        // 调用人脸识别API
        const { match, confidence } = await recognizeFace(imagePath);
        
        // 记录处理结果
        const relativePath = path.relative(sourceDir, imagePath);
        console.log(`[人脸过滤] 处理 ${relativePath}: 匹配=${match}, 置信度=${confidence}`);
        
        // 如果匹配成功
        if (match) {
          // 检查置信度是否达到阈值
          if (confidence >= config.faceFilterConfidenceThreshold) {
            // 构建目标文件路径
            const targetFilePath = path.join(targetDir, relativePath);
            
            // 确保目标文件的父目录存在
            await fs.ensureDir(path.dirname(targetFilePath));
            
            // 复制文件
            await fs.copyFile(imagePath, targetFilePath);
            matchedCount++;
            success = true;
            console.log(`[人脸过滤] 已复制匹配图片: ${relativePath} (置信度: ${confidence} >= 阈值: ${config.faceFilterConfidenceThreshold})`);
          } else {
            console.log(`[人脸过滤] 匹配但置信度未达阈值: ${relativePath} (置信度: ${confidence} < 阈值: ${config.faceFilterConfidenceThreshold})`);
          }
        }
      } catch (error) {
        console.error(`[人脸过滤] 处理文件失败: ${imagePath}，错误: ${error.message}`);
      } finally {
        // 调用回调函数
        const relativePath = path.relative(sourceDir, imagePath);
        onFileProcessed(relativePath, success);
        onProgress(processedCount, imageFiles.length);
      }
      
      // 显示进度
      if (processedCount % 10 === 0 || processedCount === imageFiles.length) {
        console.log(`[人脸过滤] 进度: ${processedCount}/${imageFiles.length} 已处理, ${matchedCount} 个匹配`);
      }
    }
    
    console.log(`[人脸过滤] 处理完成 - 共处理 ${processedCount} 个文件, ${matchedCount} 个匹配`);
    
    // 任务完成后，删除下载的全部照片（源目录）
    try {
      if (sourceDir && targetDir && sourceDir !== targetDir) {
        console.log(`[人脸过滤] 开始删除下载的照片目录: ${sourceDir}`);
        await fs.remove(sourceDir);
        console.log(`[人脸过滤] 已删除下载的照片目录: ${sourceDir}`);
      }
    } catch (error) {
      console.error(`[人脸过滤] 删除下载的照片目录失败: ${error.message}`);
    }
    
    return {
      success: true,
      processed: processedCount,
      matched: matchedCount
    };
    
  } catch (error) {
    console.error(`[人脸过滤] 执行失败: ${error.message}`);
    return {
      success: false,
      processed: 0,
      matched: 0,
      error: error.message
    };
  }
}

module.exports = {
  runFaceFilter,
  recognizeFace,
  isImageFile,
  getImageFiles
};