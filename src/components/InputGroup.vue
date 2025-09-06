<template>
  <div class="container">
    <div style="max-width: 300px">
      <div style="text-align: center; font-size: 18px; margin-bottom: 30px">配置已加载</div>
      <div style="text-align: center; margin-bottom: 20px">正在自动获取相册列表...</div>
      <div style="margin: 30px 0 50px">
        <el-card style="width: 240px; margin: 0 auto">
          <template #header>
            <div class="card-header">
              <span>当前配置</span>
            </div>
          </template>
          <div style="text-align: left; padding: 10px 0">
            <div>群号: {{ config?.qqGroupNumber || '加载中...' }}</div>
            <div>下载路径: {{ config?.downloadPath || '加载中...' }}</div>
          </div>
        </el-card>
      </div>
      <div>
        <el-button @click="refreshAlbumList" style="width: 100%" type="primary">
          刷新相册列表
        </el-button>
      </div>
      <div style="margin-top: 50px">
        <el-row>
          <el-col :span="8"
            ><el-link type="primary" @click="openGithub"
              >开源地址</el-link
            ></el-col
          >
          <el-col :span="8">
            <el-link type="warning" @click="openDialog">作者寄语</el-link>
          </el-col>
          <el-col :span="8">
            <el-link type="danger" @click="openDouyin">关注作者</el-link>
          </el-col>
        </el-row>
      </div>
      <div
        style="
          display: flex;
          justify-content: center;
          align-items: center;
          margin-top: 20px;
        "
      >
        <el-link :underline="false">作者 : 李恒道、chenyin626</el-link>
      </div>
    </div>
    <div class="contribute-list">
      <div>感谢 怪蜀黎小谢谢 打赏100元</div>
    </div>
    <div class="warning-tip">
      警告:本软件完全免费，请勿从TG/软件商城其他途径购买!
      <br />
      由于属于开源软件，任何人都可以根据源码重新打包，除开源地址以外渠道无法保证安全性！
    </div>
  </div>
</template>
<script lang="ts" setup>
import { ref, onMounted, defineEmits } from "vue";
import { ElMessage } from 'element-plus';
import { ElMessageBox } from 'element-plus';
const config = ref<any>(null);
const emit = defineEmits(["getQQAlbumList", "refreshAlbumList"]);

// 加载配置信息
const loadConfigInfo = async () => {
  console.log('InputGroup: 开始加载配置信息');
  try {
    const configInfo = await window.QQ.getConfigInfo();
    console.log('InputGroup: 配置信息加载成功:', configInfo);
    config.value = configInfo;
  } catch (error) {
    console.error('InputGroup: 加载配置信息失败:', error);
    ElMessage.error('加载配置信息失败');
  }
};

onMounted(() => {
  console.log('InputGroup组件挂载完成，开始加载配置');
  loadConfigInfo();
});
const openGithub = () => {
  window.QQ.openPage("https://github.com/lihengdao666/QQGroupAlbumDownload");
};
const openDouyin = () => {
  window.QQ.openPage(
    "https://www.douyin.com/user/MS4wLjABAAAAhIaXhpH9u5PIAaYxHmvEYQQsmhwrL0TcXzKd3KYML3hW1_WntJWphdyfoUt0Nwha?from_tab_name=main"
  );
};
const openDialog = () => {
  ElMessageBox.alert(
    `
  依托于曾经的上网小技巧<br/>
  我在QQ群与我的朋友们存储了大量的个人资料和照片<br/>
  QQ群相册因为战略性的转移从而维护不再频繁<br/>
  伴随着QQ收藏的违规图片无法查看及群图片的和谐<br/>
  让我逐渐有了恐慌情绪及迁移数据的想法<br/>
  但海量的照片已经无法在手机端进行查看和下载<br/>
  虽然NTQQ目前已经可以流畅的滑动和下载<br/>
  但是依然需要我徒手拉动上百次<br/>
  进行上万次的点选<br/>
  于是该项目应运而生<br/>
  希望能帮助广大网友进行数据迁移<br/>
  `,
    "作者寄语",
    {
      // if you want to disable its autofocus
      // autofocus: false,
      confirmButtonText: "已读",
      dangerouslyUseHTMLString: true,
    }
  );
};
// 手动刷新配置和相册列表
const refreshAlbumList = async () => {
  console.log('InputGroup: 刷新按钮被点击，开始刷新配置和相册列表');
  ElMessage({ message: '正在刷新配置...', type: 'info' });
  await loadConfigInfo();
  console.log('InputGroup: 配置刷新完成，触发refreshAlbumList事件通知父组件');
  emit('refreshAlbumList');
};
</script>
<style scoped>
.warning-tip {
  margin-top: 10px;
  color: red;
  font-size: 14px;
  line-height: 24px;
}
.container {
  display: flex;
  justify-content: center;
  flex-direction: column;
  align-items: center;
}
.contribute-list {
  margin: 10px 0;
  font-size: 15px;
  color: #0172a2;
}
</style>
