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
import { Plus, Pencil, Trash2, Loader2, MessageSquare } from "lucide-react";
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

interface QuestionLibraryProps {
  questions: SurveyQuestion[];
}

export function QuestionLibrary({ questions }: QuestionLibraryProps) {
  const router = useRouter();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  // Add form state
  const [newText, setNewText] = useState("");
  const [newType, setNewType] = useState("nps");

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
        {!showAddForm && (
          <Button
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="bg-[#1B365D] hover:bg-[#152b4d]"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Question
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add form */}
        {showAddForm && (
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
            <div className="space-y-2">
              <Label>Question Text</Label>
              <Input
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
                placeholder="e.g. How likely are you to recommend this session to a colleague?"
                className="border-[#e2e8f0]"
              />
            </div>
            <div className="space-y-2">
              <Label>Response Type</Label>
              <Select value={newType} onValueChange={setNewType}>
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
                onClick={handleAdd}
                disabled={saving}
                className="bg-[#1B365D] hover:bg-[#152b4d]"
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
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Question list */}
        {questions.length === 0 && !showAddForm && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No survey questions yet. Add one to start collecting feedback on your Fanflets.
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
