"use client";

import { AppHeader } from "@/components/layout/AppHeader";
import { UploadView } from "@/components/upload/UploadView";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { LiveOnlyView } from "@/components/dashboard/LiveOnlyView";
import { Toaster } from "@/components/ui/Toaster";
import { useFems } from "@/store/fems";

export default function HomePage() {
  const analyzed = useFems((s) => s.analyzed);
  const liveOnlyMode = useFems((s) => s.liveOnlyMode);
  return (
    <>
      <AppHeader />
      <main className="p-6 max-w-[1400px] mx-auto">
        {liveOnlyMode ? (
          <LiveOnlyView />
        ) : analyzed ? (
          <DashboardView />
        ) : (
          <UploadView />
        )}
      </main>
      <Toaster />
    </>
  );
}
