<template>
  <div
    style="display: flex; flex: 1 1 0; flex-direction: column; overflow: hidden"
  >
    <!-- 显示相册数据结构 -->
    <div style="padding: 10px; background: #f0f0f0; margin-bottom: 10px;">
      <h3>SelectAlbum组件接收到的数据</h3>
      <p>数据长度: {{ props.qqAlbumList?.length || 0 }}</p>
      <p v-if="props.qqAlbumList?.length > 0">第一条数据结构: {{ JSON.stringify(props.qqAlbumList[0]) }}</p>
    </div>
    
    <el-scrollbar height="100%">
      <el-table
        ref="multipleTableRef"
        @selection-change="handleSelectionChange"
        :data="props.qqAlbumList"
        style="width: 100%; padding: 20px 0px; box-sizing: border-box"
      >
        <el-table-column align="center" type="selection" />
        <el-table-column align="center" prop="title" label="名称" />
        <el-table-column align="center" prop="num" label="数量" />
        <!-- 为了调试，显示所有可能的属性 -->
        <el-table-column align="center" label="所有数据">
          <template #default="scope">
            {{ JSON.stringify(scope.row) }}
          </template>
        </el-table-column>
      </el-table>
    </el-scrollbar>
  </div>

  <div>
    <el-row>
      <el-col :span="12" style="padding: 0% 5%">
        <el-button @click="startDownload" style="width: 100%" type="primary"
          >开始下载</el-button
        >
      </el-col>
      <el-col :span="12" style="padding: 0% 5%">
        <el-button @click="backPage" style="width: 100%" type="warning"
          >返回上级</el-button
        >
      </el-col>
    </el-row>
  </div>
</template>
<script lang="ts" setup>
import { defineProps, defineEmits, toRaw, ref, onMounted } from "vue";
import type { TableInstance } from "element-plus";
import { ElMessage } from 'element-plus';
// eslint-disable-next-line vue/no-setup-props-destructure
const props = defineProps({
  qqAlbumList: {
    type: Array,
    required: true,
  },
  selectAlbumList: {
    type: Array,
    required: true,
  },
});
const multipleTableRef = ref<TableInstance>();
onMounted(() => {
  console.log('SelectAlbum组件挂载完成，接收到的相册列表:', props.qqAlbumList);
  console.log('相册列表长度:', props.qqAlbumList?.length || 0);
  props.selectAlbumList.forEach((item) => {
      multipleTableRef.value?.toggleRowSelection(
        item,
        undefined,
        undefined
      )
    })
});
const emit = defineEmits(["backPage", "setSelectAlbumList", "startDownload"]);
const backPage = () => {
  emit("backPage");
};
const handleSelectionChange = (val: any[]) => {
  emit("setSelectAlbumList", toRaw(val));
};
const startDownload = () => {
  if (props.selectAlbumList.length == 0) {
    ElMessage.error("请选择下载相册!");
    return;
  }
  emit("startDownload");
};
</script>
