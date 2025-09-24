// 人脸过滤功能测试脚本
const path = require('path');
const { runFaceFilter } = require('./faceFilter');
const config = require('./config');

// 测试参数
const testSourceDir = path.join(config.downloadPath, '测试相册'); // 替换为实际存在的测试相册目录
const testTargetDir = path.join(config.faceFilterTargetDir, '测试结果');

// 执行测试
console.log('开始测试JavaScript版人脸过滤功能...');
console.log(`测试参数:`);
console.log(`- 源目录: ${testSourceDir}`);
console.log(`- 目标目录: ${testTargetDir}`);
console.log(`- API地址: ${config.faceFilterApiUrl}`);
console.log(`- 置信度阈值: ${config.faceFilterConfidenceThreshold}`);

// 检查是否存在测试目录
const fs = require('fs-extra');
fs.pathExists(testSourceDir)
  .then(exists => {
    if (!exists) {
      console.log(`测试目录不存在: ${testSourceDir}`);
      console.log('请先创建测试目录并放入一些图片，或修改脚本中的测试目录路径。');
      return;
    }
    
    // 开始测试
    return runFaceFilter(testSourceDir, testTargetDir)
      .then(result => {
        if (result.success) {
          console.log(`\n测试成功!`);
          console.log(`- 总共处理文件数: ${result.processed}`);
          console.log(`- 匹配成功文件数: ${result.matched}`);
          console.log(`- 匹配率: ${(result.processed > 0 ? (result.matched / result.processed * 100).toFixed(2) : 0)}%`);
          console.log(`- 结果保存路径: ${testTargetDir}`);
        } else {
          console.error(`\n测试失败!`);
          console.error(`错误信息: ${result.error}`);
        }
      })
      .catch(error => {
        console.error(`\n测试过程中发生异常!`);
        console.error(error);
      });
  })
  .catch(error => {
    console.error('检查测试目录时发生错误:', error);
  });

// 使用说明:
// 1. 修改testSourceDir为实际存在的测试相册目录
// 2. 运行命令: node test_face_filter.js
// 3. 查看控制台输出的测试结果