import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Copy, Download, PlusCircle, Check, FileText, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ArticleResultProps {
  article: string;
  characterCount: number;
  generatedAt: string;
  onNewArticle: () => void;
  isFromHistory?: boolean;
}

export function ArticleResult({ article, characterCount, generatedAt, onNewArticle, isFromHistory }: ArticleResultProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(article);
      setCopied(true);
      toast({
        title: "コピーしました",
        description: "記事がクリップボードにコピーされました",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "コピーに失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    const blob = new Blob([article], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `article-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: "ダウンロードしました",
      description: "記事がテキストファイルとして保存されました",
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-primary" />
            {isFromHistory ? "保存済み記事" : "生成された記事"}
          </CardTitle>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1" data-testid="text-character-count">
              <FileText className="h-4 w-4" />
              {characterCount.toLocaleString()}文字
            </span>
            <span className="flex items-center gap-1" data-testid="text-generated-at">
              <Clock className="h-4 w-4" />
              {formatDate(generatedAt)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={article}
          readOnly
          className="min-h-[300px] max-h-[500px] resize-y text-base leading-relaxed"
          data-testid="textarea-article-content"
        />
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3 pt-0">
        <Button
          variant="outline"
          onClick={handleCopy}
          data-testid="button-copy"
        >
          {copied ? (
            <>
              <Check className="h-4 w-4 mr-2 text-primary" />
              コピーしました
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              コピー
            </>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleDownload}
          data-testid="button-download"
        >
          <Download className="h-4 w-4 mr-2" />
          ダウンロード
        </Button>
        <Button
          onClick={onNewArticle}
          className="ml-auto"
          data-testid="button-new-article"
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          新規作成
        </Button>
      </CardFooter>
    </Card>
  );
}
