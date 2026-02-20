import { useState, useRef, useEffect } from "react";
import { Send, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface MessageInputProps {
  onSend: (message: string) => void;
  onStop?: () => void;
  isGenerating?: boolean;
  disabled?: boolean;
  isDeepResearch?: boolean;
  onDeepResearchChange?: (enabled: boolean) => void;
}

export function MessageInput({
  onSend,
  onStop,
  isGenerating = false,
  disabled = false,
  isDeepResearch = false,
  onDeepResearchChange,
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

          <div className="flex items-center gap-1">
            {onDeepResearchChange && (
              <div className="flex items-center gap-2 mr-2 bg-purple-50 px-3 py-1.5 rounded-full border border-purple-100">
                <Switch
                  id="deep-research-mode"
                  checked={isDeepResearch}
                  onCheckedChange={onDeepResearchChange}
                  disabled={disabled || isGenerating}
                />
                <Label
                  htmlFor="deep-research-mode"
                  className="text-sm font-medium text-purple-700 cursor-pointer flex items-center gap-1.5"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z" />
                    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z" />
                  </svg>
                  Deep Research
                </Label>
              </div>
            )}
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
        </div>

        <p className="text-xs text-[#5f6368] mt-2 text-center">
          Enterで送信、Shift+Enterで改行
        </p>
      </div>
    </div>
  );
}
