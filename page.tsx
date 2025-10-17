
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { getAiSuggestion, getAiGuide, getFinjoBuddyResponse, getNews as getNewsAction, generateImage as generateImageAction } from "./actions";
import { summarizeJobDescription } from "@/ai/flows/summarize-job-description";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Lightbulb, Send, MessageSquare, Plus, BrainCircuit, Paperclip, Compass, Briefcase, GraduationCap, Code, Globe, Sparkles, Newspaper, RefreshCw, Image as ImageIcon, Download } from "lucide-react";
import { FinjoLogo } from "@/components/finjo-logo";
import { cn } from "@/lib/utils";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { NewsArticle } from "@/ai/flows/get-news";

interface Message {
  role: 'user' | 'model';
  content: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  type: 'chat' | 'buddy';
}

type GuideTopic = "INTERVIEW_PREP" | "INTERNSHIP_HUNT" | "LEARNING_PATH";
type View = 'chat' | 'guide' | 'buddy_intro' | 'news' | 'image_gen';

export default function Home() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [fileForUpload, setFileForUpload] = useState<File | null>(null);
  const [filePrompt, setFilePrompt] = useState("");
  const { toast } = useToast();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeView, setActiveView] = useState<View>('chat');
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [isFetchingNews, setIsFetchingNews] = useState(false);
  const [imagePrompt, setImagePrompt] = useState("");
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [lastImagePrompt, setLastImagePrompt] = useState("");

  useEffect(() => {
    const storedSessions = localStorage.getItem("chatSessions");
    if (storedSessions) {
      const parsedSessions = JSON.parse(storedSessions);
      setSessions(parsedSessions);
      if (parsedSessions.length > 0) {
        setActiveSessionId(parsedSessions[0].id);
        setActiveView('chat');
      } else {
        createNewSession('chat');
      }
    } else {
      createNewSession('chat');
    }
  }, []);

  const getNews = async () => {
    setIsFetchingNews(true);
    try {
      const newsResults = await getNewsAction(['latest tech news', 'latest job market trends', 'civil service exam news']);
      setNews(newsResults);
    } catch (error) {
      console.error("Failed to fetch news", error);
      toast({
        title: "An error occurred",
        description: "Could not fetch the latest news.",
        variant: "destructive",
      });
    } finally {
      setIsFetchingNews(false);
    }
  };
  
  const handleImageGeneration = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!imagePrompt) return;

    setIsGeneratingImage(true);
    setGeneratedImage(null);
    setLastImagePrompt(imagePrompt);
    try {
      const imageUrl = await generateImageAction(imagePrompt);
      setGeneratedImage(imageUrl);
    } catch (error) {
      toast({
        title: "An error occurred",
        description: "Could not generate the image.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingImage(false);
    }
  };

  useEffect(() => {
    if (activeView === 'news' && news.length === 0) {
      getNews();
    }
  }, [activeView]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [sessions, activeSessionId, isLoading]);

  const activeSession = useMemo(() => {
    return sessions.find(session => session.id === activeSessionId) || null;
  }, [sessions, activeSessionId]);

  const updateSessions = (newSessions: Session[], newActiveId?: string) => {
    setSessions(newSessions);
    localStorage.setItem("chatSessions", JSON.stringify(newSessions));
    if (newActiveId) {
      setActiveSessionId(newActiveId);
    }
  }

  const createNewSession = (type: 'chat' | 'buddy') => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: type === 'buddy' ? "Finjo Buddy" : "New Chat",
      messages: [],
      type: type,
    };
    const updatedSessions = [newSession, ...sessions];
    updateSessions(updatedSessions, newSession.id);
    setActiveView('chat');
  };

  const handleFilePromptSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!fileForUpload) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        const content = e.target?.result as string;
        if (!content) return;

        const userMessageContent = `File: ${fileForUpload.name}\nPrompt: ${filePrompt}`;
        const userMessage: Message = { role: 'user', content: userMessageContent };
        const newMessages = [...(activeSession?.messages || []), userMessage];
        
        let updatedSession = { ...activeSession!, messages: newMessages };
        if (activeSession!.messages.length === 0) {
            updatedSession.title = filePrompt || `Summary of ${fileForUpload.name}`;
        }
        
        const newSessions = sessions.map(session => session.id === activeSessionId ? updatedSession : session);
        updateSessions(newSessions);
        setIsLoading(true);
        setFileForUpload(null);
        setFilePrompt("");

        try {
            const { summary } = await summarizeJobDescription({
              jobDescription: content,
              prompt: filePrompt || 'Summarize the following document.'
            });
            const modelMessage: Message = { role: 'model', content: summary };
            
            const finalUpdatedSession = { ...updatedSession, messages: [...newMessages, modelMessage] };
            const finalSessions = sessions.map(session => session.id === activeSessionId ? finalUpdatedSession : session);
            updateSessions(finalSessions);
        } catch (error: any) {
            toast({
                title: "An error occurred",
                description: "Could not process the document.",
                variant: "destructive",
            });
            const revertedSessions = sessions.map(s => s.id === activeSessionId ? { ...s, messages: activeSession!.messages } : s);
            updateSessions(revertedSessions);
        } finally {
            setIsLoading(false);
        }
    };

    if (fileForUpload.type.startsWith('image/')) {
        reader.readAsDataURL(fileForUpload);
    } else {
        reader.readAsText(fileForUpload);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileForUpload(file);
      setFilePrompt(`Summarize this document: ${file.name}`);
    }
    // Clear the input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || !activeSession) return;

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...activeSession.messages, userMessage];
    
    let updatedSession = { ...activeSession, messages: newMessages };
    
    if (activeSession.messages.length === 0 && activeSession.type === 'chat') {
      updatedSession.title = input.length > 30 ? input.substring(0, 27) + '...' : input;
    }

    const newSessions = sessions.map(session => session.id === activeSessionId ? updatedSession : session);
    updateSessions(newSessions);

    const currentInput = input;
    setInput("");
    setIsLoading(true);

    try {
      let suggestionText: string;
      if (activeSession.type === 'buddy') {
        suggestionText = await getFinjoBuddyResponse(currentInput, newMessages.slice(0, -1));
      } else {
        suggestionText = await getAiSuggestion(currentInput, newMessages.slice(0, -1));
      }

      const modelMessage: Message = { role: 'model', content: suggestionText };
      
      const finalUpdatedSession = { ...updatedSession, messages: [...newMessages, modelMessage] };
      const finalSessions = sessions.map(session => session.id === activeSessionId ? finalUpdatedSession : session);
      updateSessions(finalSessions);

    } catch (error: any) {
      toast({
        title: "An error occurred",
        description: error.message,
        variant: "destructive",
      });
      const revertedSessions = sessions.map(s => s.id === activeSessionId ? { ...s, messages: activeSession.messages } : s);
      updateSessions(revertedSessions);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuideSelect = async (topic: GuideTopic, title: string) => {
    setActiveView('chat');
    createNewSession('chat'); // This will create a new session and set it as active.
    
    // We need to ensure the new session is created and state is updated before proceeding.
    // The state updates are async, so let's use a timeout to wait for the state to be updated.
    setTimeout(async () => {
      setIsLoading(true);
      try {
        const result = await getAiGuide(topic);

        const modelMessage: Message = { role: 'model', content: result };
        
        setSessions(prevSessions => {
          const newActiveSessionId = prevSessions[0].id;
          const updatedSession = { ...prevSessions[0], title: title, messages: [modelMessage] };
          const newSessions = [updatedSession, ...prevSessions.slice(1)];
          localStorage.setItem("chatSessions", JSON.stringify(newSessions));
          return newSessions;
        });

      } catch(error: any) {
        toast({
          title: "An error occurred",
          description: "Could not load the guide.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }, 100);
  };
  
  const GuideCard = ({ icon, title, description, onClick }: { icon: React.ElementType, title: string, description: string, onClick: () => void }) => {
    const Icon = icon;
    return (
      <button onClick={onClick} className="text-left p-4 rounded-lg bg-secondary/60 hover:bg-secondary/80 transition-all duration-300 transform hover:scale-105 shadow-lg w-full max-w-sm">
        <div className="flex items-center gap-4">
          <Icon className="w-8 h-8 text-primary" />
          <div>
            <h3 className="font-bold text-white text-lg">{title}</h3>
            <p className="text-muted-foreground text-sm">{description}</p>
          </div>
        </div>
      </button>
    );
  };

  const renderContent = () => {
    if (activeView === 'image_gen') {
      return (
          <div className="text-muted-foreground max-w-2xl mx-auto space-y-6 w-full text-center">
              <div className="flex justify-center items-center gap-3 mb-6">
                  <ImageIcon className="inline-block h-10 w-10 text-primary" />
                  <h2 className="text-3xl font-headline text-white">Image Generation</h2>
              </div>
              <p className="text-lg">Enter a prompt to generate an image with AI.</p>
              <form onSubmit={handleImageGeneration} className="flex flex-col items-center gap-4 pt-4">
                  <Textarea
                      value={imagePrompt}
                      onChange={(e) => setImagePrompt(e.target.value)}
                      placeholder="e.g., 'A futuristic city with flying cars, photorealistic'"
                      className="w-full text-base p-4 bg-background/70 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                      rows={3}
                  />
                  <Button type="submit" size="lg" disabled={isGeneratingImage || !imagePrompt.trim()}>
                      {isGeneratingImage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                      Generate Image
                  </Button>
              </form>
              {isGeneratingImage && (
                  <div className="pt-8">
                      <p className="mb-4">Generating your image... this may take a moment.</p>
                      <Skeleton className="w-full aspect-square rounded-lg" />
                  </div>
              )}
              {generatedImage && (
                  <div className="pt-8 space-y-4">
                      <h3 className="text-xl font-headline text-white">Your Generated Image:</h3>
                      <p className="text-muted-foreground text-sm italic">"{lastImagePrompt}"</p>
                      <div className="relative aspect-square w-full">
                          <Image src={generatedImage} alt={lastImagePrompt} layout="fill" objectFit="contain" className="rounded-lg shadow-lg" />
                      </div>
                      <Button asChild>
                          <a href={generatedImage} download={`finjo-image-${Date.now()}.png`}>
                              <Download className="mr-2 h-4 w-4"/>
                              Download Image
                          </a>
                      </Button>
                  </div>
              )}
          </div>
      );
    }
    if (activeView === 'news') {
      return (
        <div className="text-muted-foreground max-w-4xl mx-auto space-y-6 w-full">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                    <Newspaper className="inline-block h-10 w-10 text-primary" />
                    <h2 className="text-3xl font-headline text-white">Latest News</h2>
                </div>
                <Button onClick={getNews} disabled={isFetchingNews} variant="outline">
                    <RefreshCw className={cn("mr-2 h-4 w-4", { "animate-spin": isFetchingNews })} />
                    Refresh
                </Button>
            </div>
            {isFetchingNews && news.length === 0 ? (
                <div className="space-y-4">
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                    <Skeleton className="h-24 w-full" />
                </div>
            ) : (
                <div className="space-y-4">
                    {news.map((item, index) => (
                        <a
                            key={index}
                            href={item.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block p-4 rounded-lg bg-secondary/60 hover:bg-secondary/80 transition-all duration-300 shadow-lg"
                        >
                            <h3 className="font-bold text-white text-lg mb-1">{item.title}</h3>
                            <p className="text-muted-foreground text-sm">{item.snippet}</p>
                            <p className="text-xs text-primary mt-2">{new URL(item.link).hostname}</p>
                        </a>
                    ))}
                </div>
            )}
        </div>
      );
    }
    if (activeView === 'guide') {
      return (
        <div className="text-center text-muted-foreground max-w-2xl mx-auto space-y-6">
          <Compass className="inline-block h-12 w-12 mb-4 text-primary" />
          <h2 className="text-3xl font-headline text-white mb-2">Welcome to Finjo Guide</h2>
          <p className="text-lg">Select a topic below to get started with step-by-step guidance from your AI career coach.</p>
          <div className="grid grid-cols-1 gap-4 pt-4">
              <GuideCard
                  icon={Briefcase}
                  title="Interview Prep"
                  description="Ace your next interview with tailored advice and practice."
                  onClick={() => handleGuideSelect("INTERVIEW_PREP", "Interview Prep Guide")}
              />
              <GuideCard
                  icon={GraduationCap}
                  title="Internship Hunt"
                  description="Find and secure the perfect internship for your career goals."
                  onClick={() => handleGuideSelect("INTERNSHIP_HUNT", "Internship Hunt Guide")}
              />
              <GuideCard
                  icon={Code}
                  title="Learning Path"
                  description="Create a personalized learning plan to gain new skills."
                  onClick={() => handleGuideSelect("LEARNING_PATH", "Learning Path Guide")}
              />
          </div>
        </div>
      );
    }
    
    if (activeView === 'buddy_intro') {
      return (
        <div className="text-center text-muted-foreground max-w-2xl mx-auto space-y-6">
          <Sparkles className="inline-block h-12 w-12 mb-4 text-primary" />
          <h2 className="text-3xl font-headline text-white mb-2">Meet Your Finjo Buddy</h2>
          <p className="text-lg">Your AI friend is here to listen, support, and motivate you. Start a conversation whenever you need a friendly ear.</p>
          <Button size="lg" className="mt-4" onClick={() => createNewSession('buddy')}>Start Chatting</Button>
        </div>
      )
    }

    if (!activeSession || activeSession.messages.length === 0 && !isLoading) {
      return (
        <div className="text-center text-muted-foreground max-w-md mx-auto">
          <div className="flex justify-center items-center gap-4">
            <Lightbulb className="inline-block h-10 w-10 mb-4 text-primary" />
            <Globe className="inline-block h-10 w-10 mb-4 text-primary" />
          </div>
          <h2 className="text-2xl font-headline text-white mb-2">Welcome to Finjo</h2>
          <p>Start a conversation, ask for real-time info, or upload a document to get a summary.</p>
        </div>
      )
    }

    return (
      <>
        {activeSession?.messages.map((message, index) => (
          <div
            key={index}
            className={`flex gap-4 ${
              message.role === 'user' ? 'justify-end' : ''
            }`}
          >
            {message.role === 'model' && <FinjoLogo className="w-8 h-8 p-1.5 flex-shrink-0"/>}
            <div
              className={cn("rounded-xl p-4 max-w-[80%] whitespace-pre-wrap shadow-lg", {
                  'bg-primary/80 text-primary-foreground backdrop-blur-sm': message.role === 'user',
                  'bg-secondary/60 text-secondary-foreground backdrop-blur-sm': message.role === 'model'
              })}
            >
              {message.role === 'model' ? (
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                  className="prose prose-invert max-w-none"
                  components={{
                    a: ({node, ...props}) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline" />,
                    ul: ({node, ...props}) => <ul {...props} className="list-disc pl-5" />,
                    ol: ({node, ...props}) => <ol {...props} className="list-decimal pl-5" />,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              ) : (
                message.content
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex items-start gap-4">
            <FinjoLogo className="w-8 h-8 p-1.5 flex-shrink-0"/>
            <div className="rounded-xl p-4 bg-muted/50 space-y-2 shadow-lg w-full max-w-md">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <main className="flex h-screen bg-background text-foreground font-body">
      <aside className="w-80 flex flex-col bg-muted/20 border-r border-white/5">
        <header className="flex items-center gap-4 p-4 border-b border-white/5">
           <FinjoLogo className="w-10 h-10 p-2" />
          <div>
            <h1 className="text-xl font-headline font-bold text-white tracking-tight">
              finjo
            </h1>
          </div>
        </header>
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <Button variant="outline" className="w-full justify-start gap-2 text-base py-6 border-primary/50 hover:bg-primary/10 hover:text-primary" onClick={() => createNewSession('chat')}>
            <Plus className="w-5 h-5"/> New Chat
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 text-base py-6 border-accent-foreground/20 hover:bg-accent/10 hover:text-accent-foreground" onClick={() => setActiveView('guide')}>
            <Compass className="w-5 h-5"/> Finjo Guide
          </Button>
           <Button variant="outline" className="w-full justify-start gap-2 text-base py-6 border-accent-foreground/20 hover:bg-accent/10 hover:text-accent-foreground" onClick={() => setActiveView('news')}>
            <Newspaper className="w-5 h-5"/> News
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 text-base py-6 border-accent-foreground/20 hover:bg-accent/10 hover:text-accent-foreground" onClick={() => setActiveView('image_gen')}>
            <ImageIcon className="w-5 h-5"/> Image Generation
          </Button>
          <Button variant="outline" className="w-full justify-start gap-2 text-base py-6 border-accent-foreground/20 hover:bg-accent/10 hover:text-accent-foreground" onClick={() => setActiveView('buddy_intro')}>
            <Sparkles className="w-5 h-5"/> Finjo Buddy
          </Button>
          <div className="space-y-2">
            <h2 className="px-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider">History</h2>
            <div className="flex flex-col gap-1">
            {sessions.map(session => (
              <Button
                key={session.id}
                variant={activeSessionId === session.id ? 'secondary' : 'ghost'}
                className="w-full justify-start gap-3 truncate text-base py-5"
                onClick={() => {
                  setActiveSessionId(session.id);
                  setActiveView('chat');
                }}
              >
                {session.type === 'buddy' ? <Sparkles className="w-4 h-4"/> : <MessageSquare className="w-4 h-4"/>}
                <span className="truncate">{session.title}</span>
              </Button>
            ))}
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-white/5">
            <p className="text-sm text-muted-foreground">
              Your AI-powered career coach
            </p>
        </div>
      </aside>

      <div className="flex flex-col w-full h-full bg-cover bg-center" style={{backgroundImage: "url('https://picsum.photos/seed/moon/1920/1080')"}} data-ai-hint="moon">
        <div ref={chatContainerRef} className={cn("flex-1 overflow-y-auto p-6 space-y-8 bg-black/50", { "flex items-center justify-center": activeView !== 'chat' || !activeSession || activeSession.messages.length === 0 })}>
          {renderContent()}
        </div>

        {activeView === 'chat' && <div className="p-4 border-t border-white/5 w-full max-w-4xl mx-auto bg-transparent">
          <form onSubmit={handleSubmit} className="flex items-center gap-4">
            <div className="relative flex-1">
              <BrainCircuit className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={activeSession?.type === 'buddy' ? "Talk to your buddy..." : "Ask for career advice or real-time info..."}
                className="flex-1 text-base pl-10 pr-12 py-6 bg-background/70 border-0 focus-visible:ring-1 focus-visible:ring-primary"
                disabled={isLoading || !activeSession}
              />
              {activeSession?.type === 'chat' && <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || !activeSession}
              >
                <Paperclip className="w-5 h-5" />
              </Button>}
              <input
                type="file"
                ref={fileInputRef}
                onChange={onFileChange}
                className="hidden"
                accept="image/*,text/plain,.pdf,.doc,.docx,.ppt,.pptx"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              className="bg-primary hover:bg-primary/90 h-12 w-12 rounded-full shadow-lg shadow-primary/30"
              disabled={isLoading || !input.trim() || !activeSession}
            >
              {isLoading && !fileForUpload ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Send className="h-6 w-6" />
              )}
            </Button>
          </form>
        </div>}
      </div>
      
      <Dialog open={!!fileForUpload} onOpenChange={(open) => !open && setFileForUpload(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What should I do with this file?</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleFilePromptSubmit} className="space-y-4">
            <Textarea
              value={filePrompt}
              onChange={(e) => setFilePrompt(e.target.value)}
              placeholder="e.g., 'Summarize this document', 'Extract key skills from this resume'"
              className="min-h-[100px]"
            />
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setFileForUpload(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </main>
  );
}

    