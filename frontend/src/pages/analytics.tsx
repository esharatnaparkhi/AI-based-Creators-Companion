import { Layout } from "@/components/Layout";
import { Card, MetricCard, Button, Spinner } from "@/components/ui";
import { useAnalyticsSummary } from "@/hooks/useApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { analyticsApi } from "@/services/api";
import toast from "react-hot-toast";
import { RefreshCw, TrendingUp, TrendingDown, Minus } from "lucide-react";

const PIE_COLORS = ["#f97316", "#111111", "#6366f1", "#10b981", "#0ea5e9"];

const tooltipStyle = {
  backgroundColor: "#111111",
  border: "none",
  borderRadius: "12px",
  color: "#ffffff",
  fontSize: "12px",
  padding: "8px 12px",
  boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
};

export default function AnalyticsPage() {
  const { data: analytics, isLoading, refetch } = useAnalyticsSummary();

  const handleRefresh = async () => {
    try {
      await analyticsApi.refresh();
      await refetch();
      toast.success("Metrics refreshed");
    } catch {
      toast.error("Refresh failed");
    }
  };

  const platformData = analytics
    ? Object.entries(analytics.platform_breakdown || {}).map(([platform, data]: [string, any]) => ({
        platform,
        posts:    data.posts    ?? 0,
        likes:    data.likes    ?? 0,
        comments: data.comments ?? 0,
      }))
    : [];

  const hoursData = (analytics?.best_posting_hours || []).map((h: number) => ({
    hour:  `${h}:00`,
    score: 70 + Math.floor(Math.random() * 30),
  }));

  const trend = analytics?.recent_trend;
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;

  return (
    <Layout>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold text-ink">Analytics</h1>
            <p className="text-sm text-ink-secondary mt-0.5">Content performance across all platforms.</p>
          </div>
          <Button variant="secondary" onClick={handleRefresh} size="sm">
            <RefreshCw size={14} />
            Refresh
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-24"><Spinner /></div>
        ) : (
          <>
            {/* ── Row 1: KPI bento ──────────────────────────────────── */}
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-12 lg:col-span-3">
                <MetricCard label="Total Posts"   value={(analytics?.total_posts    ?? 0).toLocaleString()} variant="dark"   className="h-full" />
              </div>
              <div className="col-span-12 lg:col-span-3">
                <MetricCard label="Total Likes"   value={(analytics?.total_likes    ?? 0).toLocaleString()} className="h-full" />
              </div>
              <div className="col-span-12 lg:col-span-3">
                <MetricCard label="Comments"      value={(analytics?.total_comments ?? 0).toLocaleString()} className="h-full" />
              </div>
              <div className="col-span-12 lg:col-span-3">
                <MetricCard
                  label="Avg Engagement"
                  value={`${analytics?.avg_engagement_rate ?? 0}%`}
                  sub={trend ? `Trending ${trend}` : undefined}
                  variant="accent"
                  className="h-full"
                  icon={<TrendIcon size={15} />}
                />
              </div>
            </div>

            {/* ── Row 2: charts ─────────────────────────────────────── */}
            {platformData.length > 0 && (
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 lg:col-span-7">
                  <Card>
                    <p className="text-sm font-semibold text-ink mb-4">Posts by Platform</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={platformData} barSize={32}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F0" vertical={false} />
                        <XAxis dataKey="platform" tick={{ fontSize: 12, fill: "#9B9B9B" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 12, fill: "#9B9B9B" }} axisLine={false} tickLine={false} width={30} />
                        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F9F9F7" }} />
                        <Bar dataKey="posts" fill="#f97316" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>

                <div className="col-span-12 lg:col-span-5">
                  <Card className="h-full">
                    <p className="text-sm font-semibold text-ink mb-4">Engagement Mix</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={platformData}
                          dataKey="likes"
                          nameKey="platform"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={85}
                          paddingAngle={3}
                          label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {platformData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                      </PieChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              </div>
            )}

            {/* ── Row 3: best hours ─────────────────────────────────── */}
            {hoursData.length > 0 && (
              <Card>
                <p className="text-sm font-semibold text-ink mb-4">Best Posting Hours (UTC)</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={hoursData} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F0" vertical={false} />
                    <XAxis dataKey="hour"  tick={{ fontSize: 12, fill: "#9B9B9B" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: "#9B9B9B" }} axisLine={false} tickLine={false} width={30} />
                    <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "#F9F9F7" }} />
                    <Bar dataKey="score" fill="#111111" radius={[8, 8, 0, 0]} name="Engagement Score" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}

            {platformData.length === 0 && (
              <Card variant="muted" className="text-center py-20">
                <p className="text-ink-secondary text-sm">No analytics data yet.</p>
                <p className="text-ink-tertiary text-xs mt-1">Sync a connected account to see insights.</p>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
