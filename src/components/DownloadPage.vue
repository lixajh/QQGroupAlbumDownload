<template>
  <div
    style="display: flex; flex: 1 1 0; flex-direction: column; overflow: hidden"
  >
    <el-scrollbar height="100%">
      <!-- 合并后的任务表格 -->
      <div v-if="allTasks.length > 0">
        <h3 style="margin-left: 20px; margin-top: 10px; margin-bottom: 10px;">任务列表</h3>
        <el-table
          :data="allTasks"
          style="width: 100%; padding: 20px 0px; box-sizing: border-box"
        >
          <el-table-column align="center" prop="type" label="任务类型">
            <template #default="scope">
              <div>
                {{ scope.row.type === 'download' ? '下载任务' : '人脸过滤任务' }}
              </div>
            </template>
          </el-table-column>
          <el-table-column align="center" prop="title" label="名称" />
          <el-table-column align="center" prop="num" label="数量" />
          <el-table-column align="center" prop="success" label="成功数" v-if="showSuccessColumn" />
          <el-table-column align="center" prop="fail" label="失败数" v-if="showFailColumn" />
          <el-table-column align="center" prop="status" label="状态">
            <template #default="scope">
              <div>
                {{ getStatusText(scope.row) }}
              </div>
            </template>
          </el-table-column>
          <el-table-column align="center" prop="opera" label="操作" width="150">
            <template #default="scope">
              <div>
                <el-space>
                  <!-- 下载任务操作 -->
                  <template v-if="scope.row.type === 'download'">
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
                  </template>
                  <!-- 人脸过滤任务操作 -->
                  <template v-else>
                    <el-button
                      @click="stopFaceFilter(scope.row.id)"
                      :disabled="scope.row.status !== TaskStatus.RUN"
                      type="primary"
                      >停止</el-button
                    >
                  </template>
                  <!-- 通用删除按钮 -->
                  <el-button
                    @click="deleteTask(scope.row.id, scope.row.type)"
                    :disabled="(scope.row.type === 'download' && scope.row.status == TaskStatus.FINISH) || 
                              (scope.row.type === 'filter' && scope.row.status == TaskStatus.FINISH)"
                    type="danger"
                    >删除</el-button
                  >
                </el-space>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
      
      <!-- 空状态提示 -->
      <div v-if="allTasks.length === 0" style="text-align: center; padding: 50px;">
        <p>暂无任务</p>
      </div>
    </el-scrollbar>
  </div>
  <div>
    <el-row>
      <el-col :span="8" style="padding: 0% 5%">
        <!-- 检查是否所有任务都已完成 -->
        <template v-if="isAllTasksFinished">
          <el-button
            @click="deleteAllTasks()"
            style="width: 100%"
            type="success"
            >完成</el-button
          >
        </template>
        <template v-else>
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
          >
        </template>
      </el-col>
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
import { ref, defineProps, defineEmits, onMounted, onUnmounted, computed } from "vue";
import { ElMessageBox } from 'element-plus';
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

const downloadTasks = ref([]);
const filterTasks = ref([]);
const isStart = ref(false);
const isPause = ref(false);

// 合并任务列表并添加任务类型
const allTasks = computed(() => {
  // 为下载任务添加类型标记
  const downloadWithType = downloadTasks.value.map(task => {
    if (typeof task !== 'object' || task === null) {
      return { type: 'download', status: 'error' };
    }
    return {
      ...task,
      type: 'download'
    };
  });
  
  // 为人脸过滤任务添加类型标记
  const filterWithType = filterTasks.value.map(task => {
    if (typeof task !== 'object' || task === null) {
      return { type: 'filter', status: 'error', num: 0 };
    }
    return {
      ...task,
      type: 'filter',
      // 确保数量字段存在
      num: (task as any).num || (task as any).total || 0
    };
  });
  
  // 合并两个任务列表
  return [...downloadWithType, ...filterWithType];
});

// 检查是否所有任务都已完成
const isAllTasksFinished = computed(() => {
  // 检查是否有任务
  if (allTasks.value.length === 0) {
    return false;
  }
  
  // 检查所有任务是否都已完成或失败
  return allTasks.value.every(task => 
    task.status === TaskStatus.FINISH || task.status === TaskStatus.ERROR
  );
});

