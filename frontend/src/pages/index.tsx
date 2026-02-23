import { useEffect } from "react";
import { useRouter } from "next/router";
import { useAuthStore } from "@/store/auth";
import { Spinner } from "@/components/ui";

export default function IndexPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    if (user) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  );
}