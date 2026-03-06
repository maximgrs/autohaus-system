// src/providers/Providers.tsx
import React from "react";
import { QueryClientProvider } from "@tanstack/react-query";

import { queryClient } from "@/src/store/queryClient";
import RealtimeBootstrap from "@/src/services/realtime/RealtimeBootstrap";

type Props = { children: React.ReactNode };

export default function Providers({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <RealtimeBootstrap />
      {children}
    </QueryClientProvider>
  );
}
