const axios = require('axios');
const { getCookies, getQQ, getTk, isLoginExpired } = require('../qqCore');
const config = require('../config');

(async () => {
  try {
    const cookies = getCookies();
    const qq = getQQ();
    const tk = getTk();
    const qunId = config.qqGroupNumber;

    console.log('检查登录缓存并访问接口:');
    console.log('QQ号:', qq || '不存在');
    console.log('Cookie长度:', cookies ? cookies.length : 0);
    console.log('TK存在:', !!tk);
    console.log('登录是否过期(本地判断):', isLoginExpired() ? '是' : '否');
    console.log('群号:', qunId);

    if (!cookies || !qq || !tk) {
      console.log('缓存登录信息不完整，无法调用接口。');
      process.exit(2);
    }

    const url = `https://h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_list_album_v2?g_tk=${tk}&callback=shine2_Callback&qunId=${qunId}&uin=${qq}&start=0&num=1&getMemberRole=1&inCharset=utf-8&outCharset=utf-8&source=qzone&attach_info=&callbackFun=shine2`;

    console.log('请求URL:', url);

    const start = Date.now();
    const res = await axios.get(url, {
      headers: { Cookie: cookies },
      timeout: 15000,
    });
    const cost = Date.now() - start;

    const data = res.data || '';
    const preview = typeof data === 'string' ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500);

    console.log('HTTP状态码:', res.status);
    console.log('耗时(ms):', cost);
    console.log('响应预览(500字符):\n', preview);

    // 简单错误特征分析
    if (typeof data === 'string') {
      if (data.includes('对不起，您') || data.includes('无权访问')) {
        console.log('检测到权限错误: 可能无权访问该群相册');
      } else if (data.includes('登录') || data.includes('失效')) {
        console.log('检测到登录状态问题: 可能登录已失效');
      } else if (data.includes('不存在')) {
        console.log('检测到资源不存在错误');
      } else {
        console.log('未检测到明显错误关键字，需进一步分析完整响应');
      }
    }
  } catch (err) {
    console.log('请求发生异常');
    if (err.response) {
      const preview = typeof err.response.data === 'string'
        ? err.response.data.slice(0, 500)
        : JSON.stringify(err.response.data || {}).slice(0, 500);
      console.log('HTTP状态码:', err.response.status);
      console.log('响应预览(500字符):\n', preview);
    } else {
      console.log('错误消息:', err.message);
    }
    process.exit(1);
  }
})();