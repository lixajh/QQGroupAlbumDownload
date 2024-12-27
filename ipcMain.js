const { default: axios } = require("axios");
const { ipcMain, dialog,shell } = require("electron");
const fsExtra = require("fs-extra");
const path = require("path");
let cookieStr = "";
let tk = "";
let qq = "";
exports.setTk = (value) => {
  tk = value;
};
exports.setQQ = (value) => {
  qq = value;
};
exports.setCookies = (value) => {
  cookieStr = value;
};

async function getAlbumList(event, qunId) {
  const url = `https://h5.qzone.qq.com/proxy/domain/u.photo.qzone.qq.com/cgi-bin/upp/qun_list_album_v2?g_tk=${tk}&callback=shine2_Callback&qunId=${qunId}&uin=${qq}&start=0&num=1000&getMemberRole=1&inCharset=utf-8&outCharset=utf-8&source=qzone&attach_info=&callbackFun=shine2`;
  try {
    const { data } = await axios.get(url, {
      headers: {
        Cookie: cookieStr,
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
//未完成
async function getPatchAlbum(qunId, albumId, start) {
  const url = `https://h5.qzone.qq.com/groupphoto/inqq?g_tk=` + tk;
  const postData = `"qunId=${qunId}&albumId=${albumId}&uin=${qq}&start=${start}&num=36&getCommentCnt=0&getMemberRole=0&hostUin=${qq}&getalbum=0&platform=qzone&inCharset=utf-8&outCharset=utf-8&source=qzone&cmd=qunGetPhotoList&qunid=${qunId}&albumid=${albumId}&attach_info=start_count%3D${start}"`;
  try {
    const { data } = await axios.post(url, postData, {
      headers: {
        Cookie: cookieStr,
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

let download = () => undefined;
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
  const showDialog = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (showDialog.filePaths.length == 0) {
    return false;
  }
  download = downloadFactory(showDialog.filePaths[0]);
  globalQueue = new queue();
  for (let index = 0; index < arr.length; index++) {
    const item = arr[index];
    globalQueue.add(new AlbumTask(qunId, item.id, item.num, item.title));
  }
  globalQueue?.run();
  return true;
}

async function stopDownloadAlbum(event, id) {
  await globalQueue?.pause(id);
}
async function resumeDownloadAlbum(event, id) {
  await globalQueue?.resume(id);
}
function openPage(event,url){
  shell.openExternal(url)
}
async function deleteDownloadAlbum(event, id) {
  await globalQueue?.pause(id);
  if (id !== undefined) {
    globalQueue.list = globalQueue.list.filter((item) => {
      return item.albumId != id;
    });
  } else {
    globalQueue = undefined;
  }
}
async function getDownloadAlbumStatus() {
  return globalQueue?.getAllStatus() ?? [];
}
ipcMain?.handle("getAlbumList", getAlbumList);
ipcMain?.handle("createDownloadAlbum", createDownloadAlbum);
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

class queue {
  list = [];
  add(item) {
    this.list.push(item);
  }
  async pause(id) {
    for (let index = 0; index < this.list.length; index++) {
      if (id == undefined) {
        await this.list[index].pause();
      } else if (id === this.list[index].albumId) {
        await this.list[index].pause();
      }
    }
  }
  async resume(id) {
    for (let index = 0; index < this.list.length; index++) {
      if (id == undefined) {
        this.list[index].resume();
      } else if (id === this.list[index].albumId) {
        this.list[index].resume();
      }
    }
    this.run();
  }
  async run() {
    //留余地，日后可并发
    for (let index = 0; index < this.list.length; index++) {
      await this.list[index].run();
    }
  }
  getAllStatus() {
    const list = [];
    for (let index = 0; index < this.list.length; index++) {
      const data = this.list[index].getStatus();
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
  runStatus = "wating"; //wating 等待中 run 运行中 pause暂停中 finish完成 error
  waitResolve = undefined;
  firstRun = true;
  success = 0;
  fail = 0;
  total = 0;
  title = "";
  constructor(qunId, albumId, total, title) {
    this.qunId = qunId;
    this.albumId = albumId;
    this.total = total;
    this.title = title;
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
    this.runStatus = "error";
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
    this.runStatus = "wating";
  }
  async run() {
    if (this.runStatus == "run") {
      return;
    }
    if (this.runStatus == "pause") {
      return;
    }
    if (this.runStatus == "finish") {
      return;
    }
    this.runStatus = "run";
    if (this.firstRun || this.runStatus == "error") {
      await this.nextAlbum();
      this.firstRun = false;
    }
    while (this.list.length !== 0 && this.runStatus == "run") {
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
      if (this.runStatus === "pause") {
        break;
      }

      if (this.list.length == 0) {
        await this.nextAlbum();
      }
    }
    if (this.runStatus === "pause") {
      this.waitResolve();
    } else if (this.runStatus != "error") {
      this.runStatus = "finish";
    }
  }
  getStatus() {
    return {
      id: this.albumId,
      num: this.total,
      fail: this.fail,
      success: this.success,
      status: this.runStatus,
      title: this.title,
      showText: `成功${this.success} 失败:${this.fail}`,
    };
  }
}
