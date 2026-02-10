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

function ChatApp() {
  const { toast } = useToast();

  // State with localStorage persistence
  const [conversations, setConversations] = useLocalStorage<Conversation[]>(
    "chat-conversations",
    getAllMockConversations(),
  );
  const [selectedConversationId, setSelectedConversationId] = useLocalStorage<
    number | null
  >("chat-selected-id", 1);
  const [messages, setMessages] = useLocalStorage<Record<number, Message[]>>(
    "chat-messages",
    mockMessages,
  );
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
  const [isSettingsOpen, setIsSettingsOpen] = useState(true); // Default open or closed? Maybe true if user is confused it's gone.

  // Fix temperature if it's out of range (legacy values)
  useEffect(() => {
    if (temperature > 100) {
      setTemperature(70); // Reset to default
    }
  }, []); // Run once on mount

  // Handlers
  const handleNewConversation = () => {
    const maxId =
      conversations.length > 0
        ? Math.max(...conversations.map((c) => c.id))
        : 0;
    const newId = maxId + 1;
    const newConversation: Conversation = {
      id: newId,
      title: "新しい会話",
      createdAt: new Date(),
      updatedAt: new Date(),
      model: "claude-sonnet-4-5",
      temperature: 70,
      maxTokens: 4096,
      topP: 100,
    };

    setConversations([newConversation, ...conversations]);
    setMessages({ ...messages, [newId]: [] });
    setSelectedConversationId(newId);

    toast({
      title: "新しい会話を作成しました",
    });
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversationId(conversation.id);
    setModel(conversation.model);
    setTemperature(conversation.temperature);
    setMaxTokens(conversation.maxTokens);
    setTopP(conversation.topP);
  };

  const handleDeleteConversation = (id: number) => {
    setConversations(conversations.filter((c) => c.id !== id));
    const newMessages = { ...messages };
    delete newMessages[id];
    setMessages(newMessages);

    if (selectedConversationId === id) {
      setSelectedConversationId(conversations[0]?.id || null);
    }

    toast({
      title: "会話を削除しました",
    });
  };

  const handleUpdateTitle = (id: number, title: string) => {
    setConversations(
      conversations.map((c) =>
        c.id === id ? { ...c, title, updatedAt: new Date() } : c,
      ),
    );

    toast({
      title: "タイトルを更新しました",
    });
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
      // Filter out messages with empty content to prevent 400 errors from previous failed generations
      const apiMessages = [...history, userMessage]
        .filter((m) => m.content && m.content.trim() !== "")
        .map((m) => ({
          role: m.role,
          content: m.content,
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
                  // Update UI
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
    } catch (error) {
      // Syntax error fixed
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
    <div className="flex h-screen w-full overflow-hidden bg-white">
      {/* Left Sidebar */}
      <ChatSidebar
        conversations={conversations}
        selectedConversationId={selectedConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        onUpdateTitle={handleUpdateTitle}
        onToggleSettings={() => setIsSettingsOpen((prev: boolean) => !prev)}
      />

      {/* Main Chat Area */}
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

      {/* Right Settings Panel */}
      {isSettingsOpen && (
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
