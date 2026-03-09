import React from "react";

import AppProviders from "@/src/providers/AppProviders";

type Props = {
  children: React.ReactNode;
};

export default function Providers({ children }: Props) {
  return <AppProviders>{children}</AppProviders>;
}
