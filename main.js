const { app, BrowserWindow, dialog } = require('electron');
const { setCookies, setTk, setQQ, isLoggedIn, getCookies, getTk, getQQ, isLoginExpired } = require("./qqCore");
require("./ipcMain.js");
const path = require("node:path");
const os = require('os');

let loginWindow;
let mainWindow;

const mainURL =
  process.env.NODE_ENV === "development"
    ? "http://localhost:8080"
    : path.join(__dirname, 'web', 'index.html');

const QQURL =
  "https://xui.ptlogin2.qq.com/cgi-bin/xlogin?proxy_url=https%3A//qzs.qq.com/qzone/v6/portal/proxy.html&daid=5&&hide_title_bar=1&low_login=0&qlogin_auto_login=1&no_verifyimg=1&link_target=blank&appid=549000912&style=22&target=self&s_url=https%3A%2F%2Fqzs.qq.com%2Fqzone%2Fv5%2Floginsucc.html%3Fpara%3Dizone&pt_qr_app=%E6%89%8B%E6%9C%BAQQ%E7%A9%BA%E9%97%B4&pt_qr_link=https%3A//z.qzone.com/download.html&self_regurl=https%3A//qzs.qq.com/qzone/v6/reg/index.html&pt_qr_help_link=https%3A//z.qzone.com/download.html&pt_no_auth=0";

function generateTK(str) {
  let hash = 5381;
  for (let i = 0, len = str.length; i < len; i++) {
    hash += (hash << 5) + str.charCodeAt(i);
  }
  return hash & 0x7fffffff;
}
function createMainWindow() {
  mainWindow = new BrowserWindow({
    height: 600,
    useContentSize: true,
    width: 800,
    title: "控制中心",
    autoHideMenuBar: true,
    webPreferences: {
      devTools: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL(mainURL);
  } else {
    mainWindow.loadFile(mainURL);
  }
    
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
      devTools: true,
    },
  });

  loginWindow.loadURL(QQURL);
  loginWindow.webContents.on("dom-ready", () => {
    const currentURL = loginWindow.webContents.getURL();
    if (currentURL.indexOf(`https://user.qzone.qq.com/`) !== -1) {
      loginWindow.webContents.session.cookies
        .get({ url: currentURL })
        .then((cookies) => {
          setCookies(
            cookies
              .map((cookie) => {
                if (cookie.name == "p_skey") {
                  setTk(generateTK(cookie.value));
                }
                if (cookie.name == "p_uin") {
                  setQQ(cookie.value.match(/[1-9][0-9]*/g));
                }
                return `${cookie.name}=${cookie.value}`;
              })
              .join("; ")
          );

          dialog
            .showMessageBox(loginWindow, {
              type: "info",
              title: "信息",
              message: "登陆成功！",
              buttons: ["OK"],
            })
            .then(() => {
              createMainWindow();
              loginWindow.destroy();
            });
        });
    }
  });

  loginWindow.on("closed", function () {
    loginWindow = null;
  });
}

// 应用启动时检查是否已登录
app.whenReady().then(() => {
  console.log('应用启动，开始检查登录状态');
  
  // 详细检查登录状态
  console.log('当前登录信息概览:');
  console.log('QQ号:', getQQ() ? getQQ() : '不存在');
  console.log('Cookie状态:', getCookies() ? '存在' : '不存在');
  console.log('TK状态:', getTk() ? '存在' : '不存在');
  
  // 检查是否有有效的登录信息
  if (isLoggedIn()) {
    console.log('主程序检测到有效的登录信息，直接进入主界面');
    
    // 显示登录信息详情对话框
    dialog.showMessageBox({
      type: "info",
      title: "自动登录",
      message: "检测到有效的登录信息，正在自动登录...",
      detail: `QQ号: ${getQQ() || '未知'}\n登录状态: 有效\n系统: ${os.platform()} ${os.arch()}`,
      buttons: ["确定"]
    }).then(() => {
      createMainWindow();
    });
  } else {
    // 如果没有有效的登录信息，显示登录窗口
    console.log('主程序没有检测到有效的登录信息，显示登录窗口');
    
    // 检查登录失效的具体原因
    if (isLoginExpired()) {
      console.log('登录失效原因: 登录信息已过期或不完整');
    } else {
      console.log('登录失效原因: 缺少必要的登录信息');
    }
    
    createWindow();
  }
});

app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", function () {
  if (loginWindow === null && mainWindow == null) {
    if (isLoggedIn()) {
      createMainWindow();
    } else {
      createWindow();
    }
  }
});
