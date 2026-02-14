"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, Loader2, MessageSquare, LayoutTemplate, ArrowLeft } from "lucide-react";
import {
  createSurveyQuestion,
  updateSurveyQuestion,
  deleteSurveyQuestion,
} from "@/app/dashboard/settings/survey-actions";
import { toast } from "sonner";

type SurveyQuestion = {
  id: string;
  question_text: string;
  question_type: string;
  is_default: boolean;
  created_at: string;
};

const typeLabels: Record<string, string> = {
  nps: "NPS (0-10)",
  yes_no: "Yes / No",
  rating: "Rating (1-5 Stars)",
};

type QuestionTemplate = {
  label: string;
  question_text: string;
  question_type: string;
  category: string;
};

const TEMPLATES: QuestionTemplate[] = [
  // Speaker-focused
  {
    label: "Speaker NPS",
    question_text: "How likely are you to recommend this speaker to a colleague?",
    question_type: "nps",
    category: "Speaker",
  },
  {
    label: "Session Rating",
    question_text: "How would you rate today's session overall?",
    question_type: "rating",
    category: "Speaker",
  },
  {
    label: "Content Applicability",
    question_text: "How likely are you to apply what you learned today?",
    question_type: "nps",
    category: "Speaker",
  },
  // Audience-intent
  {
    label: "Follow-up Request",
    question_text: "Would you like to be contacted with more information about today's presentation?",
    question_type: "yes_no",
    category: "Audience",
  },
  {
    label: "Return Interest",
    question_text: "Would you attend another session by this speaker?",
    question_type: "yes_no",
    category: "Audience",
  },
  // Sponsor-focused
  {
    label: "Sponsor Interest",
    question_text: "Would you like to learn more about the products or solutions discussed today?",
    question_type: "yes_no",
    category: "Sponsor",
  },
  {
    label: "Product Awareness",
    question_text: "How familiar were you with the products featured today before attending?",
    question_type: "rating",
    category: "Sponsor",
  },
  // Event-organizer
  {
    label: "Event NPS",
    question_text: "How likely are you to recommend this event to a colleague?",
    question_type: "nps",
    category: "Event",
  },
];

const TEMPLATE_CATEGORIES = ["Speaker", "Audience", "Sponsor", "Event"];

interface QuestionLibraryProps {
  questions: SurveyQuestion[];
}

