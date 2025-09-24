const { default: axios } = require("axios");
const { ipcMain, dialog, shell } = require("electron");
const fsExtra = require("fs-extra");
const path = require("path");
const { TaskStatus } = require("./consts");
const { getCookies, getQQ, getTk, isLoginExpired } = require("./qqCore");
const CryptoJS = require("crypto-js");
const fs = require('fs');
const { exec } = require('child_process');
// 导入配置文件
const config = require('./config');
const { clearLoginInfo } = require('./qqCore');
// 从faceFilter模块导入runFaceFilter函数并重命名为jsRunFaceFilter
const { runFaceFilter: jsRunFaceFilter } = require('./faceFilter');

function getMD5FirstSixChars(input) {
  // 计算 MD5 哈希值
  const hash = CryptoJS.MD5(input).toString(CryptoJS.enc.Hex);

  // 取前六位字符
  const firstSixChars = hash.substring(0, 6);

  return firstSixChars;
}

// 获取配置信息
async function getConfigInfo(event) {
  console.log('ipcMain: getConfigInfo被调用，开始获取配置信息');
  try {
    const configInfo = {
      qqGroupNumber: config.qqGroupNumber,
      downloadPath: config.downloadPath
    };
    console.log('ipcMain: 配置信息获取成功:', configInfo);
    return configInfo;
  } catch (error) {
    console.error('ipcMain: 获取配置信息失败:', error);
    return { error: error.message };
  }
}

