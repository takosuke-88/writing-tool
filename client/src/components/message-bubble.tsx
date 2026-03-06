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
    const parts = content.split(/\n---\s*\n/);
    if (parts.length > 1) {
      const mainText = parts.slice(0, -1).join("\n---\n").trim();
      const footerText = parts[parts.length - 1].trim();

      const searchMatch = footerText.match(/Search Model\s*[:：]\s*(.+)/i);
      const modelMatch = footerText.match(/^Model\s*[:：]\s*(.+)/im);

      if (searchMatch || modelMatch) {
        displayContent = mainText;
        if (searchMatch) searchModel = searchMatch[1].trim();
        if (modelMatch) llmModel = modelMatch[1].trim();
      }
    }
  }

  return (
    <div className="px-6 py-6 hover:bg-muted/50 transition-colors">
      <div className="flex gap-4">
        {/* Avatar */}
        <div className="flex-shrink-0">
          <div
            className={
              isUser
                ? "w-8 h-8 rounded-full bg-primary flex items-center justify-center"
                : "w-8 h-8 rounded-full bg-muted flex items-center justify-center"
            }
          >
            {isUser ? (
              <User className="h-4 w-4 text-primary-foreground" />
            ) : (
              <Bot className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {isUser ? "あなた" : "AI"}
            </span>
            <span className="text-xs text-muted-foreground">
              {formatTime(createdAt)}
            </span>
          </div>

          <div className="prose text-base md:prose-sm max-w-none text-foreground">
            {isLoading && !content ? (
              <div className="flex items-center gap-2 text-muted-foreground py-2">
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
                        className="rounded-lg text-sm md:text-xs"
                        {...props}
                      >
                        {String(children).replace(/\n$/, "")}
                      </SyntaxHighlighter>
                    ) : (
                      <code
                        className="bg-muted px-1.5 py-0.5 rounded text-base md:text-sm"
                        {...props}
                      >
                        {children}
                      </code>
                    );
                  },
                  p({ children }) {
                    return (
                      <p className="text-foreground leading-relaxed mb-4 last:mb-0">
                        {children}
                      </p>
                    );
                  },
                  h1({ children }) {
                    return (
                      <h1 className="text-3xl md:text-2xl font-semibold text-foreground mt-6 mb-4">
                        {children}
                      </h1>
                    );
                  },
                  h2({ children }) {
                    return (
                      <h2 className="text-2xl md:text-xl font-semibold text-foreground mt-5 mb-3">
                        {children}
                      </h2>
                    );
                  },
                  h3({ children }) {
                    return (
                      <h3 className="text-xl md:text-lg font-semibold text-foreground mt-4 mb-2">
                        {children}
                      </h3>
                    );
                  },
                  ul({ children }) {
                    return (
                      <ul className="list-disc list-inside space-y-1 text-foreground mb-4">
                        {children}
                      </ul>
                    );
                  },
                  ol({ children }) {
                    return (
                      <ol className="list-decimal list-inside space-y-1 text-foreground mb-4">
                        {children}
                      </ol>
                    );
                  },
                  a({ children, href }) {
                    return (
                      <a href={href} className="text-primary hover:underline">
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
              <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-border">
                {searchModel && (
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary hover:bg-primary/20 flex items-center gap-1 text-[10px] py-0 px-2 font-normal border-primary/20"
                  >
                    <Search className="w-3 h-3" />
                    {searchModel}
                  </Badge>
                )}
                {llmModel && (
                  <Badge
                    variant="outline"
                    className="text-muted-foreground flex items-center gap-1 text-[10px] py-0 px-2 font-normal"
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
