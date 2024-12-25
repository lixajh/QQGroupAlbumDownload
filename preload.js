const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('QQ', {
  getAlbumList: (qqGroup) => ipcRenderer.invoke('getAlbumList',qqGroup),
  downloadAlbum:() => ipcRenderer.invoke('downloadAlbum'),
  stopDownloadAlbum:() => ipcRenderer.invoke('stopDownloadAlbum')
})