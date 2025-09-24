// 配置文件
const config = {
  // QQ群号
  qqGroupNumber: '792054520', // 默认值，用户需要修改为实际的群号  
  
  // 下载文件夹地址 - 修改为桌面路径，避免electronmon检测到文件变化导致页面重加载
  downloadPath: require('path').join(require('os').homedir(), 'Desktop/QQ群相册下载'), // 下载到桌面的QQ群相册下载文件夹
  
  // 人脸过滤相关配置
  autoFaceFilter: true, // 是否自动执行人脸过滤
  faceFilterTargetDir: require('path').join(require('os').homedir(), 'Desktop/QQ群相册下载/儿子照片'), // 人脸过滤结果保存目录
  faceFilterApiUrl: 'http://localhost:8000/recognize', // 人脸识别API地址
  faceFilterConfidenceThreshold: 0.001, // 置信度阈值
};

module.exports = config;