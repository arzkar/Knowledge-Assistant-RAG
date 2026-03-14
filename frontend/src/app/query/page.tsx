'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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

    let assistantMessage = '';
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
      
      <Card className="flex-1 overflow-hidden flex flex-col mb-4 border-2 shadow-lg">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-8">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col gap-2 ${msg.role === 'assistant' ? 'items-start' : 'items-end'}`}>
                <div className={`flex gap-4 max-w-[90%] ${msg.role === 'assistant' ? 'bg-muted/50 p-4 rounded-2xl rounded-tl-none' : 'bg-primary text-primary-foreground p-4 rounded-2xl rounded-tr-none'}`}>
                  <div className="mt-1 flex-shrink-0">
                    {msg.role === 'assistant' ? <Bot className="h-6 w-6" /> : <User className="h-6 w-6" />}
                  </div>
                  <div className="flex-1 prose prose-sm dark:prose-invert">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                </div>
                
                {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                  <div className="w-full mt-4 pl-10">
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="sources" className="border-none">
                        <AccordionTrigger className="text-xs text-muted-foreground hover:no-underline py-0">
                          View {msg.sources.length} Sources
                        </AccordionTrigger>
                        <AccordionContent className="pt-4">
                          <div className="grid gap-4">
                            {msg.sources.map((source, sIdx) => (
                              <div key={sIdx} className="text-xs p-3 bg-background border rounded-lg shadow-sm">
                                <div className="flex justify-between font-bold mb-1 text-primary/80 uppercase tracking-widest text-[10px]">
                                  <span>Source {sIdx + 1}</span>
                                  <span>Score: {source.score.toFixed(2)}</span>
                                </div>
                                <p className="italic line-clamp-3 text-muted-foreground">{source.text}</p>
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
              <div className="flex gap-4 items-center">
                <Bot className="h-6 w-6 text-primary animate-bounce" />
                <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyzing documents...
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          placeholder="Ask anything about your documents..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={isLoading}
          className="flex-1 h-12 text-base shadow-sm"
        />
        <Button type="submit" disabled={isLoading} className="h-12 w-12 rounded-full">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </form>
    </div>
  );
}
