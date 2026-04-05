import { Sidebar } from "@/components/sidebar";
import { LastViewedBar } from "@/components/last-viewed-bar";
import { ShellAuthGuard } from "@/components/shell-auth-guard";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ShellAuthGuard>
      <div className="flex min-h-screen">
        <main className="md:ml-[180px] flex-1 min-h-screen pb-16 md:pb-0">
          <LastViewedBar />
          {children}
        </main>
        <Sidebar />
      </div>
    </ShellAuthGuard>
  );
}
