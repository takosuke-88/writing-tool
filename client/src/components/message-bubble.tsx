import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { User, Bot, Loader2, Cpu, Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  isLoading?: boolean;
}

export function MessageBubble({
  role,
  content,
  createdAt,
  isLoading,
}: MessageBubbleProps) {
  const isUser = role === "user";

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Extract footer information if present
  let displayContent = content;
  let searchModel = null;
  let llmModel = null;

  if (!isUser && content) {
    const parts = content.split(/---\s*$/m);
    if (parts.length > 1) {
      const mainText = parts.slice(0, -1).join("---").trim();
      const footerText = parts[parts.length - 1].trim();

      const searchMatch = footerText.match(/Search Model\s*[:：]\s*(.+)/i);
      const modelMatch = footerText.match(/Model\s*[:：]\s*(.+)/i);

      if (searchMatch || modelMatch) {
        displayContent = mainText;
        if (searchMatch) searchModel = searchMatch[1].trim();
        if (modelMatch) llmModel = modelMatch[1].trim();
      }
    }
  }

  return (
    <div className="px-6 py-6 hover:bg-[#f8f9fa] transition-colors">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={
              isUser
                ? "w-8 h-8 rounded-full bg-[#1a73e8] flex items-center justify-center"
                : "w-8 h-8 rounded-full bg-[#f1f3f4] flex items-center justify-center"
            }
          >
            {isUser ? (
              <User className="h-4 w-4 text-white" />
            ) : (
              <Bot className="h-4 w-4 text-[#5f6368]" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[#202124]">
              {isUser ? "あなた" : "AI"}
            </span>
            <span className="text-xs text-[#5f6368]">
              {formatTime(createdAt)}
            </span>
          </div>

          <div className="prose prose-sm max-w-none text-[#202124]">
            {isLoading && !content ? (
              <div className="flex items-center gap-2 text-[#5f6368] py-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>執筆中...</span>
              </div>
            ) : (
              <ReactMarkdown
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || "");
                    return !inline && match ? (
                      <SyntaxHighlighter
                        style={vscDarkPlus as any}
                        language={match[1]}
                        PreTag="div"
                        className="rounded-lg"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className="bg-[#f1f3f4] px-1.5 py-0.5 rounded text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return (
                      <p className="text-[#202124] leading-relaxed mb-4 last:mb-0">
                        {children}
                      </p>
                    );
                  },
                  h1({ children }) {
                    return (
                      <h1 className="text-2xl font-semibold text-[#202124] mt-6 mb-4">
                        {children}
                      </h1>
                    );
                  },
                  h2({ children }) {
                    return (
                      <h2 className="text-xl font-semibold text-[#202124] mt-5 mb-3">
                        {children}
                      </h2>
                    );
                  },
                  h3({ children }) {
                    return (
                      <h3 className="text-lg font-semibold text-[#202124] mt-4 mb-2">
                        {children}
                      </h3>
                    );
                  },
                  ul({ children }) {
                    return (
                      <ul className="list-disc list-inside space-y-1 text-[#202124] mb-4">
                        {children}
                      </ul>
                    );
                  },
                  ol({ children }) {
                    return (
                      <ol className="list-decimal list-inside space-y-1 text-[#202124] mb-4">
                        {children}
                      </ol>
                    );
                  },
                  a({ children, href }) {
                    return (
                      <a href={href} className="text-[#1a73e8] hover:underline">
                        {children}
                      </a>
                    );
                  },
                }}
              >
                {displayContent}
              </ReactMarkdown>
            )}

            {/* Footer Badges */}
            {(searchModel || llmModel) && (
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                {searchModel && (
                  <Badge
                    variant="secondary"
                    className="bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1 text-[10px] py-0 px-2 font-normal border-blue-100"
                  >
                    <Search className="w-3 h-3" />
                    {searchModel}
                  </Badge>
                )}
                {llmModel && (
                  <Badge
                    variant="outline"
                    className="text-gray-500 flex items-center gap-1 text-[10px] py-0 px-2 font-normal"
                  >
                    <Cpu className="w-3 h-3" />
                    {llmModel}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
