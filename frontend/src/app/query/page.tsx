'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import api from '@/lib/api';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface Source {
  documentId: string;
  chunkId: string;
  score: number;
  text: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sources?: Source[];
}

export default function QueryPage() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
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
    setQuery('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      // 1. First fetch metadata/sources using standard POST (to get rich info)
      const res = await api.post('/query', { query: userMessage });
      const { answer, sources } = res.data;

      // 2. Then update state with sources
      setMessages((prev) => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = answer;
        newMessages[newMessages.length - 1].sources = sources;
        return newMessages;
      });
      setIsLoading(false);

      // Note: In a real production app, we would use SSE for tokens 
      // AND metadata. For now, I'm switching to the POST endpoint 
      // implemented in the backend to ensure we get the citations correctly.
    } catch (error) {
      console.error('Failed to query', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 h-[calc(100vh-80px)] flex flex-col max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center text-primary">EcoReady Assistant</h1>
      
      <Card className="flex-1 min-h-0 overflow-hidden flex flex-col mb-4 border-2 shadow-lg bg-background/50 backdrop-blur-sm">
        <ScrollArea className="flex-1 min-h-0" ref={scrollRef}>
          <div className="p-6 space-y-8 flex flex-col min-h-min">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col gap-2 ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                <div 
                  className={`flex gap-4 max-w-[85%] md:max-w-[75%] shadow-sm ${
                    msg.role === 'assistant' 
                      ? 'bg-muted/80 p-4 rounded-2xl rounded-tl-none border border-border' 
                      : 'bg-primary text-primary-foreground p-4 rounded-2xl rounded-tr-none'
                  }`}
                >
                  <div className="mt-1 flex-shrink-0">
                    {msg.role === 'assistant' ? <Bot className="h-5 w-5" /> : <User className="h-5 w-5" />}
                  </div>
                  <div className="flex-1 prose prose-sm dark:prose-invert break-words overflow-hidden">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="w-full mt-2 pl-12 max-w-[85%] md:max-w-[75%]">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="sources" className="border-none">
                        <AccordionTrigger className="text-[10px] text-muted-foreground hover:no-underline py-0 opacity-70 hover:opacity-100 transition-opacity">
                          View {msg.sources.length} sources
                        </AccordionTrigger>
                        <AccordionContent className="pt-3">
                          <div className="grid gap-3">
                            {msg.sources.map((source, sIdx) => (
                              <div key={sIdx} className="text-[10px] p-3 bg-muted/30 border border-border/50 rounded-xl">
                                <div className="flex justify-between font-bold mb-1 text-primary/60 uppercase tracking-widest">
                                  <span>Source {sIdx + 1}</span>
                                  <span>Score: {source.score.toFixed(2)}</span>
                                </div>
                                <p className="italic line-clamp-3 text-muted-foreground/80">{source.text}</p>
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                )}
              </div>
            ))}
            {isLoading && messages[messages.length - 1].content === '' && (
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
        <form onSubmit={handleSubmit} className="flex gap-2 p-1 bg-background border-2 rounded-full shadow-lg transition-all focus-within:border-primary/50">
          <Input
            placeholder="Ask anything about your documents..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isLoading}
            className="flex-1 h-12 border-none bg-transparent focus-visible:ring-0 text-base px-6"
          />
          <Button type="submit" disabled={isLoading || !query.trim()} className="h-10 w-10 rounded-full my-auto mr-1 p-0 flex items-center justify-center">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </div>
  );
}
