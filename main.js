const { app, BrowserWindow ,dialog} = require("electron");

let loginWindow;
let mainWindow;
let cookieStr = "";
let tk = "";
let qq = "";




const QQURL =
  "https://xui.ptlogin2.qq.com/cgi-bin/xlogin?proxy_url=https%3A//qzs.qq.com/qzone/v6/portal/proxy.html&daid=5&&hide_title_bar=1&low_login=0&qlogin_auto_login=1&no_verifyimg=1&link_target=blank&appid=549000912&style=22&target=self&s_url=https%3A%2F%2Fqzs.qq.com%2Fqzone%2Fv5%2Floginsucc.html%3Fpara%3Dizone&pt_qr_app=%E6%89%8B%E6%9C%BAQQ%E7%A9%BA%E9%97%B4&pt_qr_link=https%3A//z.qzone.com/download.html&self_regurl=https%3A//qzs.qq.com/qzone/v6/reg/index.html&pt_qr_help_link=https%3A//z.qzone.com/download.html&pt_no_auth=0";
const getAlbumList = (qunId) => {
  const url = `https://h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_list_album_v2?g_tk=${tk}&callback=shine2_Callback&qunId=${qunId}&uin=${qq}&start=0&num=1000&getMemberRole=1&inCharset=utf-8&outCharset=utf-8&source=qzone&attach_info=&callbackFun=shine2`;
};
function getTK(str) {
  let hash = 5381;
  for (let i = 0, len = str.length; i < len; i++) {
    hash += (hash << 5) + str.charCodeAt(i);
  }
  return hash & 0x7fffffff;
}
function createMainWindow(){
  mainWindow = new BrowserWindow({
    height: 500,
    useContentSize: true,
    width: 800,
    title: "控制中心",
    autoHideMenuBar: true,
    webPreferences: {
      devTools: false,
    },
  });

  mainWindow.loadFile('dist/index.html');


  mainWindow.on("closed", function () {
    loginWindow = null;
  });
}

function createWindow() {
  loginWindow = new BrowserWindow({
    height: 500,
    useContentSize: true,
    width: 400,
    title: "登录QQ账号",
    autoHideMenuBar: true,
    webPreferences: {
      devTools: false,
    },
  });

  loginWindow.loadURL(QQURL);
  loginWindow.webContents.on("dom-ready", () => {
    const currentURL = loginWindow.webContents.getURL();
    if (currentURL.indexOf(`https://user.qzone.qq.com/`) !== -1) {
      loginWindow.webContents.session.cookies.get(
        { url: currentURL }
      ).then((cookies)=>{
        cookieStr = cookies
        .map((cookie) => {
          if (cookie.name == 'p_skey') {
            tk = getTK(cookie.value);
          }
          if (cookie.name == 'p_uin') {
            qq = cookie.value.match(/[1-9][0-9]*/g);
          }
          return `${cookie.name}=${cookie.value}`;
        })
        .join("; ");
      console.log("Cookies:", cookieStr, " tk:", tk, ` qq:${qq}`);
      dialog.showMessageBox(
        loginWindow,
        {
          type: "info",
          title: "信息",
          message: "登陆成功！",
          buttons: ["OK"],
        }
      ).then(()=>{
        createMainWindow()
        loginWindow.destroy()
      });
      })
    }
  });

  loginWindow.on("closed", function () {
    loginWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  if (loginWindow === null&&mainWindow==null) createWindow();
});