// 处理前端发送的日志
ipcMain.handle('sendLogToMain', async (event, message, level = 'info', data = null) => {
  try {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] [Frontend] [${level.toUpperCase()}] ${message}`;
    
    if (data) {
      try {
        logMessage += `\nData: ${JSON.stringify(data, null, 2)}`;
      } catch (e) {
        logMessage += `\nData: [Cannot stringify data]`;
      }
    }
    
    // 打印到主进程控制台，会被重定向到app.log
    console[level](logMessage);
    
    return { success: true };
  } catch (error) {
    console.error('Error handling frontend log:', error);
    return { success: false, error: error.message };
  }
});

async function getAlbumList(event, qunId) {
  console.log('ipcMain: getAlbumList被调用，群号:', qunId);
  
  // 检查登录信息有效性
  const currentTk = getTk();
  const currentQQ = getQQ();
  const currentCookies = getCookies();
  
  console.log('ipcMain: 检查当前登录信息:');
  console.log('ipcMain: QQ号:', currentQQ || '不存在');
  console.log('ipcMain: TK值:', currentTk ? '存在' : '不存在');
  console.log('ipcMain: Cookie长度:', currentCookies ? currentCookies.length : 0);
  console.log('ipcMain: 登录是否过期:', isLoginExpired() ? '是' : '否');
  
  // 如果登录信息不完整，提前返回错误
  if (!currentTk || !currentQQ || !currentCookies) {
    console.error('ipcMain: 登录信息不完整，无法获取相册列表');
    return {
      status: "error",
      msg: "登录信息不完整，请重新登录",
      details: {
        missingTk: !currentTk,
        missingQQ: !currentQQ,
        missingCookies: !currentCookies,
        isExpired: isLoginExpired()
      }
    };
  }
  
  const url = `https://h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_list_album_v2?g_tk=${currentTk}&callback=shine2_Callback&qunId=${qunId}&uin=${currentQQ}&start=0&num=1000&getMemberRole=1&inCharset=utf-8&outCharset=utf-8&source=qzone&attach_info=&callbackFun=shine2`;
  
  try {
    console.log('ipcMain: 准备发送HTTP请求获取相册列表，URL:', url);
    console.log('ipcMain: 请求头Cookie长度:', currentCookies.length);
    
    const startTime = Date.now();
    const { data } = await axios.get(url, {
      headers: {
        Cookie: currentCookies,
      },
      timeout: 30000, // 30秒超时
    });
    
    const endTime = Date.now();
    console.log(`ipcMain: HTTP请求返回成功，耗时: ${endTime - startTime}ms`);
    
    // 记录返回数据的前200个字符，避免日志过大
    const previewData = data.length > 200 ? data.substring(0, 200) + '...' : data;
    console.log('ipcMain: 返回数据预览:', previewData);
    
    // 检查访问权限
    if (data.indexOf("对不起，您") !== -1) {
      console.error('ipcMain: 访问权限检查失败，返回无访问权限错误');
      
      // 尝试定位具体的错误信息
      let errorMsg = "无访问权限";
      if (data.indexOf("无权访问") !== -1) {
        errorMsg = "您没有权限访问该群相册";
      } else if (data.indexOf("登录") !== -1) {
        errorMsg = "登录已失效，请重新登录";
      } else if (data.indexOf("不存在") !== -1) {
        errorMsg = "该群或相册不存在";
      }
      
      console.log('ipcMain: 详细错误信息:', errorMsg);
      return {
        status: "error",
        msg: errorMsg,
        details: {
          rawResponse: previewData,
          isLoginExpired: isLoginExpired()
        }
      };
    }
    
    console.log('ipcMain: 开始解析相册数据');
    let list = 
      new Function("", "const shine2_Callback=a=>a;return " + data)().data
        .album ?? [];

    list = list
      .map((item) => {
        return {
          id: item.id,
          title: item.title,
          num: item.photocnt,
        };
      })
      .filter((item) => item.num != 0);
      
    console.log('ipcMain: 相册数据解析完成，共获取到', list.length, '个有效相册');
        console.log('ipcMain: 相册数据详细结构:', JSON.stringify(list, null, 2));
    return {
      status: "success",
      data: list,
    };
  } catch (error) {
    console.error('ipcMain: 获取相册列表发生异常:', error);

    return {
      status: "error",
      msg: "未知错误",
    };
  }
}
async function getPatchAlbum(qunId, albumId, start) {
  const url = `https://h5.qzone.qq.com/groupphoto/inqq?g_tk=` + getTk();
  const postData = `"qunId=${qunId}&albumId=${albumId}&uin=${getQQ()}&start=${start}&num=36&getCommentCnt=0&getMemberRole=0&hostUin=${getQQ()}&getalbum=0&platform=qzone&inCharset=utf-8&outCharset=utf-8&source=qzone&cmd=qunGetPhotoList&qunid=${qunId}&albumid=${albumId}&attach_info=start_count%3D${start}"`;
  try {
    const { data } = await axios.post(url, postData, {
      headers: {
        Cookie: getCookies(),
        "Referrer-Policy": "strict-origin-when-cross-origin",
        accept: "application/json, text/javascript, */*; q=0.01",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "sec-ch-ua":
          '"Google Chrome";v="131", "Chromium";v="131", "Not_A Brand";v="24"',
        "x-requested-with": "XMLHttpRequest",
      },
    });

    let list = data.data.photolist;
    list = list
      .map((item) => {
        const picList = [];
        for (const key in item.photourl) {
          picList.push(item.photourl[key]);
        }
        const originPic = picList.find((i) => {
          if (i.width === 0 && i.height === 0) {
            return true
          }
          return false
        })
        picList.sort((a, b) => {
          if (a.width !== b.width) {
            return b.width - a.width;
          }
          if (a.height !== b.height) {
            return b.height - a.height;
          }
          return b.enlarge_rate - a.enlarge_rate;
        });
        return {
          photoURL: (originPic || picList[0]).url, //目前未遇到不存在
          videoURL:
            item.videodata.actionurl == ""
              ? undefined
              : item.videodata.actionurl, //默认值空字符串
          name: item.sloc,
        };
      })
      .filter((item) => item.num != 0);
    return {
      status: "success",
      data: list,
    };
  } catch (error) {
    console.log(error);

    return {
      status: "error",
      msg: "未知错误",
    };
  }
}
let globalQueue;
let faceFilterQueue;

let download = async () => undefined;
function downloadFactory(userDir) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return async function (url, albumDirName, name) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      name = filterFileName(name);
      let albumName = sanitizeFileName(albumDirName);
      if (albumName.length == 0) {
        albumName = generateAlbumName(albumDirName);
      }
      const baseDir = path.join(userDir, "./" + albumName + "/");
      const fileName = path.join(userDir, "./" + albumName + "/" + name);
      await fsExtra.mkdirp(baseDir);
      // eslint-disable-next-line no-async-promise-executor
      const fileStatus = await new Promise(async (resolve) => {
        try {
          const result = await fsExtra.pathExists(fileName);
          resolve(result);
        } catch (error) {
          resolve(false);
        }
      });
      if (fileStatus) {
        resolve();
        return;
      }
      const stream = (
        await axios.get(url, {
          responseType: "stream",
        })
      ).data;
      const fileSteam = fsExtra.createWriteStream(fileName, {
        highWaterMark: 1000,
      });
      stream.pipe(fileSteam);
      let isEnd = false;
      const timer = setInterval(() => {
        if (isEnd) {
          isEnd = false;
        } else {
          clearInterval(timer);
          fileSteam.end();
          reject();
        }
      }, 30000);
      stream.on("end", () => {
        isEnd = true;
        clearInterval(timer);
        resolve();
      });
      stream.on("progress", () => {
        isEnd = true;
      });
    });
  };
}

