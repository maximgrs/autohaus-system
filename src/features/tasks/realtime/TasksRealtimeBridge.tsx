import { useTasksRealtimeInvalidation } from "@/src/features/tasks/realtime/useTasksRealtimeInvalidation";

export default function TasksRealtimeBridge() {
  useTasksRealtimeInvalidation();
  return null;
}
