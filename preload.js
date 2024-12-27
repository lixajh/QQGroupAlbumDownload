const { contextBridge, ipcRenderer } = require("electron");

const preloadInjectObj = {
  openPage: (url) => ipcRenderer.invoke("openPage", url),
  getAlbumList: (qqGroup) => ipcRenderer.invoke("getAlbumList", qqGroup),
  createDownloadAlbum: (qunId, arr) =>
    ipcRenderer.invoke("createDownloadAlbum", qunId, arr),
  stopDownloadAlbum: (id) => ipcRenderer.invoke("stopDownloadAlbum", id),
  resumeDownloadAlbum: (id) => ipcRenderer.invoke("resumeDownloadAlbum", id),
  deleteDownloadAlbum: (id) => ipcRenderer.invoke("deleteDownloadAlbum", id),
  getDownloadAlbumStatus: () => ipcRenderer.invoke("getDownloadAlbumStatus"),
};

contextBridge.exposeInMainWorld("QQ", preloadInjectObj);
exports.preloadInjectObj=preloadInjectObj
