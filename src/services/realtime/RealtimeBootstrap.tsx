// src/services/realtime/RealtimeBootstrap.tsx
import React from "react";

import { useTasksRealtimeInvalidation } from "@/src/services/realtime/useTasksRealtimeInvalidation";

export default function RealtimeBootstrap() {
  useTasksRealtimeInvalidation();
  return null;
}