// 检查是否需要显示成功数和失败数列
const showSuccessColumn = computed(() => {
  return allTasks.value.some(task => 'success' in task);
});

const showFailColumn = computed(() => {
  return allTasks.value.some(task => 'fail' in task);
});

// 获取状态文本，显示成功和失败
const getStatusText = (row) => {
  if (row.type === 'filter') {
    // 人脸过滤任务显示成功和失败
    return row.status === 'finish' ? '成功' : 
           row.status === 'error' ? '失败' : 
           TaskStatusText[row.status];
  }
  // 下载任务显示状态文本
  return row.status === 'finish' ? '成功' : 
         row.status === 'error' ? '失败' : 
         TaskStatusText[row.status];
};

const backPage = () => {
  deleteAllTasks();
};
window.QQ.createDownloadAlbum(props.qunId, deepToRaw(props.qqAlbumList));
const startDownload = () => {
  window.QQ.startDownloadAlbum();
  isStart.value = true;
  getTasksStatus();
};
const stopDownload = async (id?: string) => {
  window.QQ.stopDownloadAlbum(id);
  if (id == undefined) {
    isPause.value = true;
  }
  getTasksStatus();
};
const resumeDownload = async (id?: string) => {
  window.QQ.resumeDownloadAlbum(id);
  if (id == undefined) {
    isPause.value = false;
  }
  getTasksStatus();
};
const deleteDownload = async (id?: string) => {
  window.QQ.deleteDownloadAlbum(id);
  if (id == undefined) {
    emit("backPage");
  }
  getTasksStatus();
};
const stopFaceFilter = async (id?: string) => {
  window.QQ.stopFaceFilter(id);
  getTasksStatus();
};
const deleteFaceFilter = async (id?: string) => {
  window.QQ.deleteFaceFilter(id);
  getTasksStatus();
};

// 根据任务类型删除任务
const deleteTask = async (id: string, type: string) => {
  if (type === 'download') {
    await deleteDownload(id);
  } else {
    await deleteFaceFilter(id);
  }
};

const deleteAllTasks = async () => {
  // 先删除下载任务
  await window.QQ.deleteDownloadAlbum();
  // 再删除人脸过滤任务
  // 由于没有直接的API删除所有过滤任务，这里不做处理
  emit("backPage");
};
const getTasksStatus = async () => {
  try {
    // 获取下载任务状态
    const downloadData = await window.QQ.getDownloadAlbumStatus();
    
    // 获取人脸过滤任务状态
    const filterData = await window.QQ.getFaceFilterStatus();
    
    // 更新任务列表
    downloadTasks.value = downloadData;
    filterTasks.value = filterData;
    
    // 检查下载任务是否全部完成
    let isDownloadFinish = true;
    for (let index = 0; index < downloadData.length; index++) {
      if (downloadData[index].status !== "finish" && downloadData[index].status !== "error") {
        isDownloadFinish = false;
        break;
      }
    }
    
    // 如果下载全部完成，显示提示
    if (isDownloadFinish && isStart.value && downloadData.length > 0 && timer !== undefined) {
      // 检查是否还有活跃的人脸过滤任务
      const hasActiveFilterTasks = filterData.some(task => 
        task.status === "run" || task.status === "wating"
      );
      
      if (!hasActiveFilterTasks) {
        // 如果没有活跃的人脸过滤任务，显示下载完成提示
        ElMessageBox.alert(`所有下载和人脸过滤任务已完成！`, "信息提示", {
          confirmButtonText: "确认",
          dangerouslyUseHTMLString: true,
        });
        clearInterval(timer);
        timer = undefined;
      }
    }
  } catch (error) {
    console.error('获取任务状态失败:', error);
  }
};
let timer: number | undefined = undefined;
onMounted(() => {
  getTasksStatus();
  timer = setInterval(() => {
    getTasksStatus();
  }, 1000);
});
onUnmounted(() => {
  clearInterval(timer);
  deleteAllTasks();
});
</script>
