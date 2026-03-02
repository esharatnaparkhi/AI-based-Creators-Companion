import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Sparkles } from "lucide-react";
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

        // Store token first
        localStorage.setItem("access_token", access_token);

        // Now /me will include Authorization header
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
    <div className="min-h-screen bg-gradient-to-br from-brand-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="text-brand-600" size={28} />
          <h1 className="text-2xl font-bold text-gray-900">CreatorAI</h1>
        </div>

        <h2 className="text-xl font-semibold text-gray-800 mb-6">Welcome back</h2>

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
          <Button type="submit" loading={loading} className="w-full" size="lg">
            Sign in
          </Button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          No account?{" "}
          <Link href="/register" className="text-brand-600 font-medium hover:underline">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}