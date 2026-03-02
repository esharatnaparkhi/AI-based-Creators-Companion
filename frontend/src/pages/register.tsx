import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Zap, ArrowRight } from "lucide-react";
import { authApi } from "@/services/api";
import { useAuthStore } from "@/store/auth";
import { Button, Input } from "@/components/ui";
import toast from "react-hot-toast";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const resp = await authApi.register({ name, email, password });
      const { access_token } = resp.data;
      localStorage.setItem("access_token", access_token);
      const meResp = await authApi.me();
      setAuth(meResp.data, access_token);
      router.push("/accounts");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Registration failed");
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
            Create content<br />10× faster.
          </p>
          <p className="text-white/45 text-sm leading-relaxed max-w-xs">
            Join thousands of creators using AI to grow their audience across every platform.
          </p>
        </div>

        <div className="space-y-2">
          {[
            "AI-generated platform-aware drafts",
            "Smart scheduling & best-time suggestions",
            "Cross-platform analytics in one view",
          ].map((feat) => (
            <div key={feat} className="flex items-center gap-2.5">
              <div className="w-4 h-4 rounded-full bg-brand-500 flex items-center justify-center flex-shrink-0">
                <svg width="8" height="6" fill="none" viewBox="0 0 8 6">
                  <path d="M1 3l2 2 4-4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <span className="text-white/55 text-xs">{feat}</span>
            </div>
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

          <h2 className="text-2xl font-bold text-ink mb-1">Create your account</h2>
          <p className="text-sm text-ink-secondary mb-8">Free forever. No credit card needed.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Full name"
              type="text"
              placeholder="Jane Creator"
              value={name}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
              required
            />
            <Input
              label="Password"
              type="password"
              placeholder="Min 8 characters"
              value={password}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
              minLength={8}
              required
            />
            <Button type="submit" loading={loading} className="w-full justify-center" size="lg">
              Create account <ArrowRight size={15} />
            </Button>
          </form>

          <p className="text-center text-sm text-ink-secondary mt-6">
            Already have an account?{" "}
            <Link href="/login" className="text-brand-600 font-semibold hover:text-brand-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
