"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Send, Bot, User } from "lucide-react";
import ReactMarkdown from "react-markdown";
// Accordion imports removed as they are unused

interface Source {
  documentId: string;
  chunkId: string;
  score: number;
  text: string;
  sourceNumber?: number;
  metadata?: {
    page?: number;
    prov?: Record<string, unknown>[];
  };
}

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
}

export default function QueryPage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage = query;
    setQuery("");
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "", sources: [] },
    ]);

    try {
      const url = new URL(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/query/stream`,
      );
      url.searchParams.append("q", userMessage);

      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${typeof window !== "undefined" ? localStorage.getItem("token") : ""}`,
        },
      });

      if (!response.body) throw new Error("No body");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let accumulatedContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const jsonStr = line.replace("data: ", "").trim();
          try {
            const parsed = JSON.parse(jsonStr);
            if (parsed.type === "sources") {
              setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].sources = parsed.data;
                return newMsgs;
              });
            } else if (parsed.type === "token") {
              accumulatedContent += parsed.data;
              setMessages((prev) => {
                const newMsgs = [...prev];
                newMsgs[newMsgs.length - 1].content = accumulatedContent;
                return newMsgs;
              });
            }
          } catch {
            // Partial JSON
          }
        }
      }
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to query", error);
      setIsLoading(false);
    }
  };

  const handleSourceClick = (source: Source) => {
    setSelectedSource(source);
    setIsSidePanelOpen(true);
  };

  return (
    <div className="container mx-auto py-10 h-[calc(100vh-80px)] flex gap-6 max-w-7xl">
      {/* Main Chat Area */}
      <div
        className={`flex flex-col flex-1 transition-all duration-300 ${isSidePanelOpen ? "max-w-[50%]" : "max-w-4xl mx-auto"}`}
      >
        <h1 className="text-3xl font-bold mb-8 text-center text-primary">
          Knowledge Assistant
        </h1>

        <Card className="flex-1 min-h-0 overflow-hidden flex flex-col mb-4 border-2 shadow-lg bg-background/50 backdrop-blur-sm">
          <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
            <div className="p-6 space-y-8 flex flex-col min-h-min">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col gap-2 ${msg.role === "assistant" ? "items-start" : "items-end"}`}
                >
                  <div
                    className={`flex gap-4 shadow-sm w-full md:max-w-[95%] ${
                      msg.role === "assistant"
                        ? "bg-muted/80 p-4 rounded-2xl rounded-tl-none border border-border"
                        : "bg-primary text-primary-foreground p-4 rounded-2xl rounded-tr-none ml-auto"
                    }`}
                  >
                    <div className="mt-1 flex-shrink-0">
                      {msg.role === "assistant" ? (
                        <Bot className="h-5 w-5" />
                      ) : (
                        <User className="h-5 w-5" />
                      )}
                    </div>
                    <div className="flex-1 prose prose-sm dark:prose-invert break-words overflow-hidden">
                      <ReactMarkdown
                        components={{
                          p: ({ children }) => {
                            if (
                              typeof children === "string" ||
                              Array.isArray(children)
                            ) {
                              const process = (
                                child: React.ReactNode,
                              ): React.ReactNode => {
                                if (typeof child !== "string") return child;
                                const parts = child.split(/(\[\d+\])/g);
                                return parts.map((part, i) => {
                                  const match = part.match(/\[(\d+)\]/);
                                  if (match) {
                                    const sourceNum = parseInt(match[1]);
                                    const source = msg.sources?.find(
                                      (s) => s.sourceNumber === sourceNum,
                                    );
                                    if (source) {
                                      return (
                                        <button
                                          key={i}
                                          onClick={() =>
                                            handleSourceClick(source)
                                          }
                                          className="inline-flex items-center justify-center px-1.5 py-0.5 mx-0.5 text-[10px] font-bold leading-none text-primary bg-primary/10 border border-primary/20 rounded-md hover:bg-primary/20 transition-colors"
                                        >
                                          {sourceNum}
                                        </button>
                                      );
                                    }
                                  }
                                  return part;
                                });
                              };
                              return (
                                <p>
                                  {Array.isArray(children)
                                    ? children.map(process)
                                    : process(children)}
                                </p>
                              );
                            }
                            return <p>{children}</p>;
                          },
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  </div>

                  {msg.role === "assistant" &&
                    msg.sources &&
                    msg.sources.length > 0 && (
                      <div className="w-full mt-2 pl-12 max-w-[90%] flex flex-wrap gap-2">
                        {msg.sources.map((source, sIdx) => (
                          <Button
                            key={sIdx}
                            variant="ghost"
                            size="sm"
                            className="text-[10px] h-5 px-1.5 opacity-50 hover:opacity-100 flex gap-1 items-center"
                            onClick={() => handleSourceClick(source)}
                          >
                            <span className="font-bold border rounded px-1 min-w-[1.2rem] text-center">
                              {source.sourceNumber || sIdx + 1}
                            </span>
                            Source
                          </Button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.content === "" && (
                <div className="flex gap-4 items-center animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-muted p-3 rounded-2xl rounded-tl-none border border-border">
                    <div className="flex items-center gap-3 text-muted-foreground text-xs font-medium">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      Assistant is thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>

        <div className="relative group">
          <form
            onSubmit={handleSubmit}
            className="flex gap-2 p-1 bg-background border-2 rounded-full shadow-lg transition-all focus-within:border-primary/50"
          >
            <Input
              placeholder="Ask anything about your documents..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
              className="flex-1 h-12 border-none bg-transparent focus-visible:ring-0 text-base px-6"
            />
            <Button
              type="submit"
              disabled={isLoading || !query.trim()}
              className="h-10 w-10 rounded-full my-auto mr-1 p-0 flex items-center justify-center"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </div>
      </div>

      {/* Side Panel for Source Details */}
      {isSidePanelOpen && (
        <Card className="w-[50%] flex flex-col border-l-2 shadow-2xl animate-in slide-in-from-right duration-300">
          <div className="p-4 border-b flex justify-between items-center bg-muted/30">
            <h3 className="font-bold truncate max-w-[80%] text-primary">
              Source {selectedSource?.sourceNumber}:{" "}
              {selectedSource?.documentId
                ? selectedSource.documentId.split("/").pop()
                : "Direct Reference"}
            </h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidePanelOpen(false)}
              className="rounded-full hover:bg-muted text-xl font-light"
            >
              ×
            </Button>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                  Source Excerpt
                </h4>
                <div className="relative group">
                  <div className="absolute -left-4 top-0 bottom-0 w-1 bg-primary/20 rounded-full group-hover:bg-primary/40 transition-colors" />
                  <div className="p-6 bg-muted/30 rounded-2xl border border-border/50 backdrop-blur-sm">
                    <p className="text-sm leading-relaxed text-foreground italic whitespace-pre-wrap">
                      &quot;{selectedSource?.text}&quot;
                    </p>
                  </div>
                </div>
              </div>

              {selectedSource?.metadata?.page && (
                <div className="flex items-center gap-4 py-4 border-t border-dashed">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground/60 block mb-1">
                      Document Information
                    </span>
                    <div className="flex gap-2">
                      <div className="px-3 py-1 bg-secondary rounded-full text-[10px] font-semibold border border-border">
                        Page {selectedSource.metadata.page}
                      </div>
                      <div className="px-3 py-1 bg-secondary rounded-full text-[10px] font-semibold border border-border">
                        Score: {(selectedSource.score * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-6 bg-muted/10 border-t mt-auto">
            <p className="text-[10px] text-muted-foreground/50 text-center uppercase tracking-[0.2em] font-medium">
              Reference Information • Knowledge Assistant Retrieval Engine
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