async function createDownloadAlbum(event, qunId, arr) {
  await globalQueue?.pause();
  globalQueue = new queue();
  for (let index = 0; index < arr.length; index++) {
    const item = arr[index];
    globalQueue.addTask(new AlbumTask(qunId, item.id, item.num, item.title));
  }
  return true;
}

async function startDownloadAlbum() {
  try {
    // 从配置文件读取下载路径
    const downloadPath = config.downloadPath;
    
    // 检查下载路径是否存在，如果不存在则创建
    if (!fs.existsSync(downloadPath)) {
      fs.mkdirSync(downloadPath, { recursive: true });
    }
    
    download = downloadFactory(downloadPath);
    globalQueue?.run();
    return true;
  } catch (error) {
    console.error('下载路径配置错误:', error);
    dialog.showErrorBox('配置错误', `下载路径配置错误: ${error.message}`);
    return false;
  }
}

async function stopDownloadAlbum(event, id) {
  await globalQueue?.pause(id);
}
async function resumeDownloadAlbum(event, id) {
  await globalQueue?.resume(id);
}
function openPage(event, url) {
  shell.openExternal(url);
}
async function deleteDownloadAlbum(event, id) {
  if (id !== undefined) {
    await globalQueue?.delete(id);
  } else {
    await globalQueue?.deleteAll();
    globalQueue = undefined;
  }
}
async function getDownloadAlbumStatus() {
  return globalQueue?.getAllStatus() ?? [];
}

// 人脸过滤相关函数
async function createFaceFilterTask(albumId, title, sourceDir, targetDir, total) {
  if (!faceFilterQueue) {
    faceFilterQueue = new queue();
  }
  const task = new FaceFilterTask(albumId, title, sourceDir, targetDir, total);
  faceFilterQueue.addTask(task);
  return task.getSingleID();
}

async function startFaceFilterQueue() {
  if (faceFilterQueue) {
    faceFilterQueue.run();
  }
}

async function stopFaceFilter(event, id) {
  if (faceFilterQueue) {
    const task = faceFilterQueue.taskList.find(t => t.getSingleID() === id);
    if (task) {
      await task.stop();
      await faceFilterQueue.delete(id);
    }
  }
}

async function deleteFaceFilter(event, id) {
  if (faceFilterQueue) {
    await faceFilterQueue.delete(id);
  }
}

async function getFaceFilterStatus() {
  return faceFilterQueue?.getAllStatus() ?? [];
}
// 清除登录信息
async function handleClearLoginInfo() {
  try {
    clearLoginInfo();
    console.log('登录信息已清除');
    return { success: true };
  } catch (error) {
    console.error('清除登录信息失败:', error);
    return { success: false, error: error.message };
  }
}

// 导入JavaScript版的人脸过滤模块 - 已在文件顶部导入

