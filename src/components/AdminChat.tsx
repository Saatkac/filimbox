import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Send, Bot, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Message = { 
  role: 'user' | 'assistant'; 
  content: string;
  imageUrl?: string;
};

const AI_MODELS = [
  { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash (Varsayılan)', description: 'Hızlı ve dengeli', type: 'text' },
  { id: 'google/gemini-2.5-pro', name: 'Gemini 2.5 Pro', description: 'En güçlü Gemini', type: 'text' },
  { id: 'google/gemini-3-pro-preview', name: 'Gemini 3 Pro Preview', description: 'Yeni nesil Gemini', type: 'text' },
  { id: 'google/gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', description: 'En hızlı ve ucuz', type: 'text' },
  { id: 'google/gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image', description: 'Görsel oluşturma', type: 'image' },
  { id: 'google/gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image', description: 'Yeni nesil görsel', type: 'image' },
  { id: 'openai/gpt-5', name: 'GPT-5', description: 'OpenAI en güçlü', type: 'text' },
  { id: 'openai/gpt-5-mini', name: 'GPT-5 Mini', description: 'Maliyet-performans dengesi', type: 'text' },
  { id: 'openai/gpt-5-nano', name: 'GPT-5 Nano', description: 'Hız ve maliyet tasarrufu', type: 'text' },
] as const;

export default function AdminChat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('google/gemini-2.5-flash');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const streamChat = async (userMessage: string) => {
    const newMessages = [...messages, { role: 'user' as const, content: userMessage }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-chat`;
      
      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ messages: newMessages, model: selectedModel }),
      });

      if (resp.status === 429) {
        toast({ variant: 'destructive', title: 'Rate limit aşıldı', description: 'Lütfen biraz bekleyin.' });
        setIsLoading(false);
        return;
      }

      if (resp.status === 402) {
        toast({ variant: 'destructive', title: 'Kredi gerekli', description: 'Lovable AI hesabınıza kredi eklemelisiniz.' });
        setIsLoading(false);
        return;
      }

      if (!resp.ok) {
        throw new Error('İstek başarısız');
      }

      // Check if it's an image model (non-streaming response)
      const isImageModel = selectedModel.includes('image');
      
      if (isImageModel) {
        const data = await resp.json();
        const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
        const content = data.choices?.[0]?.message?.content || 'Görsel oluşturuldu.';
        
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content, 
          imageUrl 
        }]);
        setIsLoading(false);
        return;
      }

      // Handle streaming for text models
      if (!resp.body) {
        throw new Error('Stream başlatılamadı');
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = '';
      let streamDone = false;
      let assistantContent = '';
      let imageUrl = '';

      // Add empty assistant message
      setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            const images = parsed.choices?.[0]?.message?.images;
            
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent, imageUrl };
                return updated;
              });
            }
            
            if (images && images.length > 0) {
              imageUrl = images[0]?.image_url?.url || '';
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent, imageUrl };
                return updated;
              });
            }
          } catch {
            textBuffer = line + '\n' + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (raw.startsWith(':') || raw.trim() === '') continue;
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            const images = parsed.choices?.[0]?.message?.images;
            
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent, imageUrl };
                return updated;
              });
            }
            
            if (images && images.length > 0) {
              imageUrl = images[0]?.image_url?.url || '';
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: assistantContent, imageUrl };
                return updated;
              });
            }
          } catch { /* ignore */ }
        }
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Chat error:', error);
      toast({ variant: 'destructive', title: 'Hata', description: 'Mesaj gönderilemedi' });
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    streamChat(input);
    setInput('');
  };

  return (
    <Card className="bg-card border-border h-[600px] flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-gold" />
            AI Asistan
          </CardTitle>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-[240px] bg-secondary">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {AI_MODELS.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-muted-foreground">{model.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col gap-4 p-0">
        <ScrollArea ref={scrollRef} className="flex-1 px-6">
          <div className="space-y-4 pb-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                Merhaba! Size nasıl yardımcı olabilirim?
              </div>
            )}
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-gold" />
                  </div>
                )}
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-gold text-black'
                      : 'bg-secondary text-foreground'
                  }`}
                >
                  {msg.imageUrl && (
                    <img 
                      src={msg.imageUrl} 
                      alt="Generated" 
                      className="rounded-lg mb-2 max-w-full h-auto"
                    />
                  )}
                  {msg.content && <p className="whitespace-pre-wrap text-sm">{msg.content}</p>}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gold flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-black" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3 justify-start">
                <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-gold" />
                </div>
                <div className="rounded-lg px-4 py-2 bg-secondary">
                  <Loader2 className="w-4 h-4 animate-spin text-gold" />
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
        <form onSubmit={handleSubmit} className="px-6 pb-6 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Mesajınızı yazın..."
            disabled={isLoading}
            className="bg-secondary"
          />
          <Button type="submit" disabled={isLoading || !input.trim()} className="bg-gold hover:bg-gold-light text-black">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
