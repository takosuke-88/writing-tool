import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface MessageInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
}

export function MessageInput({
  onSend,
  onStop,
  isGenerating = false,
  disabled = false,
}: MessageInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [message]);

  const handleSend = () => {
    if (message.trim() && !disabled && !isGenerating) {
      onSend(message.trim());
      setMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="border-t border-[#dadce0] bg-white p-4">
      <div className="max-w-3xl mx-auto">
        <div className="relative flex items-end gap-2 bg-white border border-[#dadce0] rounded-lg p-2">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="メッセージを入力してください..."
            className="min-h-[24px] max-h-[200px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0 text-[#202124] placeholder:text-[#5f6368] p-0"
            disabled={disabled || isGenerating}
            rows={1}
          />

          {isGenerating ? (
            <Button
              onClick={onStop}
              variant="ghost"
              size="icon"
              className="h-8 w-8 flex-shrink-0 text-[#5f6368] hover:bg-[#f1f3f4]"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSend}
              disabled={!message.trim() || disabled}
              size="icon"
              className="h-8 w-8 flex-shrink-0 bg-[#1a73e8] hover:bg-[#1557b0] text-white disabled:bg-[#dadce0] disabled:text-[#80868b]"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>

        <p className="text-xs text-[#5f6368] mt-2 text-center">
          Enterで送信、Shift+Enterで改行
        </p>
      </div>
    </div>
  );
}