// 执行人脸过滤
function runFaceFilter(sourceDir, targetDir) {
  return new Promise((resolve, reject) => {
    console.log(`[人脸过滤] 开始执行JS版人脸过滤: 源目录=${sourceDir}, 目标目录=${targetDir}`);
    
    jsRunFaceFilter(sourceDir, targetDir)
      .then(result => {
        console.log(`[人脸过滤] JS版人脸过滤执行成功: 处理了${result.processed}个文件, 匹配了${result.matched}个文件`);
        resolve(`处理完成: ${result.processed}个文件, ${result.matched}个匹配`);
      })
      .catch(error => {
        console.error(`[人脸过滤] JS版人脸过滤执行失败: ${error.message}`);
        reject(error);
      });
  });
}
ipcMain?.handle("getAlbumList", getAlbumList);
ipcMain?.handle("getConfigInfo", getConfigInfo);
ipcMain?.handle("createDownloadAlbum", createDownloadAlbum);
ipcMain?.handle("startDownloadAlbum", startDownloadAlbum);
ipcMain?.handle("stopDownloadAlbum", stopDownloadAlbum);
ipcMain?.handle("resumeDownloadAlbum", resumeDownloadAlbum);
ipcMain?.handle("openPage", openPage);
ipcMain?.handle("deleteDownloadAlbum", deleteDownloadAlbum);
ipcMain?.handle("getDownloadAlbumStatus", getDownloadAlbumStatus);
ipcMain?.handle("clearLoginInfo", handleClearLoginInfo);
// 人脸过滤相关的IPC处理函数
ipcMain?.handle("getFaceFilterStatus", getFaceFilterStatus);
ipcMain?.handle("stopFaceFilter", stopFaceFilter);
ipcMain?.handle("deleteFaceFilter", deleteFaceFilter);
exports.getAlbumList = getAlbumList;
exports.getPatchAlbum = getPatchAlbum;
exports.getConfigInfo = getConfigInfo;
const sanitizeFileName = (fileName) => {
  return fileName.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, "");
};
const filterFileName = (name) => {
  return name.match(/[0-9a-zA-Z/.]*/g).join("");
};
const generateAlbumName = (albumDirName) => {
  const randomString = getMD5FirstSixChars(albumDirName);
  // 返回【相册下载】+ 6 个随机字符
  return `相册下载${randomString}`;
};

// 这部分涉及到下载功能
// 第一次首先考虑的是能限制数量并且顺序下载
// 更新后改成并发
// 但是涉及到任务的暂停，删除
// 之前的循环执行不适合
// 那么第一反应是分为一个完成数组，运行数组，等待数组
// 但是这样设计，暂停的任务再继续，需要更换不同数组
// 颠倒了用户顺序，而用户顺序是不能变的，就推翻了之前我们的设想
// 这个时候就考虑到一个显示的用户数组
// 一个进行下载的队列数组
// 所以设计了一个任务队列，一个运行队列，而用户的信息从taskList获取
// 监听子任务run的结束然后回调运行下一个子任务
// 如果用then反复暂停继续会多次监听，所以多封装一层callback
// 确保每个task的run函数只回调一次

class queue {
  taskList = []; //用户插入任务的顺序，具体的执行顺序由waiQueue和runList控制
  flag = ""; // pause 暂停 run 运行中
  maxRun = 2;
  runList = [];
  waitQueue = [];
  addTask(item) {
    this.taskList.push(item);
    this.waitQueue.push(item);
  }
  async delete(id) {
    //删除列表内容
    const itemIndex = this.taskList.findIndex(
      (item) => item.getSingleID() == id
    );
    if (itemIndex != -1) {
      this.taskList.splice(itemIndex, 1);
    }
    //如果在运行，需要暂停再删除  如果在等待，可以直接删除
    const runIndex = this.runList.findIndex((item) => item.getSingleID() == id);
    if (runIndex != -1) {
      await this.runList[runIndex].pause();
      this.runList.splice(runIndex, 1);
    } else {
      const waitIndex = this.waitQueue.findIndex(
        (item) => item.getSingleID() == id
      );
      if (waitIndex != -1) {
        this.waitQueue.splice(waitIndex, 1);
      }
    }
  }
  async deleteAll() {
    await this.pause();
    this.taskList.length = 0;
    this.runList.length = 0;
    this.waitQueue.length = 0;
  }
  async pause(id) {
    if (id == undefined) {
      //全局暂停
      this.flag = "pause";
    }
    const list = [];
    const addList = (item) => {
      list.push(item.pause());
    };
    for (let index = 0; index < this.runList.length; index++) {
      if (id == undefined) {
        addList(this.runList[index]);
      } else if (id === this.runList[index].getSingleID()) {
        addList(this.runList[index]);
      }
    }
    return Promise.all(list);
  }
  async resume(id) {
    if (id == undefined) {
      for (const item of this.runList) {
        item.resume();
      }
      this.run();
    } else {
      const index = this.taskList.findIndex((item) => item.getSingleID() == id);
      if (index !== -1) {
        this.taskList[index].resume();
        this.waitQueue.unshift(this.taskList[index]);
        this.run();
      }
    }
  }
  async runTask(index) {
    if (this.runList[index].isRun()) {
      return;
    }
    const id = this.runList[index].getSingleID();
    this.runList[index].registerRun(() => {
      if (this.flag == "run") {
        //队列运行中，且执行过任务才可以执行下一个任务
        const itemIndex = this.runList.findIndex(
          (item) => item.getSingleID() == id
        );
        //需要继续运行，删除队列进行处理
        if (itemIndex !== -1) {
          this.runList.splice(itemIndex, 1);
        }
        process.nextTick(() => {
          this.run();
        });
      }
    });
  }
  async run() {
    this.flag = "run";
    while (this.runList.length < this.maxRun && this.waitQueue.length !== 0) {
      const item = this.waitQueue.shift();
      this.runList.push(item);
    }
    for (let index = 0; index < this.runList.length; index++) {
      this.runTask(index);
    }
  }
  getAllStatus() {
    const list = [];
    for (const item of this.taskList) {
      const data = item.getStatus();
      list.push(data);
    }
    return list;
  }
}

