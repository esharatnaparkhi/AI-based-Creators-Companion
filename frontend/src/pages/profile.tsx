import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, Button, Input, Select } from "@/components/ui";
import { useAuthStore } from "@/store/auth";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import { User, Save } from "lucide-react";

const NICHES = [
  "Tech & Software", "Business & Entrepreneurship", "Health & Fitness",
  "Food & Cooking", "Travel", "Fashion & Beauty", "Education",
  "Finance & Investing", "Gaming", "Art & Design", "Music", "Other",
];

const STYLES = [
  "Educational", "Entertaining", "Inspirational", "Conversational",
  "Storytelling", "Data-driven", "Humorous", "Thought-leadership",
];

export default function ProfilePage() {
  const { user, setAuth } = useAuthStore();
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : "";

  const [name, setName] = useState(user?.name || "");
  const [niche, setNiche] = useState("");
  const [audience, setAudience] = useState("");
  const [style, setStyle] = useState("Educational");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.patch("/auth/me", {
        name,
        settings: {
          persona: { niche, audience, style, description },
        },
      });
      if (user && token) {
        setAuth({ ...user, name }, token);
      }
      toast.success("Profile saved!");
    } catch {
      toast.error("Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Profile & Persona</h1>
          <p className="text-gray-500 mt-1">
            Your persona helps the AI generate content that sounds like you.
          </p>
        </div>

        <Card>
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
              <User size={20} />
            </div>
            <h2 className="font-semibold text-gray-800">Basic Info</h2>
          </div>
          <div className="space-y-4">
            <Input
              label="Display Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Creator"
            />
            <div>
              <p className="text-sm text-gray-500">Email</p>
              <p className="text-sm font-medium text-gray-700 mt-1">{user?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Plan</p>
              <p className="text-sm font-medium text-gray-700 mt-1 capitalize">{user?.plan}</p>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold text-gray-800 mb-6">Creator Persona</h2>
          <div className="space-y-4">
            <Select
              label="Your Niche"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
            >
              <option value="">Select a niche…</option>
              {NICHES.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </Select>

            <Input
              label="Target Audience"
              value={audience}
              onChange={(e) => setAudience(e.target.value)}
              placeholder="e.g. early-stage founders, fitness beginners over 30"
            />

            <Select
              label="Content Style"
              value={style}
              onChange={(e) => setStyle(e.target.value)}
            >
              {STYLES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Persona Description
              </label>
              <textarea
                className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
                rows={4}
                placeholder="Describe your voice, values, and what makes your content unique…"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">{description.length}/500 characters</p>
            </div>
          </div>
        </Card>

        <Card className="border-red-100">
          <h2 className="font-semibold text-gray-800 mb-2">Data & Privacy</h2>
          <p className="text-sm text-gray-500 mb-4">
            Download all your data or permanently delete your account.
          </p>
          <div className="flex gap-3">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => window.open("/api/gdpr/export", "_blank")}
            >
              Export My Data
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (confirm("Permanently delete your account and all data? This cannot be undone.")) {
                  api.delete("/gdpr/delete-account").then(() => {
                    window.location.href = "/login";
                  });
                }
              }}
            >
              Delete Account
            </Button>
          </div>
        </Card>

        <Button onClick={handleSave} loading={saving} size="lg">
          <Save size={16} />
          Save Changes
        </Button>
      </div>
    </Layout>
  );
}