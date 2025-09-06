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
      <!-- 调试信息：直接显示相册列表数据 -->
      <div style="padding: 10px; background: #f0f0f0; margin-bottom: 10px;">
        <h3>调试信息</h3>
        <p>相册列表长度: {{ qqAlbumList.length }}</p>
        <pre>{{ JSON.stringify(qqAlbumList, null, 2) }}</pre>
        <el-button @click="manualRefreshAlbumList" type="primary" style="margin-top: 10px;">手动刷新相册列表</el-button>
        <el-button @click="testConsoleLog" type="info" style="margin-top: 10px; margin-left: 10px;">测试Console.log</el-button>
        <p style="color: #666; margin-top: 10px;">提示：按F12打开开发者工具，在Console选项卡查看日志输出</p>
      </div>
      
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
  console.log('App组件挂载完成，开始获取配置信息');
  try {
    // 从主进程获取配置信息
    console.log('正在调用window.QQ.getConfigInfo()');
    const config = await window.QQ.getConfigInfo();
    console.log('配置信息获取成功:', config);
    
    if (config && config.qqGroupNumber) {
      qqGroupNum.value = config.qqGroupNumber;
      downloadPath.value = config.downloadPath;
      console.log('配置已更新，群号:', qqGroupNum.value, '下载路径:', downloadPath.value);
      
      // 自动获取相册列表
      console.log('开始自动获取相册列表');
      await getQQAlbumListFromConfig();
    } else {
      console.error('配置文件读取失败或配置不完整');
      ElMessage.error('配置文件读取失败或配置不完整，请检查config.js文件');
    }
  } catch (error) {
    console.error('获取配置信息失败:', error);
    ElMessage.error('获取配置信息失败');
  }
});

// 从配置的QQ群号获取相册列表
const getQQAlbumListFromConfig = async () => {
  console.log('getQQAlbumListFromConfig函数开始执行');
  try {
    if (!qqGroupNum.value) {
      console.error('QQ群号为空，无法获取相册列表');
      ElMessage.error('QQ群号为空，请在config.js中配置');
      return;
    }
    
    console.log('正在调用window.QQ.getAlbumList()获取群相册列表，群号:', qqGroupNum.value);
    const data = await window.QQ.getAlbumList(qqGroupNum.value);
    console.log('相册列表获取结果:', data);
    
    if (data.status === 'error') {
      console.error('获取相册列表失败:', data.msg);
      ElMessage.error(data.msg);
      return;
    }
    
    qqAlbumList.value = data.data;
    console.log('相册列表数据详情:', JSON.stringify(qqAlbumList.value, null, 2));
    console.log('相册列表长度:', qqAlbumList.value?.length || 0);
    stepActive.value = 1;
    qqSelectAlbumList.value = [];
    console.log('相册列表获取成功，已跳转到相册选择页面，当前stepActive:', stepActive.value);
  } catch (error) {
    console.error('获取相册列表发生异常:', error);
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

// 手动刷新相册列表
const manualRefreshAlbumList = async () => {
  try {
    console.log('手动刷新相册列表');
    await getQQAlbumListFromConfig();
    ElMessage.success('相册列表刷新成功');
  } catch (error) {
    console.error('手动刷新相册列表失败:', error);
    ElMessage.error('相册列表刷新失败');
  }
};

// 测试console.log输出
const testConsoleLog = () => {
  console.log('这是一个测试日志 - 时间:', new Date().toLocaleTimeString());
  console.log('当前相册列表数据:', qqAlbumList.value);
  ElMessage.info('日志已输出到开发者工具的Console选项卡');
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
