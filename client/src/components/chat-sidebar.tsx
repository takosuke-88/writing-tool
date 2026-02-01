import { useState } from "react";
import { Menu, Plus, Settings, MessageSquare, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@shared/schema";
import { cn } from "@/lib/utils";

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversationId: number | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
}

export function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: ChatSidebarProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - new Date(date).getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "今日";
    if (diffDays === 1) return "昨日";
    if (diffDays < 7) return `${diffDays}日前`;

    return new Date(date).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="w-[280px] h-full bg-white border-r border-[#dadce0] flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-[#dadce0]">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-[#5f6368] hover:bg-[#f1f3f4]"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-[#202124] font-medium text-lg">チャット</span>
        </div>

        <Button
          onClick={onNewConversation}
          className="w-full bg-white border border-[#dadce0] text-[#202124] hover:bg-[#f8f9fa] shadow-sm h-10"
        >
          <Plus className="h-4 w-4 mr-2" />
          新しいチャット
        </Button>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-[#5f6368]">
              会話がありません
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  "group relative flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer mb-1 transition-colors",
                  selectedConversationId === conversation.id
                    ? "bg-[#e8f0fe]"
                    : "hover:bg-[#f1f3f4]",
                )}
                onClick={() => onSelectConversation(conversation)}
              >
                <MessageSquare className="h-4 w-4 text-[#5f6368] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#202124] truncate font-medium">
                    {conversation.title}
                  </p>
                  <p className="text-xs text-[#5f6368] mt-0.5">
                    {formatDate(conversation.updatedAt)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 h-7 w-7 text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] flex-shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conversation.id);
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Bottom Settings */}
      <div className="flex-shrink-0 p-3 border-t border-[#dadce0]">
        <Button
          variant="ghost"
          className="w-full justify-start text-[#5f6368] hover:bg-[#f1f3f4] h-10"
        >
          <Settings className="h-4 w-4 mr-2" />
          設定
        </Button>
      </div>
    </div>
  );
}