export function QuestionLibrary({ questions }: QuestionLibraryProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add form state
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState("nps");

  const handleSelectTemplate = (template: QuestionTemplate) => {
    setNewText(template.question_text);
    setNewType(template.question_type);
    setShowTemplatePicker(false);
    setShowAddForm(true);
  };

  // Edit form state
  const [editText, setEditText] = useState("");
  const [editType, setEditType] = useState("");

  const handleAdd = async () => {
    if (!newText.trim()) {
      toast.error("Question text is required");
      return;
    }
    setSaving(true);
    const result = await createSurveyQuestion(newText, newType);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Question added");
    setNewText("");
    setNewType("nps");
    setShowAddForm(false);
    router.refresh();
  };

  const handleStartEdit = (q: SurveyQuestion) => {
    setEditingId(q.id);
    setEditText(q.question_text);
    setEditType(q.question_type);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editText.trim()) return;
    setSaving(true);
    const result = await updateSurveyQuestion(editingId, editText, editType);
    setSaving(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Question updated");
    setEditingId(null);
    router.refresh();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this question? Any fanflets using it will have their survey removed.")) return;
    setDeleting(id);
    const result = await deleteSurveyQuestion(id);
    setDeleting(null);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Question deleted");
    router.refresh();
  };

  return (
    <Card className="border-slate-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-[#1B365D] flex items-center gap-2">
          <MessageSquare className="w-5 h-5" />
          Your Questions
        </CardTitle>
        {!showAddForm && !showTemplatePicker && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowTemplatePicker(true)}
              className="border-[#3BA5D9] text-[#3BA5D9] hover:bg-[#3BA5D9]/10"
            >
              <LayoutTemplate className="w-4 h-4 mr-1" />
              Start from Template
            </Button>
            <Button
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="bg-[#1B365D] hover:bg-[#152b4d]"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Question
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Template picker */}
        {showTemplatePicker && (
          <div className="p-5 bg-[#1B365D] rounded-lg border border-[#1B365D] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/15">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-4 h-4 text-[#3BA5D9]" />
                <h3 className="text-sm font-semibold text-white">Choose a Template</h3>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowTemplatePicker(false)}
                className="h-8 border-white/30 text-white hover:bg-white/10 hover:text-white"
              >
                <ArrowLeft className="w-3.5 h-3.5 mr-1" />
                Back
              </Button>
            </div>
            {TEMPLATE_CATEGORIES.map((category) => {
              const categoryTemplates = TEMPLATES.filter((t) => t.category === category);
              if (categoryTemplates.length === 0) return null;
              return (
                <div key={category} className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-white/50">
                    {category}
                  </p>
                  <div className="grid gap-2">
                    {categoryTemplates.map((template) => (
                      <button
                        key={template.label}
                        type="button"
                        onClick={() => handleSelectTemplate(template)}
                        className="flex items-start gap-3 p-3 bg-white/10 rounded-md border border-white/15 hover:border-[#3BA5D9] hover:bg-white/15 transition-all text-left cursor-pointer group/tpl"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-white group-hover/tpl:text-[#3BA5D9] transition-colors">
                            {template.label}
                          </p>
                          <p className="text-xs text-white/60 mt-0.5 line-clamp-2">
                            {template.question_text}
                          </p>
                        </div>
                        <span className="shrink-0 text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/10 text-white/70 border border-white/20">
                          {typeLabels[template.question_type] ?? template.question_type}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add form */}
        {showAddForm && (
          <div className="p-5 bg-[#1B365D] rounded-lg border border-[#1B365D] space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-white/15">
              <Plus className="w-4 h-4 text-[#3BA5D9]" />
              <h3 className="text-sm font-semibold text-white">Create New Question</h3>
            </div>
            <div className="space-y-2">
              <Label className="text-white/90 font-medium">Question Text</Label>
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. How likely are you to recommend this session to a colleague?"
                className="bg-white border-white/20 placeholder:text-slate-400"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/90 font-medium">Response Type</Label>
              <Select value={newType} onValueChange={setNewType}>
                <SelectTrigger className="bg-white border-white/20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nps">NPS (0-10 scale)</SelectItem>
                  <SelectItem value="yes_no">Yes / No</SelectItem>
                  <SelectItem value="rating">Rating (1-5 Stars)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={saving}
                className="bg-[#3BA5D9] hover:bg-[#3BA5D9]/90 text-white"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save Question"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowAddForm(false);
                  setNewText("");
                  setNewType("nps");
                }}
                className="bg-slate-300 text-slate-700 hover:bg-slate-400 hover:text-slate-800 border-0"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Question list */}
        {questions.length === 0 && !showAddForm && !showTemplatePicker && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No survey questions yet. Add one or start from a template to begin collecting feedback on your Fanflets.
          </div>
        )}

        {questions.map((q) => {
          if (editingId === q.id) {
            return (
              <div
                key={q.id}
                className="p-4 bg-slate-50 rounded-lg border border-[#3BA5D9]/40 space-y-3"
              >
                <div className="space-y-2">
                  <Label>Question Text</Label>
                  <Input
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="border-[#e2e8f0]"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Response Type</Label>
                  <Select value={editType} onValueChange={setEditType}>
                    <SelectTrigger className="border-[#e2e8f0]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nps">NPS (0-10 scale)</SelectItem>
                      <SelectItem value="yes_no">Yes / No</SelectItem>
                      <SelectItem value="rating">Rating (1-5 Stars)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                    disabled={saving}
                    className="bg-[#1B365D] hover:bg-[#152b4d]"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            );
          }

          return (
            <div
              key={q.id}
              className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200 group"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm text-slate-900">{q.question_text}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {typeLabels[q.question_type] ?? q.question_type}
                </p>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleStartEdit(q)}
                  className="h-8 w-8 p-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(q.id)}
                  disabled={deleting === q.id}
                  className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                >
                  {deleting === q.id ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="w-3.5 h-3.5" />
                  )}
                </Button>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
