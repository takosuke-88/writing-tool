import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Save, RotateCcw, Trash2, Plus } from "lucide-react";
import type { SystemPrompt } from "@shared/schema";

interface SystemPromptPanelProps {
  selectedPromptId: string | null;
  onSelectPrompt: (id: string | null) => void;
}

export function SystemPromptPanel({ selectedPromptId, onSelectPrompt }: SystemPromptPanelProps) {
  const { toast } = useToast();
  const [editedText, setEditedText] = useState("");
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");

  const { data: promptsData, isLoading } = useQuery<{ prompts: SystemPrompt[] }>({
    queryKey: ["/api/system-prompts"],
  });

  const prompts = promptsData?.prompts || [];

  const selectedPrompt = prompts.find((p) => p.id === selectedPromptId);

  useEffect(() => {
    if (selectedPrompt) {
      setEditedText(selectedPrompt.promptText);
    }
  }, [selectedPrompt]);

  const createMutation = useMutation({
    mutationFn: async (data: { id: string; name: string; promptText: string; category: string }) => {
      return await apiRequest<SystemPrompt>("POST", "/api/system-prompts", data);
    },
    onSuccess: (newPrompt) => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-prompts"] });
      onSelectPrompt(newPrompt.id);
      setShowSaveDialog(false);
      setNewTemplateName("");
      toast({ title: "テンプレートを保存しました" });
    },
    onError: () => {
      toast({ title: "保存に失敗しました", variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { name?: string; promptText?: string } }) => {
      return await apiRequest<SystemPrompt>("PUT", `/api/system-prompts/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-prompts"] });
      toast({ title: "テンプレートを更新しました" });
    },
    onError: () => {
      toast({ title: "更新に失敗しました", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/system-prompts/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/system-prompts"] });
      onSelectPrompt(prompts[0]?.id || null);
      setShowDeleteDialog(false);
      toast({ title: "テンプレートを削除しました" });
    },
    onError: () => {
      toast({ title: "削除に失敗しました", variant: "destructive" });
    },
  });

  const handleSaveNew = () => {
    if (!newTemplateName.trim()) return;
    const id = `custom-${Date.now()}`;
    createMutation.mutate({
      id,
      name: newTemplateName.trim(),
      promptText: editedText,
      category: "custom",
    });
  };

  const handleOverwrite = () => {
    if (!selectedPromptId || !selectedPrompt) return;
    updateMutation.mutate({
      id: selectedPromptId,
      data: { promptText: editedText },
    });
  };

  const handleReset = () => {
    if (selectedPrompt) {
      setEditedText(selectedPrompt.promptText);
      toast({ title: "元に戻しました" });
    }
  };

  const handleDelete = () => {
    if (selectedPromptId) {
      deleteMutation.mutate(selectedPromptId);
    }
  };

  const isModified = selectedPrompt && editedText !== selectedPrompt.promptText;
  const isCustom = selectedPrompt?.category === "custom";

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">読み込み中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium">テンプレート選択</label>
        <Select
          value={selectedPromptId || ""}
          onValueChange={(value) => onSelectPrompt(value || null)}
        >
          <SelectTrigger data-testid="select-template">
            <SelectValue placeholder="テンプレートを選択" />
          </SelectTrigger>
          <SelectContent>
            {prompts.map((prompt) => (
              <SelectItem key={prompt.id} value={prompt.id} data-testid={`option-template-${prompt.id}`}>
                {prompt.name}
                {prompt.category === "custom" && " (カスタム)"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedPrompt && (
        <>
          <div className="space-y-2">
            <label className="text-sm font-medium">実行するシステムプロンプト</label>
            <Textarea
              value={editedText}
              onChange={(e) => setEditedText(e.target.value)}
              className="min-h-[300px] text-sm font-mono"
              placeholder="システムプロンプトを入力..."
              data-testid="textarea-system-prompt"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSaveDialog(true)}
              data-testid="button-save-new"
            >
              <Plus className="h-4 w-4 mr-1" />
              新規保存
            </Button>

            {isCustom && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleOverwrite}
                disabled={!isModified || updateMutation.isPending}
                data-testid="button-overwrite"
              >
                <Save className="h-4 w-4 mr-1" />
                上書き保存
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={!isModified}
              data-testid="button-reset"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              リセット
            </Button>

            {isCustom && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleteDialog(true)}
                className="text-destructive hover:text-destructive"
                data-testid="button-delete-template"
              >
                <Trash2 className="h-4 w-4 mr-1" />
                削除
              </Button>
            )}
          </div>
        </>
      )}

      <Dialog open={showSaveDialog} onOpenChange={setShowSaveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>新規テンプレートとして保存</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="テンプレート名を入力"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              data-testid="input-template-name"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveDialog(false)}>
              キャンセル
            </Button>
            <Button
              onClick={handleSaveNew}
              disabled={!newTemplateName.trim() || createMutation.isPending}
              data-testid="button-confirm-save"
            >
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>本当に削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{selectedPrompt?.name}」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
