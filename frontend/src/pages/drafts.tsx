import { useState } from "react";
import { Layout } from "@/components/Layout";
import { Card, Button, Badge, Spinner, Input, Select, EmptyState } from "@/components/ui";
import { useDrafts, useGenerateDrafts, useDeleteDraft, useSchedulePost } from "@/hooks/useApi";
import { Sparkles, Trash2, Calendar, ChevronDown, ChevronUp, Copy, Image as ImageIcon } from "lucide-react";
import { format, addHours } from "date-fns";
import toast from "react-hot-toast";

const PLATFORMS = ["instagram", "linkedin", "x", "youtube", "email"];
const TONES = ["casual", "professional", "witty", "educational", "inspirational"];
const STYLES = ["story", "tips & tricks", "educational", "promotional", "conversational", "behind-the-scenes"];
const LENGTHS = ["short", "medium", "long"];
const SCHEDULE_HOURS = [1, 2, 4, 8, 24, 48];

function DraftCard({ draft, onDelete }: { draft: any; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [scheduleHours, setScheduleHours] = useState(24);
  const schedulePost = useSchedulePost();

  const handleSchedule = async () => {
    const scheduledAt = addHours(new Date(), scheduleHours);
    await schedulePost.mutateAsync({
      draft_id: draft.id,
      scheduled_at: scheduledAt.toISOString(),
      platforms: draft.platform_targets || [],
    });
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

      {/* Generated image */}
      {draft.image_url && (
        <div className="rounded-lg overflow-hidden border border-gray-200">
          <img
            src={draft.image_url}
            alt="AI generated visual"
            className="w-full max-h-64 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <p className="text-xs text-gray-400 px-2 py-1 bg-gray-50">
            <ImageIcon size={10} className="inline mr-1" />AI generated — link expires after 1 hour
          </p>
        </div>
      )}

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
      <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">
        <div className="flex items-center gap-1">
          <Button variant="primary" size="sm" onClick={handleSchedule} loading={schedulePost.isPending}>
            <Calendar size={14} />
            Schedule
          </Button>
          <select
            value={scheduleHours}
            onChange={(e) => setScheduleHours(Number(e.target.value))}
            className="text-xs border border-gray-300 rounded-md px-1.5 py-1.5 text-gray-600 bg-white focus:outline-none focus:ring-1 focus:ring-brand-400"
          >
            {SCHEDULE_HOURS.map((h) => (
              <option key={h} value={h}>{h}h</option>
            ))}
          </select>
        </div>
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
  const [keywords, setKeywords] = useState("");
  const [targetAudience, setTargetAudience] = useState("");
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(["instagram", "linkedin"]);
  const [tone, setTone] = useState("casual");
  const [contentStyle, setContentStyle] = useState("");
  const [postLength, setPostLength] = useState("medium");
  const [generateImage, setGenerateImage] = useState(false);
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
    await generate.mutateAsync({
      platform_targets: selectedPlatforms,
      topic,
      tone,
      keywords: keywords.trim() ? keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
      target_audience: targetAudience.trim() || undefined,
      content_style: contentStyle || undefined,
      post_length: postLength,
      generate_image: generateImage,
    });
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
                label="Topic / Idea *"
                placeholder="e.g. 5 productivity tips for content creators"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />

              <Input
                label="Keywords (comma-separated)"
                placeholder="e.g. AI, productivity, tools"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
              />

              <Input
                label="Target Audience"
                placeholder="e.g. small business owners, Gen Z creators"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
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

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Tone"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                >
                  {TONES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </Select>

                <Select
                  label="Content Style"
                  value={contentStyle}
                  onChange={(e) => setContentStyle(e.target.value)}
                >
                  <option value="">Any style</option>
                  {STYLES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Post Length"
                  value={postLength}
                  onChange={(e) => setPostLength(e.target.value)}
                >
                  {LENGTHS.map((l) => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </Select>

                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={generateImage}
                      onChange={(e) => setGenerateImage(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Generate image <span className="text-gray-400">(DALL-E 3)</span>
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handleGenerate}
                  loading={generate.isPending}
                  disabled={!topic || selectedPlatforms.length === 0}
                >
                  <Sparkles size={16} />
                  Generate {selectedPlatforms.length} draft{selectedPlatforms.length !== 1 ? "s" : ""}
                  {generateImage && " + images"}
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
