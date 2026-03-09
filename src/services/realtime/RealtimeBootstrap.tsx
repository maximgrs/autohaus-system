import { useTasksRealtimeInvalidation } from "@/src/features/tasks/realtime/useTasksRealtimeInvalidation";

export default function RealtimeBootstrap() {
  useTasksRealtimeInvalidation();
  return null;
}
