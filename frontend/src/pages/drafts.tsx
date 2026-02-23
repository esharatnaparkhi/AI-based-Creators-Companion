import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, Button, Badge, Spinner, Input, Select, EmptyState } from "@/components/ui";
import { useDrafts, useGenerateDrafts, useDeleteDraft, useSchedulePost } from "@/hooks/useApi";
import { Sparkles, Trash2, Calendar, ChevronDown, ChevronUp, Copy } from "lucide-react";
import { format, addHours } from "date-fns";
import toast from "react-hot-toast";

const PLATFORMS = ["instagram", "linkedin", "x", "youtube", "email"];
const TONES = ["casual", "professional", "witty", "educational", "inspirational"];

function DraftCard({ draft, onDelete }: { draft: any; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const schedulePost = useSchedulePost();

  const handleSchedule = async () => {
    const scheduledAt = addHours(new Date(), 24);
    await schedulePost.mutateAsync({
      draft_id: draft.id,
      scheduled_at: scheduledAt.toISOString(),
      platforms: draft.platform_targets || [],
    });
    setScheduling(false);
  };

  const copyContent = () => {
    navigator.clipboard.writeText(draft.content);
    toast.success("Copied to clipboard");
  };

  return (
    <Card className="space-y-3">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            {(draft.platform_targets || []).map((p: string) => (
              <Badge key={p} color="purple">{p}</Badge>
            ))}
            {draft.score && (
              <Badge color="green">Score: {draft.score}/10</Badge>
            )}
          </div>
          <p className={`text-sm text-gray-700 ${!expanded ? "line-clamp-3" : ""}`}>
            {draft.content}
          </p>
          {draft.content?.length > 200 && (
            <button
              className="text-xs text-brand-600 mt-1 hover:underline"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <><ChevronUp size={12} className="inline" /> Show less</> : <><ChevronDown size={12} className="inline" /> Show more</>}
            </button>
          )}
        </div>
      </div>

      {/* Hook variations */}
      {expanded && draft.hook_variations?.length > 0 && (
        <div className="pl-3 border-l-2 border-brand-200 space-y-1">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hook variations</p>
          {draft.hook_variations.map((hook: string, i: number) => (
            <p key={i} className="text-sm text-gray-600 italic">"{hook}"</p>
          ))}
        </div>
      )}

      {/* Tags */}
      {draft.tags?.length > 0 && (
        <div className="flex gap-1 flex-wrap">
          {draft.tags.map((tag: string) => (
            <span key={tag} className="text-xs text-gray-400">#{tag}</span>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
        <Button variant="primary" size="sm" onClick={handleSchedule} loading={schedulePost.isPending}>
          <Calendar size={14} />
          Schedule (24h)
        </Button>
        <Button variant="secondary" size="sm" onClick={copyContent}>
          <Copy size={14} />
          Copy
        </Button>
        <div className="flex-1" />
        <p className="text-xs text-gray-400">
          {format(new Date(draft.created_at), "MMM d")}
        </p>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 size={14} className="text-red-500" />
        </Button>
      </div>
    </Card>
  );
}

export default function DraftsPage() {
  const { data: drafts, isLoading } = useDrafts();
  const generate = useGenerateDrafts();
  const deleteDraft = useDeleteDraft();

  const [topic, setTopic] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "linkedin"]);
  const [tone, setTone] = useState("casual");
  const [showGenerator, setShowGenerator] = useState(false);

  const togglePlatform = (p: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleGenerate = async () => {
    if (!topic.trim()) {
      toast.error("Enter a topic first");
      return;
    }
    await generate.mutateAsync({ platform_targets: selectedPlatforms, topic, tone });
    setShowGenerator(false);
    setTopic("");
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Drafts</h1>
            <p className="text-gray-500 mt-1">AI-generated content ready to review and schedule.</p>
          </div>
          <Button onClick={() => setShowGenerator(!showGenerator)}>
            <Sparkles size={16} />
            Generate Drafts
          </Button>
        </div>

        {/* Generator panel */}
        {showGenerator && (
          <Card className="border-brand-200 bg-brand-50">
            <h2 className="font-semibold text-gray-800 mb-4">Generate New Drafts</h2>
            <div className="space-y-4">
              <Input
                label="Topic / Idea"
                placeholder="e.g. 5 productivity tips for content creators"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />

              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Platforms</p>
                <div className="flex gap-2 flex-wrap">
                  {PLATFORMS.map((p) => (
                    <button
                      key={p}
                      onClick={() => togglePlatform(p)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                        selectedPlatforms.includes(p)
                          ? "bg-brand-600 text-white border-brand-600"
                          : "bg-white text-gray-600 border-gray-300 hover:border-brand-400"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <Select
                label="Tone"
                value={tone}
                onChange={(e) => setTone(e.target.value)}
              >
                {TONES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </Select>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  loading={generate.isPending}
                  disabled={!topic || selectedPlatforms.length === 0}
                >
                  <Sparkles size={16} />
                  Generate {selectedPlatforms.length} draft{selectedPlatforms.length !== 1 ? "s" : ""}
                </Button>
                <Button variant="secondary" onClick={() => setShowGenerator(false)}>Cancel</Button>
              </div>
            </div>
          </Card>
        )}

        {/* Drafts list */}
        {isLoading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : drafts?.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Sparkles size={48} />}
              title="No drafts yet"
              description="Generate your first AI draft above."
              action={
                <Button onClick={() => setShowGenerator(true)}>
                  <Sparkles size={16} /> Generate Drafts
                </Button>
              }
            />
          </Card>
        ) : (
          <div className="space-y-4">
            {drafts?.map((draft: any) => (
              <DraftCard
                key={draft.id}
                draft={draft}
                onDelete={() => deleteDraft.mutate(draft.id)}
              />
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}