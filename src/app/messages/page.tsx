
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
import { 
  MessageSquare, 
  Send, 
  User, 
  Loader2, 
  ArrowLeft, 
  Inbox, 
  ShieldCheck,
  Building,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

/**
 * @fileOverview Secure Messaging Hub.
 * Optimized for real-time synchronization using pitchId-based isolation.
 */
export default function MessagesPage() {
  const { user, profile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
  const [messages, setMessages] = useState<any[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  const selectedPitchId = activeConnection?.pitchId;
  const partnerId = useMemo(() => {
    if (!user || !activeConnection) return null;
    return user.uid === activeConnection.senderId ? activeConnection.receiverId : activeConnection.senderId;
  }, [user, activeConnection]);

  /**
   * Pitch-based query.
   * Fetches all messages for the selected pitch context.
   */
  const messagesQuery = useMemoFirebase(() => {
    if (!user || !selectedPitchId) return null;
    return query(
      collection(db, 'messages'),
      where('pitchId', '==', selectedPitchId),
      orderBy('timestamp', 'asc'),
      limit(500)
    );
  }, [db, user, selectedPitchId]);

  /**
   * Manual Real-time Listener.
   * Ensures that the messages state is updated strictly from the Firestore snapshot.
   */
  useEffect(() => {
    if (!messagesQuery) {
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
      console.error("Strategic dialogue sync error:", error);
      setLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [messagesQuery]);

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

    // Persist strategic message using the standardized schema
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
                      onClick={() => setSelectedConnectionId(conn.id)}
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
              <header className="h-20 border-b bg-white/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="md:hidden rounded-xl" 
                    onClick={() => setSelectedConnectionId(null)}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div className="space-y-0.5">
                    <h3 className="font-black tracking-tight">{partnerName}</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Active Strategic Dialogue</p>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 rounded-lg px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3 mr-1.5" /> Identity Verified
                </Badge>
              </header>

              {/* Dialogue Stream */}
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
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
                            "max-w-[80%] p-4 md:p-6 rounded-[1.5rem] shadow-sm relative group",
                            isMe ? "bg-primary text-white rounded-tr-none" : "bg-white text-foreground rounded-tl-none"
                          )}>
                            <p className="text-sm md:text-md font-medium leading-relaxed">{msg.text}</p>
                            <p className={cn(
                              "text-[8px] font-black uppercase tracking-widest mt-2 opacity-40",
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
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Message Input */}
              <footer className="p-6 bg-white border-t">
                <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto flex gap-4">
                  <Input 
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    placeholder="Enter strategic message..."
                    className="h-14 rounded-2xl bg-muted/30 border-none shadow-inner px-6 text-md font-medium"
                  />
                  <Button 
                    type="submit" 
                    className="h-14 w-14 rounded-2xl bg-primary shadow-xl shadow-primary/20 shrink-0"
                    disabled={!messageText.trim()}
                  >
                    <Send className="w-6 h-6" />
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
