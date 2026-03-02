import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";
import { authApi } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Button, Input } from "@/components/ui";
import toast from "react-hot-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await authApi.login({ email, password });
      const { access_token } = resp.data;
      localStorage.setItem("access_token", access_token);
      const meResp = await authApi.me();
      setAuth(meResp.data, access_token);
      router.push("/dashboard");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-surface-100">
      {/* ── Left dark panel ─────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[440px] flex-shrink-0 bg-canvas flex-col justify-between p-10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-brand-500 flex items-center justify-center shadow-sm">
            <Zap size={17} className="text-white" fill="white" />
          </div>
          <span className="font-bold text-white text-base tracking-tight">CreatorAI</span>
        </div>

        <div className="space-y-4">
          <p className="text-[2.2rem] font-bold text-white leading-[1.2]">
            Your AI-powered<br />content studio.
          </p>
          <p className="text-white/45 text-sm leading-relaxed max-w-xs">
            Generate, schedule, and analyse posts across every platform — from a single, beautiful workspace.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {["Instagram", "LinkedIn", "X (Twitter)", "YouTube"].map((p) => (
            <span
              key={p}
              className="px-3 py-1.5 rounded-full bg-white/[0.07] text-white/50 text-xs font-medium border border-white/10"
            >
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* ── Right form panel ────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="w-8 h-8 rounded-xl bg-brand-500 flex items-center justify-center">
              <Zap size={15} className="text-white" fill="white" />
            </div>
            <span className="font-bold text-ink text-base">CreatorAI</span>
          </div>

          <h2 className="text-2xl font-bold text-ink mb-1">Welcome back</h2>
          <p className="text-sm text-ink-secondary mb-8">Sign in to continue to your workspace.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button type="submit" loading={loading} className="w-full justify-center" size="lg">
              Sign in <ArrowRight size={15} />
            </Button>
          </form>

          <p className="text-center text-sm text-ink-secondary mt-6">
            No account?{" "}
            <Link href="/register" className="text-brand-600 font-semibold hover:text-brand-700">
              Sign up free
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
