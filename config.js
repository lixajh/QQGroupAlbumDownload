// 配置文件
const config = {
  // QQ群号
  qqGroupNumber: '792054520', // 默认值，用户需要修改为实际的群号  
  
  // 下载文件夹地址 - 修改为桌面路径，避免electronmon检测到文件变化导致页面重加载
  downloadPath: require('path').join(require('os').homedir(), 'Desktop/QQ群相册下载') // 下载到桌面的QQ群相册下载文件夹
};

module.exports = config;