// 人脸过滤任务类
class FaceFilterTask {
  albumId = "";
  title = "";
  total = 0;
  success = 0;
  fail = 0;
  runStatus = "wating";
  waitResolve = null;
  runCallback = null;
  currentFile = "";
  sourceDir = "";
  targetDir = "";
  isStopped = false;

  constructor(albumId, title, sourceDir, targetDir, total) {
    this.albumId = albumId;
    this.title = title;
    this.sourceDir = sourceDir;
    this.targetDir = targetDir;
    this.total = total;
  }
  getSingleID() {
    return `filter_${this.albumId}`;
  }

  async pause() {
    return new Promise((resolve) => {
      if (this.runStatus != "run") {
        resolve();
      } else {
        this.runStatus = "pause";
        this.waitResolve = resolve;
      }
    });
  }

  async resume() {
    if (this.runStatus == "pause") {
      this.runStatus = "wating";
    }
  }

  async stop() {
    this.isStopped = true;
    await this.pause();
  }

  isRun() {
    return this.runStatus == "run";
  }

  async registerRun(callback) {
    this.runCallback = callback;
    await this.run();
    if (this.runCallback) {
      this.runCallback();
      this.runCallback = undefined;
    }
  }

  async run() {
    if (this.runStatus != "wating" || this.isStopped) {
      return false;
    }
    this.runStatus = "run";
    
    try {
      await jsRunFaceFilter(this.sourceDir, this.targetDir, { 
        onFileProcessed: (fileName, success) => {
          this.currentFile = fileName;
          if (success) {
            this.success++;
          } else {
            this.fail++;
          }
        },
        onProgress: (current, total) => {
          // 进度回调，可用于更详细的进度显示
        },
        shouldStop: () => this.isStopped || this.runStatus !== "run"
      });
      
      if (!this.isStopped && this.runStatus === "run") {
        this.runStatus = "finish";
      }
    } catch (error) {
      console.error(`人脸过滤任务${this.title}执行失败:`, error);
      if (!this.isStopped) {
        this.runStatus = "error";
      }
    }

    if (this.runStatus === "pause") {
      this.waitResolve();
    }
  }

  getStatus() {
    let showText = "";
    if (this.runStatus === "run") {
      showText = `处理中: ${this.currentFile} (${this.success}/${this.total})`;
    } else if (this.success == 0 && this.fail == 0) {
      showText = `等待中`;
    } else {
      showText = `成功:${this.success} 失败:${this.fail}`;
    }
    return {
      id: `filter_${this.albumId}`,
      num: this.total,
      fail: this.fail,
      success: this.success,
      status: this.runStatus,
      title: `[人脸识别]${this.title}`,
      showText: showText,
      type: 'filter'
    };
  }
}
class AlbumTask {
  list = [];
  qunId;
  albumId;
  start = 0;
  runStatus = TaskStatus.WATING;
  // wating 等待中 run 运行中 pause暂停中 finish完成 error 错误
  // 等待中->运行中
  // 运行中->暂停中/完成/错误
  // 暂停中->等待中
  waitResolve = undefined;
  success = 0;
  fail = 0;
  total = 0;
  title = "";
  runCallback = undefined;
  constructor(qunId, albumId, total, title) {
    this.qunId = qunId;
    this.albumId = albumId;
    this.total = total;
    this.title = title;
  }
  getSingleID() {
    return this.albumId;
  }

