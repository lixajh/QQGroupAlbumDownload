const TaskStatus = {
  WATING: "wating",
  RUN: "run",
  FINISH: "finish",
  ERROR: "error",
  PAUSE: "pause",
};

const TaskStatusText={
  [TaskStatus.WATING]:"等待",
  [TaskStatus.RUN]:"运行",
  [TaskStatus.FINISH]:"完成",
  [TaskStatus.ERROR]:"错误",
  [TaskStatus.PAUSE]:"暂停",

}

exports.TaskStatus = TaskStatus;
exports.TaskStatusText = TaskStatusText;
