<template>
  <div class="main">
    <el-steps simple :active="stepActive">
      <el-step title="输入群号" :icon="Edit" />
      <el-step title="选择相册" :icon="PictureRounded" />
      <el-step title="处理任务" :icon="Download" />
      <el-step title="完成结果" :icon="WindPower" />
    </el-steps>
    <div class="content">
      <div v-if="stepActive == 0">
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
          <el-button
            @click="submitqqGroupNum"
            style="width: 100%"
            type="primary"
            >确认</el-button
          >
        </div>
      </div>
      <div v-if="stepActive == 1"></div>
      <div v-if="stepActive == 2"></div>
      <div v-if="stepActive == 3"></div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import {
  Edit,
  Download,
  WindPower,
  PictureRounded,
} from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import { ref } from "vue";
const stepActive = ref(0);
const qqGroupNum = ref("");
const submitqqGroupNum = () => {
  if (qqGroupNum.value == "") {
    ElMessage.error("请输入内容");
  }
  if (qqGroupNum.value.match(/[^0-9]/g) !== null) {
    ElMessage.error("请输入正确的群号");
  }
  stepActive.value=1
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
