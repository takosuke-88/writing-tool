import { useState, useRef, useEffect } from "react";
import { Edit2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageBubble } from "@/components/message-bubble";
import { MessageInput } from "@/components/message-input";
import type { Message } from "@shared/schema";

interface ChatAreaProps {
  conversationId: number | null;
  title: string;
  messages: Message[];
  onSendMessage: (message: string) => void;
  onUpdateTitle: (title: string) => void;
  onStopGeneration?: () => void;
  isGenerating?: boolean;
}

export function ChatArea({
  conversationId,
  title,
  messages,
  onSendMessage,
  onUpdateTitle,
  onStopGeneration,
  isGenerating = false,
}: ChatAreaProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Update edited title when title prop changes
  useEffect(() => {
    setEditedTitle(title);
  }, [title]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSaveTitle = () => {
    if (editedTitle.trim()) {
      onUpdateTitle(editedTitle.trim());
      setIsEditingTitle(false);
    }
  };

  const handleCancelEdit = () => {
    setEditedTitle(title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveTitle();
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  if (!conversationId) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-white p-8">
        <div className="text-center space-y-4 max-w-md">
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-[#1a73e8] to-[#1557b0] rounded-2xl flex items-center justify-center">
            <svg
              className="w-8 h-8 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-medium text-[#202124]">
            新しい会話を始めましょう
          </h2>
          <p className="text-[#5f6368]">
            左側の「新しいチャット」ボタンをクリックして、AIとの会話を開始してください。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white">
      {/* Title Bar */}
      <div className="flex-shrink-0 border-b border-[#dadce0] px-6 py-4 bg-white">
        {isEditingTitle ? (
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 text-lg font-medium border-[#dadce0] text-[#202124]"
              autoFocus
            />
            <Button
              size="icon"
              variant="ghost"
              onClick={handleSaveTitle}
              className="h-8 w-8 text-[#1a73e8] hover:bg-[#e8f0fe]"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={handleCancelEdit}
              className="h-8 w-8 text-[#5f6368] hover:bg-[#f1f3f4]"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group max-w-3xl mx-auto">
            <h1 className="text-lg font-medium text-[#202124] flex-1">
              {title}
            </h1>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setIsEditingTitle(true)}
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-[#5f6368] hover:bg-[#f1f3f4]"
            >
              <Edit2 className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full p-8">
              <p className="text-[#5f6368] text-center">
                メッセージを入力して会話を始めてください
              </p>
            </div>
          ) : (
            messages.map((message, index) => (
              <MessageBubble
                key={message.id}
                role={message.role as "user" | "assistant"}
                content={message.content}
                createdAt={message.createdAt}
                isLoading={
                  isGenerating &&
                  index === messages.length - 1 &&
                  message.role === "assistant"
                }
              />
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Message Input */}
      <MessageInput
        onSend={onSendMessage}
        onStop={onStopGeneration}
        isGenerating={isGenerating}
      />
    </div>
  );
}
