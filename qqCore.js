const fs = require('fs-extra');
const path = require('path');
const os = require('os');

// 配置文件路径
const configFilePath = path.join(os.homedir(), '.QQGroupAlbumDownload', 'loginInfo.json');

let cookieStr = "";
let tk = "";
let qq = "";
let loginTime = 0;

// 加载保存的登录信息
try {
  if (fs.existsSync(configFilePath)) {
    const data = fs.readJsonSync(configFilePath);
    cookieStr = data.cookieStr || "";
    tk = data.tk || "";
    qq = data.qq || "";
    loginTime = data.loginTime || 0;
    console.log('已加载保存的登录信息');
  }
} catch (error) {
  console.error('加载登录信息失败:', error);
}

// 保存登录信息到文件
function saveLoginInfo() {
  try {
    // 确保目录存在
    fs.ensureDirSync(path.dirname(configFilePath));
    // 保存登录信息，包括时间戳以便检查登录是否过期
    fs.writeJsonSync(configFilePath, {
      cookieStr,
      tk,
      qq,
      loginTime: Date.now()
    });
    console.log('登录信息已保存');
  } catch (error) {
    console.error('保存登录信息失败:', error);
  }
}

// 清除登录信息
exports.clearLoginInfo = () => {
  cookieStr = "";
  tk = "";
  qq = "";
  loginTime = 0;
  try {
    if (fs.existsSync(configFilePath)) {
      fs.removeSync(configFilePath);
      console.log('登录信息已清除');
    }
  } catch (error) {
    console.error('清除登录信息失败:', error);
  }
};

// 检查登录是否过期（7天有效期）
exports.isLoginExpired = () => {
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - loginTime > sevenDays || !cookieStr || !tk || !qq;
};

// 设置并保存Tk值
exports.setTk = (value) => {
  tk = value;
  saveLoginInfo();
};

// 设置并保存QQ号
exports.setQQ = (value) => {
  qq = value;
  saveLoginInfo();
};

// 设置并保存Cookie
exports.setCookies = (value) => {
  cookieStr = value;
  saveLoginInfo();
};

// 获取Tk值
exports.getTk = () => {
  return tk
};

// 获取QQ号
exports.getQQ = () => {
  return qq
};

// 获取Cookie
exports.getCookies = () => {
  return cookieStr
};

// 检查是否已登录
exports.isLoggedIn = () => {
  return !!cookieStr && !!tk && !!qq && !exports.isLoginExpired();
};
