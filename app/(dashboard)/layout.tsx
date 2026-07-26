import Sidebar from "@/components/layout/sidebar";
import Topbar from "@/components/layout/topbar";
import { createClient } from "@/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "transparent",
      }}
    >
      <Sidebar />

      <div
        style={{
          display: "flex",
          flex: 1,
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Topbar />

        <main
          style={{
            flex: 1,
            padding: "28px 32px",
            overflowY: "auto",
            overflowX: "hidden",
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}