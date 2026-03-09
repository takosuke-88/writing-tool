import { useState, useRef, useCallback, useEffect } from "react";
import {
  Menu,
  Plus,
  Settings,
  MessageSquare,
  Trash2,
  Edit2,
  BarChart3,
  MoreVertical,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@shared/schema";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface ChatSidebarProps {
  conversations: Conversation[];
  selectedConversationId: number | null;
  onSelectConversation: (conversation: Conversation) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: number) => void;
  onUpdateTitle: (id: number, title: string) => void;
  onToggleSettings: () => void;
  className?: string;
}

// Extracted ConversationItem component to properly scope state per item
function ConversationItem({
  conversation,
  isSelected,
  editingId,
  onSelect,
  onStartEditing,
  onFinishEditing,
  onDelete,
}: {
  conversation: Conversation;
  isSelected: boolean;
  editingId: number | null;
  onSelect: () => void;
  onStartEditing: (id: number, title: string) => void;
  onFinishEditing: (id: number, title: string) => void;
  onDelete: (id: number) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const isEditing = editingId === conversation.id;
  const longPressFiredRef = useRef(false);

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
    <div
      className={cn(
        "group relative flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer mb-1 transition-colors",
        isSelected ? "bg-sidebar-accent" : "hover:bg-sidebar-accent/50",
      )}
      onClick={() => {
        if (longPressFiredRef.current) {
          longPressFiredRef.current = false;
          return;
        }
        if (!isEditing) onSelect();
      }}
      onContextMenu={(e) => {
        if (!isEditing) {
          e.preventDefault();
          longPressFiredRef.current = true;
          // React synthetic events might not fire onClick after contextmenu,
          // but if they do, longPressFiredRef catches it. Reset it just in case.
          setTimeout(() => {
            longPressFiredRef.current = false;
          }, 500);
          setDropdownOpen(true);
        }
      }}
      style={
        {
          WebkitTouchCallout: isEditing ? "auto" : "none",
          userSelect: isEditing ? "auto" : "none",
        } as React.CSSProperties
      }
    >
      <MessageSquare className="h-4 w-4 text-sidebar-foreground/70 flex-shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        {isEditing ? (
          <InlineEditInput
            initialTitle={conversation.title}
            onSave={(newTitle) => {
              onFinishEditing(conversation.id, newTitle);
            }}
            onCancel={() => {
              onFinishEditing(conversation.id, "");
            }}
          />
        ) : (
          <p className="text-sm text-sidebar-foreground truncate font-medium">
            {conversation.title}
          </p>
        )}
        <p className="text-xs text-sidebar-foreground/70 mt-0.5">
          {formatDate(conversation.updatedAt)}
        </p>
      </div>

      {!isEditing && (
        <div className="flex-shrink-0">
          <DropdownMenu
            open={dropdownOpen}
            onOpenChange={setDropdownOpen}
            modal={false}
          >
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-7 w-7 text-sidebar-foreground/70 hover:bg-sidebar-accent transition-opacity duration-200",
                  "opacity-100 md:opacity-0 md:group-hover:opacity-100",
                  dropdownOpen && "md:opacity-100",
                )}
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-36"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setDropdownOpen(false);
                  setTimeout(() => {
                    onStartEditing(conversation.id, conversation.title);
                  }, 150);
                }}
                className="cursor-pointer flex items-center gap-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>名前変更</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  setDropdownOpen(false);
                  onDelete(conversation.id);
                }}
                className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>削除</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

// Dedicated inline editing component with its own state and lifecycle
function InlineEditInput({
  initialTitle,
  onSave,
  onCancel,
}: {
  initialTitle: string;
  onSave: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialTitle);
  const inputRef = useRef<HTMLInputElement>(null);
  const committedRef = useRef(false);

  // Focus and select on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 30);
    return () => clearTimeout(timer);
  }, []);

  const commit = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    const trimmed = value.trim();
    if (trimmed && trimmed !== initialTitle) {
      onSave(trimmed);
    } else {
      onCancel();
    }
  }, [value, initialTitle, onSave, onCancel]);

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        // Small delay to handle potential race conditions
        setTimeout(commit, 50);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          commit();
        } else if (e.key === "Escape") {
          e.preventDefault();
          committedRef.current = true;
          onCancel();
        }
      }}
      onClick={(e) => e.stopPropagation()}
      className="text-sm text-foreground font-medium bg-background border border-primary rounded px-1.5 py-0.5 -mx-1.5 -my-0.5 outline-none w-full"
    />
  );
}

export function ChatSidebar({
  conversations,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  onUpdateTitle,
  onToggleSettings,
  className,
}: ChatSidebarProps) {
  const [editingId, setEditingId] = useState<number | null>(null);

  const handleStartEditing = useCallback((id: number, _title: string) => {
    setEditingId(id);
  }, []);

  const handleFinishEditing = useCallback(
    (id: number, newTitle: string) => {
      if (newTitle) {
        onUpdateTitle(id, newTitle);
      }
      setEditingId(null);
    },
    [onUpdateTitle],
  );

  return (
    <div className={cn("w-[280px] h-full bg-sidebar border-r border-sidebar-border flex flex-col", className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-3 border-b border-sidebar-border">
        <div className="flex items-center gap-2 mb-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-sidebar-foreground/70 hover:bg-sidebar-accent"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <span className="text-sidebar-foreground font-medium text-lg">チャット</span>
        </div>

        <Button
          onClick={onNewConversation}
          className="w-full bg-background border border-border text-foreground hover:bg-muted shadow-sm h-10"
        >
          <Plus className="h-4 w-4 mr-2" />
          新しいチャット
        </Button>

        <Link href="/dashboard">
          <Button
            variant="ghost"
            className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent h-10 mt-2"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            使用状況ダッシュボード
          </Button>
        </Link>
      </div>

      {/* Conversation List */}
      <ScrollArea className="flex-1">
        <div className="p-2">
          {conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-sidebar-foreground/70">
              会話がありません
            </div>
          ) : (
            conversations.map((conversation) => (
              <ConversationItem
                key={conversation.id}
                conversation={conversation}
                isSelected={selectedConversationId === conversation.id}
                editingId={editingId}
                onSelect={() => onSelectConversation(conversation)}
                onStartEditing={handleStartEditing}
                onFinishEditing={handleFinishEditing}
                onDelete={onDeleteConversation}
              />
            ))
          )}
        </div>
      </ScrollArea>

      {/* Bottom Settings */}
      <div className="flex-shrink-0 p-3 border-t border-sidebar-border">
        <Button
          variant="ghost"
          className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent h-10"
          onClick={onToggleSettings}
        >
          <Settings className="h-4 w-4 mr-2" />
          設定
        </Button>
      </div>
    </div>
  );
}
