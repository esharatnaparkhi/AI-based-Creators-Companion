import { Layout } from "@/components/Layout";
import { Card, Badge, Button, EmptyState, Spinner } from "@/components/ui";
import { useScheduledJobs, useCancelJob, usePostingCalendar } from "@/hooks/useApi";
import { Calendar, Clock, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES: Record<string, { color: any; icon: React.ReactNode }> = {
  pending: { color: "yellow", icon: <Clock size={14} /> },
  running: { color: "blue", icon: <Loader2 size={14} className="animate-spin" /> },
  completed: { color: "green", icon: <CheckCircle2 size={14} /> },
  failed: { color: "red", icon: <AlertCircle size={14} /> },
  retrying: { color: "yellow", icon: <Loader2 size={14} className="animate-spin" /> },
};

export default function SchedulePage() {
  const { data: jobs, isLoading } = useScheduledJobs();
  const { data: calendar } = usePostingCalendar();
  const cancelJob = useCancelJob();

  const pendingJobs = jobs?.filter((j: any) => j.status === "pending") ?? [];
  const completedJobs = jobs?.filter((j: any) => j.status === "completed") ?? [];
  const failedJobs = jobs?.filter((j: any) => j.status === "failed") ?? [];

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Schedule</h1>
          <p className="text-gray-500 mt-1">Manage your scheduled posts and get AI-suggested slots.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card className="text-center">
            <p className="text-3xl font-bold text-yellow-600">{pendingJobs.length}</p>
            <p className="text-sm text-gray-500 mt-1">Pending</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-green-600">{completedJobs.length}</p>
            <p className="text-sm text-gray-500 mt-1">Published</p>
          </Card>
          <Card className="text-center">
            <p className="text-3xl font-bold text-red-500">{failedJobs.length}</p>
            <p className="text-sm text-gray-500 mt-1">Failed</p>
          </Card>
        </div>

        {/* AI posting suggestions */}
        {calendar?.suggestions?.length > 0 && (
          <Card>
            <h2 className="font-semibold text-gray-800 mb-4">AI-Suggested Posting Times</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {calendar.suggestions.slice(0, 6).map((s: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-brand-50 rounded-lg border border-brand-100">
                  <div className="text-brand-600">
                    <Calendar size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800">{s.day_label}</p>
                    <p className="text-xs text-gray-500">{s.time_label} — {s.platform}</p>
                  </div>
                  <Badge color="purple">{s.platform}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Jobs list */}
        <div>
          <h2 className="font-semibold text-gray-800 mb-4">Scheduled Jobs</h2>
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : jobs?.length === 0 ? (
            <Card>
              <EmptyState
                icon={<Calendar size={48} />}
                title="No scheduled posts"
                description="Go to Drafts and schedule a post to see it here."
              />
            </Card>
          ) : (
            <div className="space-y-3">
              {jobs?.map((job: any) => {
                const statusInfo = STATUS_STYLES[job.status] || STATUS_STYLES.pending;
                return (
                  <Card key={job.job_id} className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge color={statusInfo.color}>
                          <span className="flex items-center gap-1">
                            {statusInfo.icon}
                            {job.status}
                          </span>
                        </Badge>
                        {(job.platforms || []).map((p: string) => (
                          <Badge key={p} color="gray">{p}</Badge>
                        ))}
                      </div>
                      {job.content_preview && (
                        <p className="text-sm text-gray-600 truncate">{job.content_preview}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">
                        {format(new Date(job.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>

                    {job.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelJob.mutate(job.job_id)}
                      >
                        <X size={14} className="text-red-500" />
                        Cancel
                      </Button>
                    )}
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}