import { useState, useEffect } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ChatArea } from "@/components/chat-area";
import { ChatSettingsPanel } from "@/components/chat-settings-panel";
import { useToast } from "@/hooks/use-toast";
import { getAllMockConversations, mockMessages } from "@/lib/mockData";
import type { Conversation, Message } from "@shared/schema";
import { Switch, Route } from "wouter";
import Dashboard from "@/pages/dashboard";

// Custom JSON reviver to restore Date objects from localStorage
function dateReviver(key: string, value: any) {
  if (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)
  ) {
    return new Date(value);
  }
  return value;
}

// Custom hook for localStorage persistence
function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Read from localStorage on mount
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item, dateReviver) : initialValue;
    } catch (error) {
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // Save to localStorage whenever value changes
  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      console.error(`Error saving localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}

import { Menu, Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function ChatApp() {
  const { toast } = useToast();

  // State from API
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(null);
  const [messages, setMessages] = useState<Record<number, Message[]>>({});
  const [isLoading, setIsLoading] = useState(true);

  // Mobile Drawer States
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isMobileSettingsOpen, setIsMobileSettingsOpen] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetch("/api/conversations")
      .then((res) => res.json())
      .then((data) => {
        setConversations(data);
        if (data.length > 0) {
          const firstId = data[0].id;
          setSelectedConversationId(firstId);
          fetchMessages(firstId);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load conversations", err);
        setIsLoading(false);
      });
  }, []);

  const fetchMessages = async (convId: number) => {
    try {
      const res = await fetch(`/api/conversation-details?id=${convId}`);
      if (!res.ok) return;
      const data = await res.json();
      setMessages((prev) => ({ ...prev, [convId]: data.messages || [] }));
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [systemInstructions, setSystemInstructions] = useLocalStorage<string>(
    "chat-system-instructions",
    "",
  );
  const [isSystemInstructionsOpen, setIsSystemInstructionsOpen] =
    useLocalStorage<boolean>("chat-system-instructions-open", false);

  // Get current conversation
  const currentConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );
  const currentMessages = selectedConversationId
    ? messages[selectedConversationId] || []
    : [];

  // Settings state with localStorage persistence
  const [model, setModel] = useLocalStorage<string>(
    "chat-model",
    "claude-sonnet-4-5",
  );
  const [temperature, setTemperature] = useLocalStorage<number>(
    "chat-temperature",
    70,
  );
  const [maxTokens, setMaxTokens] = useLocalStorage<number>(
    "chat-max-tokens",
    4096,
  );
  const [topP, setTopP] = useLocalStorage<number>("chat-top-p", 100);
  const [searchMode, setSearchMode] = useLocalStorage<string>(
    "chat-search-mode",
    "auto",
  );
  const [tavilyApiKey, setTavilyApiKey] = useLocalStorage<string>(
    "chat-tavily-api-key",
    "",
  );
  const [isSettingsOpen, setIsSettingsOpen] = useState(true);

  // Fix legacy model IDs and temperature
  useEffect(() => {
    if (temperature > 100) {
      setTemperature(70);
    }
    // Migrate legacy/invalid model IDs
    if (model === "sonar-pro") {
      setModel("sonar");
      toast({
        title: "モデル設定を更新しました",
        description: "sonar-pro → sonar",
      });
    } else if (model === "gemini-3-pro-preview") {
      setModel("gemini-2.5-pro");
      toast({
        title: "モデル設定を更新しました",
        description: "gemini-3-pro → gemini-2.5-pro",
      });
    } else if (model === "claude-4-5-sonnet-latest") {
      setModel("claude-sonnet-4-5");
      toast({
        title: "モデル設定を更新しました",
        description: "INVALID ID → claude-sonnet-4-5",
      });
    }
  }, [model, temperature]);

  // Handlers
  const handleNewConversation = async () => {
    try {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "新しい会話",
          model,
          temperature,
          maxTokens,
          topP,
        }),
      });
      const newConv = await res.json();
      setConversations([newConv, ...conversations]);
      setMessages((prev) => ({ ...prev, [newConv.id]: [] }));
      setSelectedConversationId(newConv.id);
      setIsMobileSidebarOpen(false); // Close sidebar on mobile
      toast({ title: "新しい会話を作成しました" });
    } catch (err) {
      console.error(err);
      toast({
        title: "エラー",
        description: "会話の作成に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setModel(conversation.model || "claude-sonnet-4-5");
    setTemperature(conversation.temperature || 70);
    setMaxTokens(conversation.maxTokens || 4096);
    setTopP(conversation.topP || 100);
    if (!messages[conversation.id]) {
      fetchMessages(conversation.id);
    }
    setIsMobileSidebarOpen(false); // Close sidebar on mobile
  };

  const handleDeleteConversation = async (id: number) => {
    try {
      await fetch(`/api/conversation-details?id=${id}`, { method: "DELETE" });
      setConversations(conversations.filter((c) => c.id !== id));
      const newMessages = { ...messages };
      delete newMessages[id];
      setMessages(newMessages);

      if (selectedConversationId === id) {
        const nextConv = conversations.find((c) => c.id !== id);
        setSelectedConversationId(nextConv ? nextConv.id : null);
        if (nextConv) fetchMessages(nextConv.id);
      }

      toast({ title: "会話を削除しました" });
    } catch (err) {
      toast({
        title: "エラー",
        description: "削除に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTitle = async (id: number, title: string) => {
    try {
      await fetch(`/api/conversation-details?id=${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      setConversations(
        conversations.map((c) =>
          c.id === id ? { ...c, title, updatedAt: new Date() } : c,
        ),
      );
      toast({ title: "タイトルを更新しました" });
    } catch (err) {
      toast({
        title: "エラー",
        description: "タイトルの更新に失敗しました",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = async (content: string) => {
    if (!selectedConversationId) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now(),
      conversationId: selectedConversationId,
      role: "user",
      content,
      createdAt: new Date(),
    };

    setMessages({
      ...messages,
      [selectedConversationId]: [
        ...(messages[selectedConversationId] || []),
        userMessage,
      ],
    });

    try {
      // Save user message to DB
      await fetch(`/api/conversation-messages?id=${selectedConversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "user", content }),
      });
    } catch (err) {
      console.error("Failed to save user message to DB", err);
    }

    // Update conversation title if it's the first message
    const currentMessages = messages[selectedConversationId] || [];
    if (currentMessages.length === 0) {
      const newTitle =
        content.slice(0, 30) + (content.length > 30 ? "..." : "");
      handleUpdateTitle(selectedConversationId, newTitle);
    }

    // Prepare AI Placeholder
    const aiMessageId = Date.now() + 1;
    const aiMessage: Message = {
      id: aiMessageId,
      conversationId: selectedConversationId,
      role: "assistant",
      content: "", // Start empty
      createdAt: new Date(),
    };

    setMessages((prev) => ({
      ...prev,
      [selectedConversationId]: [
        ...(prev[selectedConversationId] || []),
        aiMessage,
      ],
    }));

    setIsGenerating(true);

    try {
      const history = messages[selectedConversationId] || [];
      const stripFooter = (text: string) => {
        return text
          .replace(/\n\n---\n(Search Model:[^\n]*\n\n?)?(Model:[^\n]*)?$/, "")
          .replace(/\n\n---\s*$/, "")
          .trim();
      };
      const apiMessages = [...history, userMessage]
        .filter((m) => m.content && m.content.trim() !== "")
        .map((m) => ({
          role: m.role,
          content: m.role === "assistant" ? stripFooter(m.content) : m.content,
        }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: apiMessages,
          model: model,
          temperature,
          maxTokens,
          topP,
          systemInstructions,
          searchMode,
        }),
      });

      if (!response.ok) throw new Error(`API Error: ${response.status}`);
      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullText = "";

      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6);
              if (dataStr === "[DONE]") {
                done = true;
                break;
              }
              try {
                const data = JSON.parse(dataStr);
                if (data.type === "content") {
                  fullText += data.text;
                  setMessages((prev) => {
                    const msgs = prev[selectedConversationId] || [];
                    return {
                      ...prev,
                      [selectedConversationId]: msgs.map((m) =>
                        m.id === aiMessageId ? { ...m, content: fullText } : m,
                      ),
                    };
                  });
                } else if (data.type === "footer") {
                  fullText += data.text;
                  setMessages((prev) => {
                    const msgs = prev[selectedConversationId] || [];
                    return {
                      ...prev,
                      [selectedConversationId]: msgs.map((m) =>
                        m.id === aiMessageId ? { ...m, content: fullText } : m,
                      ),
                    };
                  });
                } else if (data.type === "status") {
                  toast({ description: data.text, duration: 2000 });
                } else if (data.type === "model_selected") {
                  toast({
                    title: "モデル自動選択",
                    description: `Selected: ${data.model}`,
                  });
                } else if (data.type === "warning") {
                  const apiName = data.api ? data.api.toUpperCase() : "API";
                  toast({
                    title: `${apiName} 制限警告`,
                    description: data.message,
                    variant: "destructive",
                    duration: 5000,
                  });
                } else if (data.type === "error") {
                  console.error("Received error frame:", data);
                  toast({
                    title: "エラー",
                    description: data.message,
                    variant: "destructive",
                  });
                } else if (data.type === "debug") {
                  console.log("[API Debug Info]", data.data);
                }
              } catch (e) {
                // ignore parse errors
              }
            }
          }
        }
      }

      // Save AI message to DB when completed
      if (fullText) {
        try {
          await fetch(
            `/api/conversation-messages?id=${selectedConversationId}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ role: "assistant", content: fullText }),
            },
          );
        } catch (err) {
          console.error("Failed to save AI message to DB", err);
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "エラーが発生しました",
        description: "AIの応答を取得できませんでした。",
        variant: "destructive",
      });
      // Remove the failed placeholder message
      setMessages((prev) => {
        const msgs = prev[selectedConversationId] || [];
        return {
          ...prev,
          [selectedConversationId]: msgs.filter((m) => m.id !== aiMessageId),
        };
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleStopGeneration = () => {
    setIsGenerating(false);
    toast({
      title: "生成を停止しました",
    });
  };

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-white overflow-hidden">
      {/* Mobile Top Header - Visible only on md and down */}
      <div className="md:hidden flex-shrink-0 flex items-center justify-between border-b border-[#dadce0] px-4 h-14 bg-white z-10">
        <Sheet open={isMobileSidebarOpen} onOpenChange={setIsMobileSidebarOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#5f6368] hover:bg-[#f1f3f4]"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-[280px]">
             <ChatSidebar
              conversations={conversations}
              selectedConversationId={selectedConversationId}
              onSelectConversation={handleSelectConversation}
              onNewConversation={handleNewConversation}
              onDeleteConversation={handleDeleteConversation}
              onUpdateTitle={handleUpdateTitle}
              onToggleSettings={() => {
                setIsMobileSidebarOpen(false);
                setIsMobileSettingsOpen(true);
              }}
              className="w-full border-r-0"
            />
          </SheetContent>
        </Sheet>

        <h1 className="text-base font-medium text-[#202124] truncate flex-1 text-center px-4">
          {currentConversation?.title || "新しい会話"}
        </h1>

        <Sheet open={isMobileSettingsOpen} onOpenChange={setIsMobileSettingsOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-[#5f6368] hover:bg-[#f1f3f4]"
            >
              <SettingsIcon className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0 w-[300px] sm:w-[350px]">
             <ChatSettingsPanel
              model={model}
              temperature={temperature}
              maxTokens={maxTokens}
              topP={topP}
              systemInstructions={systemInstructions}
              isSystemInstructionsOpen={isSystemInstructionsOpen}
              onModelChange={setModel}
              onTemperatureChange={setTemperature}
              onMaxTokensChange={setMaxTokens}
              onTopPChange={setTopP}
              onSystemInstructionsChange={setSystemInstructions}
              onSystemInstructionsOpenChange={setIsSystemInstructionsOpen}
              searchMode={searchMode}
              onSearchModeChange={setSearchMode}
              tavilyApiKey={tavilyApiKey}
              onTavilyApiKeyChange={setTavilyApiKey}
              className="w-full border-l-0"
            />
          </SheetContent>
        </Sheet>
      </div>

      {/* PC Left Sidebar - Hidden on mobile */}
      <div className="hidden md:block h-full">
        <ChatSidebar
          conversations={conversations}
          selectedConversationId={selectedConversationId}
          onSelectConversation={handleSelectConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
          onUpdateTitle={handleUpdateTitle}
          onToggleSettings={() => setIsSettingsOpen((prev) => !prev)}
        />
      </div>

      {/* Main Chat Area - Expands to full width */}
      <div className="flex-1 w-full h-full flex flex-col min-w-0">
        <ChatArea
          conversationId={selectedConversationId}
          title={currentConversation?.title || "新しい会話"}
          messages={currentMessages}
          onSendMessage={handleSendMessage}
          onUpdateTitle={(title) =>
            selectedConversationId &&
            handleUpdateTitle(selectedConversationId, title)
          }
          onStopGeneration={handleStopGeneration}
          isGenerating={isGenerating}
        />
      </div>

      {/* PC Right Settings Panel - Hidden on mobile */}
      {isSettingsOpen && (
        <div className="hidden md:block h-full">
          <ChatSettingsPanel
            model={model}
            temperature={temperature}
            maxTokens={maxTokens}
            topP={topP}
            systemInstructions={systemInstructions}
            isSystemInstructionsOpen={isSystemInstructionsOpen}
            onModelChange={setModel}
            onTemperatureChange={setTemperature}
            onMaxTokensChange={setMaxTokens}
            onTopPChange={setTopP}
            onSystemInstructionsChange={setSystemInstructions}
            onSystemInstructionsOpenChange={setIsSystemInstructionsOpen}
            searchMode={searchMode}
            onSearchModeChange={setSearchMode}
            tavilyApiKey={tavilyApiKey}
            onTavilyApiKeyChange={setTavilyApiKey}
          />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <TooltipProvider>
          <Switch>
            <Route path="/dashboard" component={Dashboard} />
            <Route path="/" component={ChatApp} />
            <Route>404 Page Not Found</Route>
          </Switch>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
