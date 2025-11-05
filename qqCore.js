const fs = require('fs-extra');
const path = require('path');
const os = require('os');
const axios = require('axios');
const config = require('./config');

// 配置文件路径
const configFilePath = path.join(os.homedir(), '.QQGroupAlbumDownload', 'loginInfo.json');

let cookieStr = "";
let tk = "";
let qq = "";
let loginTime = 0;

// 加载保存的登录信息
try {
  console.log('尝试加载登录信息，配置文件路径:', configFilePath);
  if (fs.existsSync(configFilePath)) {
    const data = fs.readJsonSync(configFilePath);
    cookieStr = data.cookieStr || "";
    tk = data.tk || "";
    qq = data.qq || "";
    loginTime = data.loginTime || 0;
    
    // 详细记录加载的登录信息状态
    console.log('已加载保存的登录信息，QQ号:', qq ? '存在' : '不存在', 
                'Cookie:', cookieStr ? '存在' : '不存在', 
                'TK:', tk ? '存在' : '不存在');
    
    const currentTime = Date.now();
    const loginAge = currentTime - loginTime;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    const daysRemaining = Math.ceil((sevenDays - loginAge) / (24 * 60 * 60 * 1000));
    
    console.log('登录时间戳:', new Date(loginTime).toLocaleString(), 
                '登录时长:', Math.floor(loginAge / (24 * 60 * 60 * 1000)), '天', 
                '剩余有效期:', daysRemaining, '天');
    
  } else {
    console.log('登录配置文件不存在');
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

// 在线校验缓存登录是否有效（动态判断）
exports.validateLoginOnline = async () => {
  try {
    if (!cookieStr || !tk || !qq) {
      return { ok: false, reason: 'missing' };
    }
    const uin = Array.isArray(qq) ? qq[0] : qq;
    const qunId = config.qqGroupNumber;
    const url = `https://h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_list_album_v2?g_tk=${tk}&callback=shine2_Callback&qunId=${qunId}&uin=${uin}&start=0&num=1&getMemberRole=1&inCharset=utf-8&outCharset=utf-8&source=qzone&attach_info=&callbackFun=shine2`;

    const { data, status } = await axios.get(url, {
      headers: { Cookie: cookieStr },
      timeout: 15000,
    });

    if (status !== 200) {
      return { ok: null, reason: 'http', status };
    }
    const text = typeof data === 'string' ? data : JSON.stringify(data);
    // 典型失效特征
    if (
      text.includes('尚未登录') ||
      text.includes('登录超时') ||
      text.includes('未登录') ||
      text.includes('对不起，您尚未登录') ||
      text.includes('code":-3000') ||
      text.includes('subcode":-4001')
    ) {
      // 服务端已判定失效，立即清理缓存
      exports.clearLoginInfo();
      return { ok: false, reason: 'expired', code: -3000, subcode: -4001 };
    }
    return { ok: true };
  } catch (error) {
    // 网络异常或其他错误，不清理缓存，仅返回未知
    return { ok: null, reason: 'network', message: error.message };
  }
};

// 检查登录是否过期（7天有效期）
exports.isLoginExpired = () => {
  const currentTime = Date.now();
  const sevenDays = 7 * 24 * 60 * 60 * 1000;
  
  // 检查各登录信息是否存在
  if (!cookieStr) {
    console.log('登录信息检查: Cookie为空');
    return true;
  }
  if (!tk) {
    console.log('登录信息检查: TK为空');
    return true;
  }
  if (!qq) {
    console.log('登录信息检查: QQ号为空');
    return true;
  }
  
  // 检查登录是否过期
  if (currentTime - loginTime > sevenDays) {
    const loginAgeDays = Math.floor((currentTime - loginTime) / (24 * 60 * 60 * 1000));
    console.log('登录信息检查: 登录已过期，已登录', loginAgeDays, '天，超过7天有效期');
    return true;
  }
  
  // 计算剩余有效期
  const daysRemaining = Math.ceil((sevenDays - (currentTime - loginTime)) / (24 * 60 * 60 * 1000));
  console.log('登录信息检查: 登录有效，剩余有效期:', daysRemaining, '天');
  return false;
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
  const isLoggedInStatus = !!cookieStr && !!tk && !!qq && !exports.isLoginExpired();
  
  if (isLoggedInStatus) {
    console.log('登录状态检查: 当前已处于登录状态');
  } else {
    console.log('登录状态检查: 当前未登录，需要重新登录');
    
    // 详细检查未登录的具体原因
    if (!cookieStr) {
      console.log('未登录原因: Cookie不存在或为空');
    }
    if (!tk) {
      console.log('未登录原因: TK不存在或为空');
    }
    if (!qq) {
      console.log('未登录原因: QQ号不存在或为空');
    }
    if (exports.isLoginExpired()) {
      console.log('未登录原因: 登录信息已过期');
    }
  }
  
  return isLoggedInStatus;
};
