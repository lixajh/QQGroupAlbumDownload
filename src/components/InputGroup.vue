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
  </div>
</template>
<script lang="ts" setup>
import { ElMessage } from "element-plus";
import { defineModel, defineEmits } from "vue";
const qqGroupNum = defineModel<string>("qqGroupNum", {
  required: true,
});
const emit = defineEmits(["getQQAlbumList"]);
// const qqAlbumList = defineModel("qqAlbumList", {
//   required: true,
// });

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
  if (data === "error") {
    ElMessage.error(data.msg);
    return;
  }
  emit("getQQAlbumList", data.data);
};
</script>
