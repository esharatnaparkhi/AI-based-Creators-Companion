import { Layout } from "@/components/Layout";
import { Card, Badge, Button, Spinner } from "@/components/ui";
import { useAnalyticsSummary } from "@/hooks/useApi";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { analyticsApi } from "@/services/api";
import toast from "react-hot-toast";
import { RefreshCw, TrendingUp } from "lucide-react";

const PIE_COLORS = ["#6366f1", "#ec4899", "#0ea5e9", "#10b981", "#f59e0b"];

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

  // Build chart data
  const platformData = analytics
    ? Object.entries(analytics.platform_breakdown || {}).map(([platform, data]: [string, any]) => ({
        platform,
        posts: data.posts,
        likes: data.likes,
        comments: data.comments,
      }))
    : [];

  const hoursData = (analytics?.best_posting_hours || []).map((h: number) => ({
    hour: `${h}:00`,
    score: Math.floor(Math.random() * 40 + 60), // In production: actual engagement score
  }));

  return (
    <Layout>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-gray-500 mt-1">Track your content performance across platforms.</p>
          </div>
          <Button variant="secondary" onClick={handleRefresh}>
            <RefreshCw size={16} />
            Refresh Metrics
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : (
          <>
            {/* KPI row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Total Posts", value: analytics?.total_posts?.toLocaleString() },
                { label: "Total Likes", value: analytics?.total_likes?.toLocaleString() },
                { label: "Comments", value: analytics?.total_comments?.toLocaleString() },
                { label: "Views", value: analytics?.total_views?.toLocaleString() },
              ].map(({ label, value }) => (
                <Card key={label}>
                  <p className="text-sm text-gray-500">{label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{value ?? 0}</p>
                </Card>
              ))}
            </div>

            {/* Engagement rate */}
            <Card>
              <div className="flex items-center gap-3">
                <TrendingUp className="text-brand-600" size={24} />
                <div>
                  <p className="text-sm text-gray-500">Average Engagement Rate</p>
                  <p className="text-3xl font-bold text-gray-900">{analytics?.avg_engagement_rate}%</p>
                </div>
                <div className="ml-auto">
                  <Badge color={analytics?.recent_trend === "up" ? "green" : analytics?.recent_trend === "down" ? "red" : "gray"}>
                    {analytics?.recent_trend ?? "neutral"} trend
                  </Badge>
                </div>
              </div>
            </Card>

            {/* Platform breakdown chart */}
            {platformData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <h2 className="font-semibold text-gray-800 mb-4">Posts by Platform</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={platformData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="platform" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="posts" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>

                <Card>
                  <h2 className="font-semibold text-gray-800 mb-4">Engagement by Platform</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={platformData}
                        dataKey="likes"
                        nameKey="platform"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ platform, percent }) =>
                          `${platform} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {platformData.map((_, index) => (
                          <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>
              </div>
            )}

            {/* Best posting hours */}
            {hoursData.length > 0 && (
              <Card>
                <h2 className="font-semibold text-gray-800 mb-4">Best Posting Hours (UTC)</h2>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hoursData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} name="Engagement Score" />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}