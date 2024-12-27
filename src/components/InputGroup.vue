<template>
  <div>
    <div>请输入下载相册的QQ群号</div>
    <div style="margin: 30px 0 50px">
      <el-input
        v-model="qqGroupNum"
        style="width: 240px"
        placeholder="请输入群号"
        clearable
      />
    </div>
    <div>
      <el-button @click="submitqqGroupNum" style="width: 100%" type="primary"
        >确认</el-button
      >
    </div>
    <div style="margin-top:50px;">
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
  </div>
</template>
<script lang="ts" setup>
import { defineModel, defineEmits } from "vue";
const qqGroupNum = defineModel<string>("qqGroupNum", {
  required: true,
});
const emit = defineEmits(["getQQAlbumList"]);
const openGithub = () => {
  window.QQ.openPage("https://github.com/lihengdao666/QQGroupAlbumDownload");
};
const openDouyin = () => {
  window.QQ.openPage(
    "https://www.douyin.com/user/MS4wLjABAAAAhIaXhpH9u5PIAaYxHmvEYQQsmhwrL0TcXzKd3KYML3hW1_WntJWphdyfoUt0Nwha?from_tab_name=main"
  );
};
const openDialog=()=>{
  ElMessageBox.alert(`
  依托于曾经的上网小技巧<br/>
  我在QQ群与我的朋友们存储了大量的个人资料和照片<br/>
  QQ群相册因为战略性的转移从而维护不再频繁<br/>
  伴随着QQ收藏的违规图片无法查看及群图片的和谐<br/>
  让我逐渐有了恐慌情绪及迁移数据的想法<br/>
  但海量的照片已经无法在手机端进行查看和下载<br/>
  虽然NTQQ目前已经可以流畅的滑动和下载<br/>
  但是依然需要我突然拉动上百次<br/>
  进行上万次的点选<br/>
  于是该项目应运而生<br/>
  希望能帮助广大网友进行数据迁移<br/>
  `, '作者寄语', {
    // if you want to disable its autofocus
    // autofocus: false,
    confirmButtonText: '已读',
    dangerouslyUseHTMLString: true,
  })
}
const submitqqGroupNum = async () => {
  if (qqGroupNum.value == "") {
    ElMessage.error("请输入内容");
    return;
  }
  if (qqGroupNum.value.match(/[^0-9]/g) !== null) {
    ElMessage.error("请输入正确的群号");
    return;
  }
  const data = await window.QQ.getAlbumList(qqGroupNum.value);
  if (data.status === "error") {
    ElMessage.error(data.msg);
    return;
  }
  emit("getQQAlbumList", data.data);
};
</script>
