import { useState } from "react";
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

function ChatApp() {
  const { toast } = useToast();

  // State
  const [conversations, setConversations] = useState<Conversation[]>(
    getAllMockConversations(),
  );
  const [selectedConversationId, setSelectedConversationId] = useState<
    number | null
  >(1);
  const [messages, setMessages] =
    useState<Record<number, Message[]>>(mockMessages);
  const [isGenerating, setIsGenerating] = useState(false);
  const [systemInstructions, setSystemInstructions] = useState("");

  // Get current conversation
  const currentConversation = conversations.find(
    (c) => c.id === selectedConversationId,
  );
  const currentMessages = selectedConversationId
    ? messages[selectedConversationId] || []
    : [];

  // Settings state (from current conversation or defaults)
  const [model, setModel] = useState(
    currentConversation?.model || "claude-sonnet-4-5",
  );
  const [temperature, setTemperature] = useState(
    currentConversation?.temperature || 70,
  );
  const [maxTokens, setMaxTokens] = useState(
    currentConversation?.maxTokens || 4096,
  );
  const [topP, setTopP] = useState(currentConversation?.topP || 100);

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

  const handleUpdateTitle = (title: string) => {
    if (!selectedConversationId) return;

    setConversations(
      conversations.map((c) =>
        c.id === selectedConversationId
          ? { ...c, title, updatedAt: new Date() }
          : c,
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
      handleUpdateTitle(newTitle);
    }

    // Simulate AI response (mock) -> Now real API call
    setIsGenerating(true);

    try {
      // Prepare context: include current history + new user message
      const history = messages[selectedConversationId] || [];
      const apiMessages = [...history, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: apiMessages,
          model:
            model === "claude-sonnet-4-5"
              ? "claude-3-5-sonnet-20240620"
              : model, // Map internal ID to API model name
          temperature,
          maxTokens,
          topP,
          systemInstructions,
        }),
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      // Debug logging
      console.log("API Response:", data);

      // Extract text from Anthropic response format
      const responseText =
        data.content?.[0]?.text || data.content || "応答を取得できませんでした";
      console.log("Extracted text:", responseText);

      const aiMessage: Message = {
        id: Date.now() + 1,
        conversationId: selectedConversationId,
        role: "assistant",
        content: responseText,
        createdAt: new Date(),
      };

      setMessages((prev) => ({
        ...prev,
        [selectedConversationId]: [
          ...(prev[selectedConversationId] || []),
          userMessage,
          aiMessage,
        ],
      }));
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "エラーが発生しました",
        description: "AIの応答を取得できませんでした。",
        variant: "destructive",
      });

      // Remove the user message if failed (optional, but good UX to indicate failure)
      // For now, keeping it but showing error
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
      />

      {/* Main Chat Area */}
      <ChatArea
        conversationId={selectedConversationId}
        title={currentConversation?.title || "新しい会話"}
        messages={currentMessages}
        onSendMessage={handleSendMessage}
        onUpdateTitle={handleUpdateTitle}
        onStopGeneration={handleStopGeneration}
        isGenerating={isGenerating}
      />

      {/* Right Settings Panel */}
      <ChatSettingsPanel
        model={model}
        temperature={temperature}
        maxTokens={maxTokens}
        topP={topP}
        systemInstructions={systemInstructions}
        onModelChange={setModel}
        onTemperatureChange={setTemperature}
        onMaxTokensChange={setMaxTokens}
        onTopPChange={setTopP}
        onSystemInstructionsChange={setSystemInstructions}
      />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="ui-theme">
        <TooltipProvider>
          <ChatApp />
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
