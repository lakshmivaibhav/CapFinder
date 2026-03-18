
"use client";

import { useState, useRef, useEffect } from 'react';
import { collection, query, where, serverTimestamp, doc, addDoc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare, Clock, CheckCheck, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import Link from 'next/link';

export default function MessagesPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const connectionsQuery = useMemoFirebase(() => {
    if (!user || !profile) return null;
    return query(
      collection(db, 'contactRequests'),
      where(profile.role === 'investor' ? 'senderId' : 'receiverId', '==', user.uid)
    );
  }, [db, user, profile]);

  const { data: allConnections, isLoading: loadingConnections } = useCollection(connectionsQuery);
  const connections = allConnections?.filter(c => c.status === 'accepted') || [];

  const messagesQuery = useMemoFirebase(() => {
    if (!selectedConnection) return null;
    return query(
      collection(db, 'messages'),
      where('pitchId', '==', selectedConnection.pitchId)
    );
  }, [db, selectedConnection]);

  const { data: rawMessages } = useCollection(messagesQuery);

  const messages = (rawMessages || [])
    .filter(msg => 
      (msg.senderId === selectedConnection.senderId && msg.receiverId === selectedConnection.receiverId) ||
      (msg.senderId === selectedConnection.receiverId && msg.receiverId === selectedConnection.senderId)
    )
    .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));

  useEffect(() => {
    if (selectedConnection && user && messages.length > 0) {
      const unreadMessages = messages.filter(m => m.receiverId === user.uid && m.read === false);
      unreadMessages.forEach(m => updateDocumentNonBlocking(doc(db, 'messages', m.id), { read: true }));
    }
  }, [selectedConnection, messages, user, db]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedConnection || !messageText.trim()) return;

    const receiverId = user.uid === selectedConnection.senderId 
      ? selectedConnection.receiverId 
      : selectedConnection.senderId;

    addDocumentNonBlocking(collection(db, 'messages'), {
      senderId: user.uid,
      receiverId,
      pitchId: selectedConnection.pitchId,
      text: messageText,
      timestamp: serverTimestamp(),
      read: false,
    });

    addDocumentNonBlocking(collection(db, 'logs'), {
      userId: user.uid,
      action: 'message_sent',
      targetId: selectedConnection.pitchId,
      timestamp: serverTimestamp(),
      details: `Private message sent between partners`
    });

    setMessageText('');
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      <Navbar />

      <main className="flex-1 flex overflow-hidden max-w-7xl mx-auto w-full border-x bg-white">
        <aside className="w-80 border-r flex flex-col bg-muted/10">
          <div className="p-4 border-b bg-white">
            <h2 className="font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              Active Connections
            </h2>
          </div>
          <ScrollArea className="flex-1">
            {loadingConnections ? (
              <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto w-6 h-6 text-muted-foreground" /></div>
            ) : connections.length > 0 ? (
              <div className="divide-y">
                {connections.map((conn) => {
                  const hasUnread = rawMessages?.some(m => m.pitchId === conn.pitchId && m.receiverId === user.uid && m.read === false);
                  return (
                    <div
                      key={conn.id}
                      className={cn("p-4 cursor-pointer hover:bg-muted/50 transition-colors flex items-center gap-3 relative", selectedConnection?.id === conn.id && "bg-primary/5 border-l-4 border-primary")}
                      onClick={() => setSelectedConnection(conn)}
                    >
                      <Avatar className="h-10 w-10 border"><AvatarFallback className="bg-primary/10 text-primary">{conn.startupName[0]}</AvatarFallback></Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center">
                          <p className={cn("text-sm truncate", hasUnread ? "font-bold text-foreground" : "font-semibold text-muted-foreground")}>{conn.startupName}</p>
                          {hasUnread && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : <div className="p-10 text-center text-muted-foreground text-sm">No active chats yet.</div>}
          </ScrollArea>
        </aside>

        <section className="flex-1 flex flex-col bg-white">
          {selectedConnection ? (
            <>
              <div className="p-4 border-b flex items-center justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10"><AvatarFallback className="bg-primary text-white">{selectedConnection.startupName[0]}</AvatarFallback></Avatar>
                  <div><h3 className="font-bold">{selectedConnection.startupName}</h3><p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">Project Collaboration</p></div>
                </div>
              </div>

              <ScrollArea className="flex-1 p-6">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col max-w-[70%] space-y-1", msg.senderId === user.uid ? "ml-auto items-end" : "items-start")}>
                      <div className={cn("px-4 py-2 rounded-2xl text-sm shadow-sm", msg.senderId === user.uid ? "bg-primary text-white rounded-br-none" : "bg-muted text-foreground rounded-bl-none")}>{msg.text}</div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-[9px] text-muted-foreground flex items-center gap-1"><Clock className="w-2.5 h-2.5" />{msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : 'Just now'}</span>
                        {msg.senderId === user.uid && <CheckCheck className={cn("w-3 h-3", msg.read ? "text-blue-500" : "text-muted-foreground")} />}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <form onSubmit={handleSendMessage} className="p-4 border-t bg-muted/5 flex gap-2 items-center">
                <Input placeholder="Type your message..." value={messageText} onChange={(e) => setMessageText(e.target.value)} className="flex-1 bg-white" />
                <Button type="submit" size="icon" className="h-10 w-10 shrink-0" disabled={!messageText.trim()}><Send className="w-4 h-4" /></Button>
              </form>
            </>
          ) : <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-10 bg-muted/5"><h3 className="text-xl font-bold text-foreground">Select a connection</h3></div>}
        </section>
      </main>
    </div>
  );
}
