import { Layout } from "@/components/Layout";
import { Card, MetricCard, Badge, Button, EmptyState, Spinner } from "@/components/ui";
import { useScheduledJobs, useCancelJob, usePostingCalendar } from "@/hooks/useApi";
import { Calendar, Clock, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";

const STATUS_META: Record<string, { color: any; icon: React.ReactNode; label: string }> = {
  pending:   { color: "orange", icon: <Clock size={12} />,                              label: "Pending"   },
  running:   { color: "blue",   icon: <Loader2 size={12} className="animate-spin" />,   label: "Running"   },
  completed: { color: "green",  icon: <CheckCircle2 size={12} />,                       label: "Published" },
  failed:    { color: "red",    icon: <AlertCircle size={12} />,                         label: "Failed"    },
  retrying:  { color: "yellow", icon: <Loader2 size={12} className="animate-spin" />,   label: "Retrying"  },
};

export default function SchedulePage() {
  const { data: jobs, isLoading } = useScheduledJobs();
  const { data: calendar } = usePostingCalendar();
  const cancelJob = useCancelJob();

  const pendingJobs   = jobs?.filter((j: any) => j.status === "pending")   ?? [];
  const completedJobs = jobs?.filter((j: any) => j.status === "completed") ?? [];
  const failedJobs    = jobs?.filter((j: any) => j.status === "failed")    ?? [];

  return (
    <Layout>
      <div className="space-y-4">

        {/* Header */}
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-ink">Schedule</h1>
          <p className="text-sm text-ink-secondary mt-0.5">Manage scheduled posts and AI-suggested time slots.</p>
        </div>

        {/* ── Stat bento ────────────────────────────────────────────── */}
        <div className="grid grid-cols-3 gap-4">
          <MetricCard label="Pending"   value={pendingJobs.length}   variant="dark"   sub="Queued to publish" />
          <MetricCard label="Published" value={completedJobs.length} variant="accent" sub="Successfully sent"  />
          <MetricCard label="Failed"    value={failedJobs.length}    sub="Need attention" />
        </div>

        {/* ── AI suggested times ────────────────────────────────────── */}
        {calendar?.suggestions?.length > 0 && (
          <Card variant="muted" padding="md">
            <p className="text-sm font-semibold text-ink mb-3">AI-Suggested Posting Times</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {calendar.suggestions.slice(0, 6).map((s: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center gap-3 p-3 bg-white rounded-2xl shadow-card"
                >
                  <div className="w-8 h-8 rounded-xl bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                    <Calendar size={15} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-ink leading-tight">{s.day_label}</p>
                    <p className="text-xs text-ink-secondary">{s.time_label}</p>
                  </div>
                  <Badge color="orange">{s.platform}</Badge>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* ── Jobs list ─────────────────────────────────────────────── */}
        <div>
          <p className="text-sm font-semibold text-ink mb-3">All Jobs</p>
          {isLoading ? (
            <div className="flex justify-center py-16"><Spinner /></div>
          ) : !jobs?.length ? (
            <Card>
              <EmptyState
                icon={<Calendar size={44} />}
                title="No scheduled posts"
                description="Go to Drafts and schedule a post to see it here."
              />
            </Card>
          ) : (
            <div className="space-y-2">
              {jobs.map((job: any) => {
                const meta = STATUS_META[job.status] ?? STATUS_META.pending;
                return (
                  <Card key={job.job_id} padding="sm" className="flex items-center gap-4">
                    {/* Status dot */}
                    <div className="w-8 h-8 rounded-xl bg-surface-50 flex items-center justify-center flex-shrink-0 text-ink-secondary">
                      {meta.icon}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <Badge color={meta.color}>{meta.label}</Badge>
                        {(job.platforms || []).map((p: string) => (
                          <Badge key={p} color="gray">{p}</Badge>
                        ))}
                      </div>
                      {job.content_preview && (
                        <p className="text-sm text-ink-secondary truncate">{job.content_preview}</p>
                      )}
                      <p className="text-xs text-ink-tertiary mt-0.5">
                        {format(new Date(job.scheduled_at), "MMM d, yyyy 'at' h:mm a")}
                      </p>
                    </div>

                    {job.status === "pending" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => cancelJob.mutate(job.job_id)}
                        loading={cancelJob.isPending}
                        className="text-red-500 hover:bg-red-50 flex-shrink-0"
                      >
                        <X size={13} />
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
