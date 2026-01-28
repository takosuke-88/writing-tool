import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { RightPanel } from "@/components/right-panel";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { ArticleGenerator } from "@/components/article-generator";
import NotFound from "@/pages/not-found";
import type { Article } from "@shared/schema";

function AppLayout() {
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedPromptId, setSelectedPromptId] = useState<string | null>("seo-basic");

  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  const handleSelectArticle = (article: Article) => {
    setSelectedArticle(article);
  };

  const handleClearSelection = () => {
    setSelectedArticle(null);
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex h-screen w-full">
        <AppSidebar 
          selectedArticleId={selectedArticle?.id ?? null}
          onSelectArticle={handleSelectArticle}
        />
        <SidebarInset className="flex flex-col flex-1 min-w-0">
          <header className="flex items-center justify-between gap-2 px-4 py-2 border-b bg-background flex-shrink-0">
            <SidebarTrigger data-testid="button-sidebar-toggle" />
            <ThemeToggle />
          </header>
          <div className="flex flex-1 overflow-hidden">
            <main className="flex-1 overflow-hidden min-w-0">
              <Switch>
                <Route path="/">
                  <ArticleGenerator
                    selectedArticle={selectedArticle}
                    onClearSelection={handleClearSelection}
                    selectedPromptId={selectedPromptId}
                  />
                </Route>
                <Route component={NotFound} />
              </Switch>
            </main>
            <RightPanel
              selectedPromptId={selectedPromptId}
              onSelectPrompt={setSelectedPromptId}
            />
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <AppLayout />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
