const { default: axios } = require("axios");
const { ipcMain, dialog, shell } = require("electron");
const fsExtra = require("fs-extra");
const path = require("path");
const { TaskStatus } = require("./consts");
const { getCookies, getQQ, getTk } = require("./qqCore");
console.log("-----");
async function getAlbumList(event, qunId) {
  const url = `https://h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_list_album_v2?g_tk=${getTk()}&callback=shine2_Callback&qunId=${qunId}&uin=${getQQ()}&start=0&num=1000&getMemberRole=1&inCharset=utf-8&outCharset=utf-8&source=qzone&attach_info=&callbackFun=shine2`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        Cookie: getCookies(),
      },
    });
    if (data.indexOf("对不起，您") !== -1) {
      return {
        status: "error",
        msg: "无访问权限",
      };
    }
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
          photoURL: picList[0].url, //目前未遇到不存在
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

let download = async () => undefined;
function downloadFactory(userDir) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  return async function (url, albumName, name) {
    // eslint-disable-next-line no-async-promise-executor
    return new Promise(async (resolve, reject) => {
      name = filterFileName(name);
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
  const showDialog = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (showDialog.filePaths.length == 0) {
    return false;
  }
  download = downloadFactory(showDialog.filePaths[0]);
  globalQueue?.run();
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
ipcMain?.handle("getAlbumList", getAlbumList);
ipcMain?.handle("createDownloadAlbum", createDownloadAlbum);
ipcMain?.handle("startDownloadAlbum", startDownloadAlbum);
ipcMain?.handle("stopDownloadAlbum", stopDownloadAlbum);
ipcMain?.handle("resumeDownloadAlbum", resumeDownloadAlbum);
ipcMain?.handle("openPage", openPage);
ipcMain?.handle("deleteDownloadAlbum", deleteDownloadAlbum);
ipcMain?.handle("getDownloadAlbumStatus", getDownloadAlbumStatus);
exports.getAlbumList = getAlbumList;
exports.getPatchAlbum = getPatchAlbum;

const filterFileName = (name) => {
  return name.match(/[0-9a-zA-Z/.]*/g).join("");
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