  async nextAlbum() {
    for (let index = 0; index < 3; index++) {
      const data = await getPatchAlbum(this.qunId, this.albumId, this.start);
      if (data.status == "success") {
        this.start += 40;
        this.list = data.data;
        return;
      }
    }
    this.list = [];
    this.runStatus = TaskStatus.ERROR;
  }
  isRun() {
    return this.runStatus == TaskStatus.RUN;
  }
  async pause() {
    return new Promise((resolve) => {
      if (this.runStatus != TaskStatus.RUN) {
        resolve();
      } else {
        this.runStatus = TaskStatus.PAUSE;
        this.waitResolve = resolve;
      }
    });
  }
  async resume() {
    if (this.runStatus == TaskStatus.PAUSE) {
      this.runStatus = TaskStatus.WATING;
    }
  }
  async registerRun(callback) {
    this.runCallback = callback;
    await this.run();
    if (this.runCallback) {
      this.runCallback();
      this.runCallback = undefined;
    }
  }
  async run() {
    if (this.runStatus != TaskStatus.WATING) {
      return false;
    }
    this.runStatus = TaskStatus.RUN;
    if (this.runStatus == TaskStatus.ERROR || this.list.length == 0) {
      // 理论第一个判断是失效的
      // 因为执行nextAlbum，相册必然为0
      // 这里当暂停，继续的时候相册刚好为0则获取下一部分
      // 首次执行为0也获取下一部分
      // 如果溢出腾讯会自动返回空数组，无需担心
      await this.nextAlbum();
    }
    while (this.list.length !== 0 && this.runStatus == TaskStatus.RUN) {
      const item = this.list.pop();
      try {
        await download(item.photoURL, this.title, item.name + ".jpg");
        if (item.videoURL) {
          await download(item.videoURL, this.title, item.name + ".mp4");
          this.success++;
        } else {
          this.success++;
        }
      } catch (error) {
        this.fail++;
      }
      //离开状态
      if (this.runStatus != TaskStatus.RUN) {
        break;
      }
      if (this.list.length == 0) {
        await this.nextAlbum();
      }
    }
    if (this.runStatus === TaskStatus.PAUSE) {
      // 回调暂停
      this.waitResolve();
    } else if (this.runStatus == TaskStatus.RUN) {
      // 回调完成
      this.runStatus = TaskStatus.FINISH;
      
      // 如果配置了自动人脸过滤，则执行
      if (config.autoFaceFilter && config.faceFilterTargetDir) {
        const albumDir = path.join(config.downloadPath, this.title);
        const targetDir = path.join(config.faceFilterTargetDir, this.title);
        
        try {
          // 获取相册中的图片总数作为人脸过滤任务的总数
          const files = fs.readdirSync(albumDir);
          const imageFiles = files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.jpg', '.jpeg', '.png', '.gif'].includes(ext);
          });
          
          // 创建人脸过滤任务
          console.log(`为相册${this.title}创建人脸过滤任务，共${imageFiles.length}个图片文件`);
          await createFaceFilterTask(this.albumId, this.title, albumDir, targetDir, imageFiles.length);
          
          // 启动人脸过滤队列
          startFaceFilterQueue();
          
          console.log(`相册${this.title}人脸过滤任务已创建并加入队列`);
        } catch (error) {
          console.error(`创建人脸过滤任务失败:`, error);
        }
      }
    }
    return true;
  }
  getStatus() {
    let showText = "";
    if (this.success == 0 && this.fail == 0) {
      showText = `无执行内容`;
    } else {
      showText = `成功:${this.success} 失败:${this.fail}`;
    }
    return {
      id: this.albumId,
      num: this.total,
      fail: this.fail,
      success: this.success,
      status: this.runStatus,
      title: this.title,
      showText: showText,
    };
  }
}


