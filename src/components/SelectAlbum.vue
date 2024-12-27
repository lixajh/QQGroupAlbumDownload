<template>
  <div
    style="display: flex; flex: 1 1 0; flex-direction: column; overflow: hidden"
  >
    <el-scrollbar height="100%">
      <el-table
        @selection-change="handleSelectionChange"
        :data="props.qqAlbumList"
        style="width: 100%; padding: 20px 0px; box-sizing: border-box"
      >
        <el-table-column align="center" type="selection" />
        <el-table-column align="center" prop="title" label="名称" />
        <el-table-column align="center" prop="num" label="数量" />
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
import { ref, defineProps, defineEmits, toRaw } from "vue";
// eslint-disable-next-line vue/no-setup-props-destructure
const props = defineProps({
  qqAlbumList: {
    type: Array,
    required: true,
  },
});
const emit = defineEmits(["backPage","getSelectAlbumList"]);
const backPage = () => {
  emit("backPage");
};
const selectAlbumList = ref<Array<any>>([]);
const handleSelectionChange = (val: any[]) => {
  selectAlbumList.value = val;
};
const startDownload = () => {
  emit("getSelectAlbumList", toRaw(selectAlbumList.value));
};
</script>
