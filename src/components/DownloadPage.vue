<template>
  <div
    style="display: flex; flex: 1 1 0; flex-direction: column; overflow: hidden"
  >
    <el-scrollbar height="100%">
      <el-table
        :data="showList"
        style="width: 100%; padding: 20px 0px; box-sizing: border-box"
      >
        <el-table-column align="center" prop="title" label="名称" />
        <el-table-column align="center" prop="num" label="数量" />
        <el-table-column align="center" prop="showText" label="状态">
          <template #default="scope">
            <div>
              {{ scope.row.showText }}
            </div>
          </template>
        </el-table-column>
        <el-table-column align="center" prop="status" label="执行状态">
          <template #default="scope">
            <div>
              {{ TaskStatusText[scope.row.status] }}
            </div>
          </template>
        </el-table-column>
        <el-table-column align="center" prop="opera" label="操作" width="150">
          <template #default="scope">
            <div>
              <el-space>
                <el-button
                  @click="stopDownload(scope.row.id)"
                  v-if="scope.row.status !== TaskStatus.PAUSE"
                  :disabled="scope.row.status !== TaskStatus.RUN"
                  type="primary"
                  >暂停</el-button
                >
                <el-button
                  @click="resumeDownload(scope.row.id)"
                  v-else
                  type="success"
                  >继续</el-button
                >
                <el-button
                  @click="deleteDownload(scope.row.id)"
                  :disabled="scope.row.status == TaskStatus.FINISH"
                  type="danger"
                  >删除</el-button
                >
              </el-space>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-scrollbar>
  </div>
  <div>
    <el-row>
      <el-col :span="8" style="padding: 0% 5%">
        <el-button
          v-if="!isStart"
          @click="startDownload()"
          style="width: 100%"
          type="primary"
          >开始下载</el-button
        >
        <el-button
          v-if="isStart && !isPause"
          @click="stopDownload(undefined)"
          style="width: 100%"
          type="primary"
          >停止下载</el-button
        >
        <el-button
          v-if="isStart && isPause"
          @click="resumeDownload(undefined)"
          style="width: 100%"
          type="primary"
          >恢复下载</el-button
        ></el-col
      >
      <el-col :span="8" style="padding: 0% 5%">
        <el-button
          @click="deleteDownload(undefined)"
          style="width: 100%"
          type="danger"
          >删除全部</el-button
        >
      </el-col>
      <el-col :span="8" style="padding: 0% 5%">
        <el-button @click="backPage" style="width: 100%" type="warning"
          >返回上级</el-button
        >
      </el-col>
    </el-row>
  </div>
</template>
<script lang="ts" setup>
import { deepToRaw } from "@/utils";
import { TaskStatusText, TaskStatus } from "../../consts.js";
import { ref, defineProps, defineEmits, onMounted, onUnmounted } from "vue";
const props = defineProps({
  qqAlbumList: {
    type: Array,
    required: true,
  },
  qunId: {
    type: String,
    required: true,
  },
});
const emit = defineEmits(["backPage", "onFinish"]);

const showList = ref([]);
const isStart = ref(false);
const isPause = ref(false);
const backPage = () => {
  deleteDownload();
};
window.QQ.createDownloadAlbum(props.qunId, deepToRaw(props.qqAlbumList));
const startDownload = () => {
  window.QQ.startDownloadAlbum();
  isStart.value = true;
  getDownloadStatus()
};
const stopDownload = async (id?: string) => {
  window.QQ.stopDownloadAlbum(id);
  if (id == undefined) {
    isPause.value = true;
  }
  getDownloadStatus()
};
const resumeDownload = async (id?: string) => {
  window.QQ.resumeDownloadAlbum(id);
  if (id == undefined) {
    isPause.value = false;
  }
  getDownloadStatus()
};
const deleteDownload = async (id?: string) => {
  window.QQ.deleteDownloadAlbum(id);
  if (id == undefined) {
    emit("backPage");
  }
  getDownloadStatus()
};
const getDownloadStatus = async () => {
  const data = await window.QQ.getDownloadAlbumStatus();
  let isFinish = true;
  for (let index = 0; index < data.length; index++) {
    if (data[index].status !== "finish" && data[index].status !== "error") {
      isFinish = false;
    }
  }
  if (isFinish) {
    ElMessageBox.alert(`所有相册下载完毕！`, "信息提示", {
      confirmButtonText: "确认",
      dangerouslyUseHTMLString: true,
    });
    stopDownload();
    clearInterval(timer);
  }
  showList.value = data;
};
let timer: number | undefined = undefined;
onMounted(() => {
  getDownloadStatus();
  timer = setInterval(() => {
    getDownloadStatus();
  }, 1000);
});
onUnmounted(() => {
  clearInterval(timer);
  deleteDownload();
});
</script>
