const { default: axios } = require("axios");
const { ipcMain } = require("electron");
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

async function getAlbumList(qunId) {
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
    let list = new Function("", "const shine2_Callback=a=>a;return " + data)()
      .data.album;
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
    console.log(data);
    
    let list = data.data.photolist;
    console.log(list);
    list = list
      .map((item) => {
        return {
          photo: item.title,
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

function stopDownloadAlbum() {
  console.log("stopDownloadAlbum");
}
function downloadAlbum() {
  console.log("downloadAlbum");
}
ipcMain?.handle("getAlbumList", getAlbumList);
ipcMain?.handle("downloadAlbum", downloadAlbum);
ipcMain?.handle("stopDownloadAlbum", stopDownloadAlbum);

exports.getAlbumList = getAlbumList;
exports.getPatchAlbum = getPatchAlbum;
