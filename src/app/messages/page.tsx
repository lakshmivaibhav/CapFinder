"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, limit, and, or, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { Theme } from 'emoji-picker-react';
import { 
  MessageSquare, 
  Send, 
  User, 
  Loader2, 
  ArrowLeft, 
  Inbox, 
  ShieldCheck,
  Building,
  Zap,
  Smile
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * @fileOverview Secure Messaging Hub.
 * Optimized for real-time synchronization and high-density professional dialogue.
 */
export default function MessagesPage() {
  const { user, profile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [selectedPitchId, setSelectedPitchId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Verification of tactical alignment
  console.log("Selected Pitch:", selectedPitchId);

  useEffect(() => {
    if (!authLoading) {
      if (!user) router.push('/login');
      else if (!emailVerified) router.push('/verify-email');
    }
  }, [user, authLoading, emailVerified, router]);

  // Fetch approved connections (contactRequests)
  const connectionsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, 'contactRequests'),
      and(
        or(where('senderId', '==', user.uid), where('receiverId', '==', user.uid)),
        where('status', '==', 'accepted')
      ),
      limit(50)
    );
  }, [db, user]);

  const { data: connections, isLoading: loadingConnections } = useCollection(connectionsQuery);

  // Derive the active connection context
  const activeConnection = useMemo(() => 
    connections?.find(c => c.id === selectedConnectionId), 
    [connections, selectedConnectionId]
  );

  const partnerId = useMemo(() => {
    if (!user || !activeConnection) return null;
    return user.uid === activeConnection.senderId ? activeConnection.receiverId : activeConnection.senderId;
  }, [user, activeConnection]);

  /**
   * Pitch-based query.
   * Optimized for localized dialogue retrieval.
   */
  const messagesQuery = useMemoFirebase(() => {
    if (!selectedPitchId) return null;
    return query(
      collection(db, 'messages'),
      where('pitchId', '==', selectedPitchId),
      orderBy('timestamp', 'asc'),
      limit(500)
    );
  }, [db, selectedPitchId]);

  /**
   * Manual Real-time Listener.
   * Ensures high-fidelity state synchronization directly from Firestore snapshots.
   */
  useEffect(() => {
    if (!messagesQuery || !selectedPitchId) {
      setMessages([]);
      setLoadingMessages(false);
      return;
    }

    setLoadingMessages(true);
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(msgs);
      setLoadingMessages(false);
    }, (error) => {
      console.error("Dialogue synchronization error:", error);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [messagesQuery, selectedPitchId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const partnerName = activeConnection 
    ? (user?.uid === activeConnection.senderId ? activeConnection.startupName : activeConnection.investorEmail)
    : 'Select Contact';

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !partnerId || !selectedPitchId || !messageText.trim()) return;

    // Persist strategic message using standardized schema
    addDocumentNonBlocking(collection(db, 'messages'), {
      pitchId: selectedPitchId,
      senderId: user.uid,
      receiverId: partnerId,
      text: messageText.trim(),
      timestamp: serverTimestamp(),
      read: false
    });

    setMessageText('');
  };

  if (authLoading || (user && !emailVerified)) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      <Navbar />

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Verified Connections */}
        <aside className={cn(
          "w-full md:w-96 border-r bg-white flex flex-col transition-all duration-300",
          selectedConnectionId && "hidden md:flex"
        )}>
          <div className="p-6 border-b bg-muted/10">
            <h2 className="text-xl font-black tracking-tight flex items-center gap-3">
              <Inbox className="w-5 h-5 text-primary" />
              Secure Hub
            </h2>
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Verified Venture Partners</p>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-4 space-y-2">
              {loadingConnections ? (
                <div className="p-8 text-center"><Loader2 className="animate-spin mx-auto opacity-20" /></div>
              ) : connections && connections.length > 0 ? (
                connections.map((conn) => {
                  const isUserInvestor = user?.uid === conn.senderId;
                  const displayName = isUserInvestor ? conn.startupName : conn.investorEmail;
                  const role = isUserInvestor ? 'Venture' : 'Capital Partner';

                  return (
                    <button
                      key={conn.id}
                      onClick={() => {
                        setSelectedConnectionId(conn.id);
                        setSelectedPitchId(conn.pitchId);
                      }}
                      className={cn(
                        "w-full p-4 rounded-2xl flex items-center gap-4 transition-all text-left group",
                        selectedConnectionId === conn.id 
                          ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" 
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-110",
                        selectedConnectionId === conn.id ? "bg-white/20" : "bg-muted"
                      )}>
                        {isUserInvestor ? <Building className="w-6 h-6" /> : <User className="w-6 h-6" />}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-black text-sm truncate leading-none mb-1">{displayName}</p>
                        <p className={cn(
                          "text-[9px] font-black uppercase tracking-widest",
                          selectedConnectionId === conn.id ? "text-white/60" : "text-muted-foreground"
                        )}>{role}</p>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="text-center py-20 px-6 space-y-4">
                  <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto opacity-20">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest text-muted-foreground italic">No active inquiries</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Chat Interface */}
        <section className={cn(
          "flex-1 flex flex-col bg-[#f8fafc] relative",
          !selectedConnectionId && "hidden md:flex"
        )}>
          {selectedConnectionId ? (
            <>
              {/* Header */}
              <header className="h-24 border-b bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden rounded-xl" 
                    onClick={() => {
                      setSelectedConnectionId(null);
                      setSelectedPitchId(null);
                    }}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  
                  {/* Identity Avatar */}
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-primary/5 flex items-center justify-center border-2 border-primary/10 overflow-hidden shrink-0 shadow-inner">
                      <User className="w-6 h-6 text-primary opacity-40" />
                    </div>
                    {/* Active Status Indicator */}
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-sm" />
                  </div>

                  <div className="space-y-0.5">
                    <h3 className="font-black text-lg tracking-tight leading-none text-foreground">{partnerName}</h3>
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-[10px] font-black uppercase tracking-[0.1em] text-emerald-600">Online & Authenticated</p>
                    </div>
                  </div>
                </div>
                
                <div className="hidden sm:block">
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 rounded-lg px-4 py-1.5 font-black text-[9px] uppercase tracking-[0.2em] shadow-sm">
                    <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Identity Verified
                  </Badge>
                </div>
              </header>

              {/* Dialogue Stream */}
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-4xl mx-auto space-y-1">
                  {loadingMessages ? (
                    <div className="flex justify-center p-20">
                      <Loader2 className="animate-spin opacity-20" />
                    </div>
                  ) : messages && messages.length > 0 ? (
                    messages.map((msg) => {
                      const isMe = msg.senderId === user?.uid;
                      return (
                        <div key={msg.id} className={cn("flex", isMe ? "justify-end" : "justify-start")}>
                          <div className={cn(
                            "max-w-[60%] p-3 px-4 rounded-2xl shadow-sm relative group transition-all",
                            isMe 
                              ? "bg-primary text-white" 
                              : "bg-white text-foreground border border-muted"
                          )}>
                            <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                            <p className={cn(
                              "text-[8px] font-black uppercase tracking-widest mt-1 opacity-40",
                              isMe ? "text-right" : "text-left"
                            )}>
                              {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : 'Syncing...'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 flex flex-col items-center gap-4 opacity-30">
                      <Zap className="w-10 h-10 text-primary" />
                      <p className="italic font-black text-sm uppercase tracking-widest">Initiate secure dialogue.</p>
                    </div>
                  )}
                  <div ref={scrollRef} className="h-4" />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <footer className="p-6 bg-white border-t">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center bg-muted/30 rounded-full p-1.5 shadow-sm border border-muted group focus-within:ring-2 focus-within:ring-primary/20 transition-all">
                  <Popover open={isEmojiPickerOpen} onOpenChange={setIsEmojiPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full shrink-0 text-muted-foreground hover:text-primary transition-colors ml-1">
                        <Smile className="w-5 h-5" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="p-0 border-none shadow-2xl mb-4">
                      <EmojiPicker 
                        onEmojiClick={(emojiData) => {
                          setMessageText(prev => prev + emojiData.emoji);
                          setIsEmojiPickerOpen(false);
                        }}
                        theme={Theme.LIGHT}
                        width={350}
                        height={450}
                      />
                    </PopoverContent>
                  </Popover>

                  <Input 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Enter strategic message..."
                    className="flex-1 h-12 bg-transparent border-none shadow-none focus-visible:ring-0 px-4 text-md font-medium"
                  />
                  <Button 
                    type="submit" 
                    className="h-12 w-12 rounded-full bg-primary shadow-lg shadow-primary/20 shrink-0 transition-transform active:scale-95"
                    disabled={!messageText.trim()}
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </footer>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-6">
              <div className="w-24 h-24 bg-white rounded-[2rem] shadow-2xl flex items-center justify-center relative scale-125">
                <MessageSquare className="w-10 h-10 text-primary opacity-20" />
                <div className="absolute inset-0 bg-primary/5 rounded-full blur-3xl animate-pulse" />
              </div>
              <div className="max-w-sm space-y-2">
                <h3 className="text-2xl font-black tracking-tight">Professional Message Hub</h3>
                <p className="text-muted-foreground text-sm leading-relaxed italic border-l-4 border-primary/20 pl-6">
                  Select a verified partner to initiate secure communications.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
