import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Trash2, Clock, Hash, PenLine } from "lucide-react";
import type { Article } from "@shared/schema";

interface AppSidebarProps {
  selectedArticleId: number | null;
  onSelectArticle: (article: Article) => void;
}

export function AppSidebar({ selectedArticleId, onSelectArticle }: AppSidebarProps) {
  const { toast } = useToast();

  const { data: articles, isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/articles/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
      toast({
        title: "記事を削除しました",
      });
    },
    onError: () => {
      toast({
        title: "削除に失敗しました",
        variant: "destructive",
      });
    },
  });

  const handleDelete = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    deleteMutation.mutate(id);
  };

  const formatDate = (dateString: string | Date) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncateTitle = (text: string, maxLength: number = 25) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-4">
        <div className="flex items-center gap-2">
          <PenLine className="h-5 w-5 text-primary" />
          <span className="font-semibold text-sidebar-foreground">Writing Tool</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="h-[calc(100vh-80px)]">
          <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2 px-4">
              <FileText className="h-4 w-4" />
              過去の記事
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  <div className="px-4 py-8 text-center text-sm text-sidebar-foreground/60">
                    読み込み中...
                  </div>
                ) : !articles || articles.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-sidebar-foreground/60">
                    まだ記事がありません
                  </div>
                ) : (
                  articles.map((article) => (
                    <SidebarMenuItem key={article.id}>
                      <SidebarMenuButton
                        onClick={() => onSelectArticle(article)}
                        className={`group w-full px-3 py-3 ${selectedArticleId === article.id ? "bg-sidebar-accent" : ""}`}
                        data-testid={`button-article-${article.id}`}
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <p className="text-sm font-medium truncate text-sidebar-foreground">
                            {truncateTitle(article.title)}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-sidebar-foreground/60">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(article.generatedAt)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {article.characterCount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => handleDelete(e, article.id)}
                          className="opacity-0 group-hover:opacity-100 h-8 w-8 text-sidebar-foreground/60 hover:text-destructive hover:bg-destructive/10"
                          data-testid={`button-delete-${article.id}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </ScrollArea>
      </SidebarContent>
    </Sidebar>
  );
}
