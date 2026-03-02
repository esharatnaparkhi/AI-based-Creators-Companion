import { ReactNode, useEffect } from "react";
import { useRouter } from "next/router";
import { Sidebar } from "./Sidebar";
import { useAuthStore } from "@/store/auth";

const PUBLIC_PATHS = ["/login", "/register", "/"];

export function Layout({ children }: { children: ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const isPublic = PUBLIC_PATHS.includes(router.pathname);

  useEffect(() => {
    if (!user && !isPublic) {
      router.push("/login");
    }
  }, [user, isPublic, router]);

  if (isPublic) return <>{children}</>;
  if (!user) return null;

  return (
    <div className="flex min-h-screen bg-surface-100">
      <Sidebar />
      <main className="flex-1 overflow-auto min-w-0">
        <div className="max-w-6xl mx-auto p-8">{children}</div>
      </main>
    </div>
  );
}
