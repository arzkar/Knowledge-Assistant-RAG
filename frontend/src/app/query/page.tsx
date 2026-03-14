'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, Bot, User } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
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
      const eventSource = new EventSource(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/query/stream?q=${encodeURIComponent(userMessage)}`,
        { withCredentials: true }
      );

      eventSource.onmessage = (event) => {
        assistantMessage += event.data;
        setMessages((prev) => {
          const newMessages = [...prev];
          newMessages[newMessages.length - 1].content = assistantMessage;
          return newMessages;
        });
      };

      eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        eventSource.close();
        setIsLoading(false);
      };

      // Since standard SSE doesn't have a "close" event from server easily, 
      // we'd normally have a special message or just wait for timeout/close.
      // For this prototype, we'll assume completion when connection closes or logic finishes.
    } catch (error) {
      console.error('Failed to start stream', error);
      setIsLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 h-[calc(100-80px)] flex flex-col max-w-4xl">
      <h1 className="text-3xl font-bold mb-8 text-center">Knowledge Assistant</h1>
      
      <Card className="flex-1 overflow-hidden flex flex-col mb-4">
        <ScrollArea className="flex-1 p-6" ref={scrollRef}>
          <div className="space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-4 ${msg.role === 'assistant' ? 'bg-muted/50 p-4 rounded-lg' : ''}`}>
                <div className="mt-1">
                  {msg.role === 'assistant' ? <Bot className="h-6 w-6 text-primary" /> : <User className="h-6 w-6 text-muted-foreground" />}
                </div>
                <div className="flex-1 prose prose-sm dark:prose-invert">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {isLoading && messages[messages.length - 1].content === '' && (
              <div className="flex gap-4">
                <Bot className="h-6 w-6 text-primary animate-pulse" />
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Thinking...
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
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}
