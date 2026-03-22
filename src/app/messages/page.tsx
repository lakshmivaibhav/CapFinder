"use client";

import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, limit, or, and, serverTimestamp } from 'firebase/firestore';
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
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function MessagesPage() {
  const { user, profile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const [selectedConnectionId, setSelectedConnectionId] = useState<string | null>(null);
  const [messageText, setMessageText] = useState('');
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

  // Fetch messages for the selected connection using connectionId
  const messagesQuery = useMemoFirebase(() => {
    if (!user || !selectedConnectionId) return null;
    return query(
      collection(db, 'messages'),
      where('connectionId', '==', selectedConnectionId),
      orderBy('createdAt', 'asc'),
      limit(500)
    );
  }, [db, user, selectedConnectionId]);

  const { data: messages, isLoading: loadingMessages } = useCollection(messagesQuery);

  // Derive the active connection and partner identity
  const activeConnection = useMemo(() => 
    connections?.find(c => c.id === selectedConnectionId), 
    [connections, selectedConnectionId]
  );

  const partnerId = useMemo(() => {
    if (!user || !activeConnection) return null;
    return user.uid === activeConnection.senderId ? activeConnection.receiverId : activeConnection.senderId;
  }, [user, activeConnection]);

  // Use scoped messages from the connection-based query
  const conversationMessages = useMemo(() => {
    return messages || [];
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [conversationMessages]);

  const partnerName = activeConnection 
    ? (user?.uid === activeConnection.senderId ? activeConnection.startupName : activeConnection.investorEmail)
    : 'Select Contact';

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !partnerId || !selectedConnectionId || !messageText.trim()) return;

    // Persist message with the requested 5 fields, including connectionId for query matching
    addDocumentNonBlocking(collection(db, 'messages'), {
      connectionId: selectedConnectionId,
      senderId: user.uid,
      receiverId: partnerId,
      text: messageText.trim(),
      createdAt: serverTimestamp(),
    });

    setMessageText('');
  };

  if (authLoading || (user && !emailVerified)) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      <Navbar />

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar: Connection List */}
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

        {/* Chat Area */}
        <section className={cn(
          "flex-1 flex flex-col bg-[#f8fafc] relative",
          !selectedConnectionId && "hidden md:flex"
        )}>
          {selectedConnectionId ? (
            <>
              {/* Chat Header */}
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
                      <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">Secure Encryption Active</p>
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 rounded-lg px-3 py-1 font-black text-[9px] uppercase tracking-widest">
                  <ShieldCheck className="w-3 h-3 mr-1.5" /> Identity Verified
                </Badge>
              </header>

              {/* Message List */}
              <ScrollArea className="flex-1 p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {loadingMessages ? (
                    <div className="flex justify-center p-20"><Loader2 className="animate-spin opacity-20" /></div>
                  ) : conversationMessages && conversationMessages.length > 0 ? (
                    conversationMessages.map((msg) => {
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
                              {msg.createdAt?.toDate ? format(msg.createdAt.toDate(), 'HH:mm') : 'Syncing...'}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-20 opacity-20 italic font-black text-sm">Initiate secure dialogue...</div>
                  )}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Input Area */}
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
                    <span className="sr-only">Send Message</span>
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
                  Select a verified connection from the sidebar to engage in secure, identity-verified communications.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
