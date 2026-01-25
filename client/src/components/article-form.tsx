import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Sparkles, X } from "lucide-react";

interface ArticleFormProps {
  onGenerate: (prompt: string, targetLength: number) => void;
  onCancel: () => void;
  isGenerating: boolean;
}

export function ArticleForm({ onGenerate, onCancel, isGenerating }: ArticleFormProps) {
  const [prompt, setPrompt] = useState("");
  const [targetLength, setTargetLength] = useState(800);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !isGenerating) {
      onGenerate(prompt.trim(), targetLength);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          記事を生成
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Textarea
              placeholder="お題またはラフな下書きを入力してください..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={isGenerating}
              className="min-h-[100px] max-h-[300px] resize-y text-base"
              data-testid="input-prompt"
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-foreground">
                目標文字数
              </label>
              <span className="text-sm font-semibold text-primary px-2 py-1 bg-primary/10 rounded-md" data-testid="text-target-length">
                {targetLength}文字
              </span>
            </div>
            <Slider
              value={[targetLength]}
              onValueChange={(value) => setTargetLength(value[0])}
              min={500}
              max={2000}
              step={100}
              disabled={isGenerating}
              className="w-full"
              data-testid="slider-target-length"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>500文字</span>
              <span>2000文字</span>
            </div>
          </div>

          {isGenerating ? (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 py-4 bg-muted/50 rounded-md">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div className="text-center">
                  <p className="text-sm font-medium text-foreground" data-testid="text-generating">
                    記事を生成中...
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Claude APIと通信中...
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="w-full"
                data-testid="button-cancel"
              >
                <X className="h-4 w-4 mr-2" />
                キャンセル
              </Button>
            </div>
          ) : (
            <Button
              type="submit"
              className="w-full"
              disabled={!prompt.trim()}
              data-testid="button-generate"
            >
              <Sparkles className="h-4 w-4 mr-2" />
              記事を生成する
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
