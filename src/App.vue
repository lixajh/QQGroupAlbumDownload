<template>
  <div class="main">
    <el-steps simple :active="stepActive">
      <el-step title="配置加载" :icon="Edit" />
      <el-step title="选择相册" :icon="PictureRounded" />
      <el-step title="处理任务" :icon="Download" />
    </el-steps>
    <div v-if="stepActive == 0" class="content">
      <InputGroup @refreshAlbumList="getQQAlbumListFromConfig" @getQQAlbumList="getQQAlbumList" />
    </div>
    <div
      v-if="stepActive == 1"
      style="
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        overflow: hidden;
      "
    >
      <SelectAlbum
        :qqAlbumList="qqAlbumList"
        :selectAlbumList="qqSelectAlbumList"
        @setSelectAlbumList="setSelectAlbumList"
        @back-page="backGroup"
        @startDownload="startDownload"
      ></SelectAlbum>
    </div>

    <div
      v-if="stepActive == 2"
      style="
        display: flex;
        flex: 1 1 0;
        flex-direction: column;
        overflow: hidden;
      "
    >
      <DownloadPage
        :qqAlbumList="qqSelectAlbumList"
        :qunId="qqGroupNum"
        @back-page="backSelectAlbum"
      >
      </DownloadPage>
    </div>
  </div>
</template>
<script lang="ts" setup>
import InputGroup from "@/components/InputGroup.vue";
import SelectAlbum from "@/components/SelectAlbum.vue";
import DownloadPage from "@/components/DownloadPage.vue";

import {
  Edit,
  Download,
  WindPower,
  PictureRounded,
} from "@element-plus/icons-vue";
import { ref, onMounted } from "vue";
import { ElMessage } from 'element-plus';

const stepActive = ref(0);
const qqGroupNum = ref("");
const downloadPath = ref("");
const qqAlbumList = ref<any[]>([]);
const qqSelectAlbumList = ref<any[]>([]);

// 从配置文件获取QQ群号和下载路径
onMounted(async () => {
  try {
    // 从主进程获取配置信息
    const config = await window.QQ.getConfigInfo();
    
    if (config && config.qqGroupNumber) {
      qqGroupNum.value = config.qqGroupNumber;
      downloadPath.value = config.downloadPath;
      
      // 自动获取相册列表
      await getQQAlbumListFromConfig();
    } else {
      ElMessage.error('配置文件读取失败或配置不完整，请检查config.js文件');
    }
  } catch (error) {
    ElMessage.error('获取配置信息失败');
  }
});

// 从配置的QQ群号获取相册列表
const getQQAlbumListFromConfig = async () => {
  try {
    if (!qqGroupNum.value) {
      ElMessage.error('QQ群号为空，请在config.js中配置');
      return;
    }
    
    const data = await window.QQ.getAlbumList(qqGroupNum.value);
    
    if (data.status === 'error') {
      ElMessage.error(data.msg);
      return;
    }
    
    qqAlbumList.value = data.data;
    stepActive.value = 1;
    qqSelectAlbumList.value = [];
  } catch (error) {
    ElMessage.error('获取相册列表失败');
  }
};

const getQQAlbumList = (list: any) => {
  qqAlbumList.value = list;
  stepActive.value = 1;
  qqSelectAlbumList.value = [];
};

const setSelectAlbumList = (list: any) => {
  qqSelectAlbumList.value = list;
};

const startDownload=()=>{
  stepActive.value = 2;
}

const backSelectAlbum = () => {
  stepActive.value = 1;
};

const backGroup = () => {
  stepActive.value = 0;
};
</script>

<style lang="scss">
.main {
  height: 100%;
  padding: 3% 5%;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
}
.content {
  flex: 1 1 0;
  display: flex;
  justify-content: center;
  align-items: center;
}
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  height: 100vh;
}
body {
  margin: 0px;
}

nav {
  padding: 30px;

  a {
    font-weight: bold;
    color: #2c3e50;

    &.router-link-exact-active {
      color: #42b983;
    }
  }
}
</style>
