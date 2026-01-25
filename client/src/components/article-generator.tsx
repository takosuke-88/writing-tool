import { useState, useEffect, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ArticleForm } from "@/components/article-form";
import { ArticleResult } from "@/components/article-result";
import { Sparkles } from "lucide-react";
import type { Article, GenerateArticleResponse } from "@shared/schema";

interface ArticleGeneratorProps {
  selectedArticle: Article | null;
  onClearSelection: () => void;
}

export function ArticleGenerator({ selectedArticle, onClearSelection }: ArticleGeneratorProps) {
  const { toast } = useToast();
  const [generatedArticle, setGeneratedArticle] = useState<GenerateArticleResponse | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef(false);

  useEffect(() => {
    if (selectedArticle) {
      setGeneratedArticle(null);
    }
  }, [selectedArticle]);

  const generateMutation = useMutation({
    mutationFn: async (data: { prompt: string; targetLength: number }) => {
      isCancelledRef.current = false;
      abortControllerRef.current = new AbortController();
      const response = await apiRequest<GenerateArticleResponse>(
        "POST", 
        "/api/generate-article", 
        data,
        abortControllerRef.current.signal
      );
      return response;
    },
    onSuccess: async (data) => {
      abortControllerRef.current = null;
      if (isCancelledRef.current) {
        try {
          await apiRequest("DELETE", `/api/articles/${data.id}`);
          queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
        } catch {
        }
        return;
      }
      setGeneratedArticle(data);
      onClearSelection();
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "記事を保存しました",
        description: `${data.characterCount}文字の記事が生成されました`,
      });
    },
    onError: (error: Error) => {
      abortControllerRef.current = null;
      if (error.name === "AbortError" || isCancelledRef.current) {
        return;
      }
      toast({
        title: "エラーが発生しました",
        description: error.message || "記事の生成に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = (prompt: string, targetLength: number) => {
    setGeneratedArticle(null);
    onClearSelection();
    isCancelledRef.current = false;
    generateMutation.mutate({ prompt, targetLength });
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    generateMutation.reset();
    toast({
      title: "キャンセルしました",
      description: "記事の生成をキャンセルしました",
    });
  };

  const handleNewArticle = () => {
    setGeneratedArticle(null);
    onClearSelection();
    generateMutation.reset();
  };

  const displayArticle = selectedArticle 
    ? { 
        article: selectedArticle.content, 
        characterCount: selectedArticle.characterCount, 
        generatedAt: selectedArticle.generatedAt.toString(), 
        id: selectedArticle.id 
      }
    : generatedArticle;

  return (
    <div className="flex flex-col h-full">
      <header className="flex-shrink-0 border-b bg-card px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-md">
            <Sparkles className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground" data-testid="text-app-title">
              Claude SEO Article Generator
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5" data-testid="text-app-subtitle">
              AIが人間らしく記事を書く
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <ArticleForm
            onGenerate={handleGenerate}
            onCancel={handleCancel}
            isGenerating={generateMutation.isPending}
          />
          
          {displayArticle && (
            <ArticleResult
              article={displayArticle.article}
              characterCount={displayArticle.characterCount}
              generatedAt={displayArticle.generatedAt}
              onNewArticle={handleNewArticle}
              isFromHistory={!!selectedArticle}
            />
          )}
        </div>
      </div>
    </div>
  );
}
