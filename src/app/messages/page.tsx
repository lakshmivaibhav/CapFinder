"use client";

import { useState, useRef, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, serverTimestamp, doc, limit, orderBy } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Send, MessageSquare, Clock, CheckCheck, Inbox, Zap, Smile, Paperclip, FileText, Download, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';

// Dynamically import emoji picker to avoid SSR issues
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

export default function MessagesPage() {
  const { user, profile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [messageText, setMessageText] = useState('');
  const [uploadingFile, setUploadingFile] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!emailVerified) {
        router.push('/verify-email');
      }
    }
  }, [user, emailVerified, authLoading, router]);

  const connectionsQuery = useMemoFirebase(() => {
    if (!user || !profile || !emailVerified) return null;
    return query(
      collection(db, 'contactRequests'),
      where(profile.role === 'investor' ? 'senderId' : 'receiverId', '==', user.uid),
      where('status', '==', 'accepted'),
      limit(50)
    );
  }, [db, user, profile, emailVerified]);

  const { data: connections, isLoading: loadingConnections } = useCollection(connectionsQuery);

  // Optimized messages query with limit
  const messagesQuery = useMemoFirebase(() => {
    if (!selectedConnection) return null;
    return query(
      collection(db, 'messages'),
      where('pitchId', '==', selectedConnection.pitchId),
      orderBy('timestamp', 'desc'),
      limit(100)
    );
  }, [db, selectedConnection]);

  const { data: rawMessages } = useCollection(messagesQuery);

  const messages = useMemo(() => {
    if (!rawMessages || !selectedConnection) return [];
    return rawMessages
      .filter(msg => 
        (msg.senderId === selectedConnection.senderId && msg.receiverId === selectedConnection.receiverId) ||
        (msg.senderId === selectedConnection.receiverId && msg.receiverId === selectedConnection.senderId)
      )
      .sort((a, b) => (a.timestamp?.toMillis?.() || 0) - (b.timestamp?.toMillis?.() || 0));
  }, [rawMessages, selectedConnection]);

  useEffect(() => {
    if (selectedConnection && user && messages.length > 0) {
      const unreadMessages = messages.filter(m => m.receiverId === user.uid && m.read === false);
      unreadMessages.forEach(m => updateDocumentNonBlocking(doc(db, 'messages', m.id), { read: true }));
    }
  }, [selectedConnection, messages, user, db]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
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

    setMessageText('');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !selectedConnection) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      toast({ variant: "destructive", title: "Format Error", description: "Supported formats: JPG, PNG, PDF, DOC, DOCX." });
      return;
    }

    setUploadingFile(true);
    try {
      const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dfp3ydcli/auto/upload";
      const UPLOAD_PRESET = "profile_upload";

      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', UPLOAD_PRESET);

      const response = await fetch(CLOUDINARY_URL, { method: 'POST', body: formData });
      if (!response.ok) throw new Error('Cloudinary upload failed');

      const data = await response.json();
      const secureURL = data.secure_url;

      const receiverId = user.uid === selectedConnection.senderId 
        ? selectedConnection.receiverId 
        : selectedConnection.senderId;

      addDocumentNonBlocking(collection(db, 'messages'), {
        senderId: user.uid,
        receiverId,
        pitchId: selectedConnection.pitchId,
        text: `Shared a file: ${file.name}`,
        fileURL: secureURL,
        fileType: file.type,
        fileName: file.name,
        timestamp: serverTimestamp(),
        read: false,
      });

      toast({ title: "File Sent", description: "Your document has been successfully attached to the session." });
    } catch (error) {
      toast({ variant: "destructive", title: "Upload Failed", description: "Could not send the attachment." });
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onEmojiClick = (emojiData: any) => {
    setMessageText(prev => prev + emojiData.emoji);
  };

  if (authLoading || (user && !emailVerified)) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" /></div>;
  if (!user) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col h-screen overflow-hidden">
      <Navbar />

      <main className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full border-x bg-white relative">
        {/* Connection List Sidebar */}
        <aside className={cn(
          "w-full md:w-[380px] border-r flex flex-col bg-muted/10 absolute md:relative inset-0 z-20 transition-transform duration-300",
          selectedConnection ? "-translate-x-full md:translate-x-0" : "translate-x-0"
        )}>
          <div className="p-8 border-b bg-white">
            <h2 className="text-xl font-black flex items-center gap-3 tracking-tight">
              <Inbox className="w-6 h-6 text-primary" />
              Secure Hub
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2">Verified Connections Only</p>
          </div>
          <ScrollArea className="flex-1">
            {loadingConnections ? (
              <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8 text-muted-foreground opacity-20" /></div>
            ) : connections && connections.length > 0 ? (
              <div className="p-4 space-y-2">
                {connections.map((conn) => {
                  const hasUnread = rawMessages?.some(m => m.pitchId === conn.pitchId && m.receiverId === user.uid && m.read === false);
                  const isActive = selectedConnection?.id === conn.id;
                  return (
                    <div
                      key={conn.id}
                      className={cn(
                        "p-5 cursor-pointer rounded-2xl transition-all flex items-center gap-4 relative group", 
                        isActive 
                          ? "bg-primary text-white shadow-xl shadow-primary/20" 
                          : "hover:bg-white hover:shadow-lg"
                      )}
                      onClick={() => setSelectedConnection(conn)}
                    >
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm">
                        <AvatarFallback className={cn("font-black text-sm", isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                          {conn.startupName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className={cn("text-sm font-black truncate", isActive ? "text-white" : "text-foreground")}>{conn.startupName}</p>
                          {hasUnread && <div className="w-2 h-2 bg-accent rounded-full animate-pulse border-2 border-white" />}
                        </div>
                        <p className={cn("text-[9px] font-black uppercase tracking-widest", isActive ? "text-white/70" : "text-muted-foreground")}>Connected Partner</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-20 text-center space-y-4">
                <div className="p-6 bg-muted rounded-full w-fit mx-auto">
                   <MessageSquare className="w-10 h-10 text-muted-foreground opacity-20" />
                </div>
                <h3 className="font-black text-muted-foreground uppercase text-[10px] tracking-widest">No active channels.</h3>
                <p className="text-[10px] font-bold text-muted-foreground/50 max-w-[180px] mx-auto leading-relaxed">Strategic inquiries will appear here once authenticated.</p>
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Chat Area */}
        <section className={cn(
          "flex-1 flex flex-col bg-muted/5 absolute md:relative inset-0 z-10 transition-transform duration-300 md:translate-x-0",
          selectedConnection ? "translate-x-0" : "translate-x-full md:translate-x-0"
        )}>
          {selectedConnection ? (
            <>
              {/* Chat Header */}
              <div className="p-8 border-b flex items-center justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-5">
                  <Button variant="ghost" size="icon" className="md:hidden rounded-xl h-10 w-10" onClick={() => setSelectedConnection(null)}>
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
                    <AvatarFallback className="bg-primary text-white font-black text-xl">{selectedConnection.startupName[0]}</AvatarFallback>
                  </Avatar>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black tracking-tight leading-none">{selectedConnection.startupName}</h3>
                    <div className="text-[9px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-2 mt-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Encrypted Session Active
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="h-10 px-6 rounded-xl font-black uppercase text-[9px] tracking-widest border-2 hidden sm:flex bg-muted/10">Strategic Inquiry</Badge>
              </div>

              {/* Message List */}
              <ScrollArea className="flex-1 p-10">
                <div className="space-y-10">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col max-w-[80%] space-y-1.5", msg.senderId === user.uid ? "ml-auto items-end" : "items-start")}>
                      <div className={cn(
                        "px-6 py-4 text-sm font-medium shadow-xl leading-relaxed flex flex-col gap-2 transition-all", 
                        msg.senderId === user.uid 
                          ? "bg-primary text-white rounded-[1.5rem] rounded-br-sm shadow-primary/20" 
                          : "bg-white text-foreground rounded-[1.5rem] rounded-bl-sm shadow-black/5 border border-muted"
                      )}>
                        {msg.fileURL && (
                          <div className="mb-1">
                            {msg.fileType.startsWith('image/') ? (
                              <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-inner group cursor-pointer">
                                <Image src={msg.fileURL} alt="Attachment" fill className="object-cover transition-transform duration-500 group-hover:scale-105" unoptimized />
                                <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-[2px]">
                                  <Download className="w-5 h-5 text-white" />
                                </a>
                              </div>
                            ) : (
                              <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className={cn(
                                "flex items-center gap-3 p-3 rounded-xl border-2 transition-all hover:scale-[1.02]",
                                msg.senderId === user.uid ? "bg-white/10 border-white/20" : "bg-muted/30 border-muted/50"
                              )}>
                                <div className={cn("p-2 rounded-lg", msg.senderId === user.uid ? "bg-white/20" : "bg-primary/10")}>
                                  <FileText className={cn("w-5 h-5", msg.senderId === user.uid ? "text-white" : "text-primary")} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Shared Document</p>
                                  <p className="font-black truncate text-[10px]">{msg.fileName || 'document.pdf'}</p>
                                </div>
                                <Download className="w-4 h-4 opacity-40" />
                              </a>
                            )}
                          </div>
                        )}
                        <p className="text-[15px] leading-relaxed">{msg.text}</p>
                      </div>
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1 opacity-60">
                          <Clock className="w-3 h-3" />
                          {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : 'Syncing...'}
                        </span>
                        {msg.senderId === user.uid && (
                          <CheckCheck className={cn("w-3 h-3", msg.read ? "text-emerald-500" : "text-muted-foreground opacity-30")} />
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              {/* Chat Input Bar */}
              <div className="p-8 border-t bg-white shadow-2xl z-10">
                <form onSubmit={handleSendMessage} className="flex gap-4 items-center max-w-5xl mx-auto">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".jpg,.png,.jpeg,.pdf,.doc,.docx" />
                  <div className="flex gap-2">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon" 
                      className="h-14 w-14 rounded-xl bg-muted/30 border-none shadow-inner text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-95 disabled:opacity-50"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingFile}
                    >
                      {uploadingFile ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                    </Button>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-14 w-14 rounded-xl bg-muted/30 border-none shadow-inner text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-95 hidden sm:flex">
                          <Smile className="w-5 h-5" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent side="top" align="start" className="p-0 border-none shadow-2xl rounded-3xl w-auto mb-4 overflow-hidden">
                        <EmojiPicker 
                          onEmojiClick={onEmojiClick}
                          lazyLoadEmojis={true}
                          skinTonesDisabled={true}
                          previewConfig={{ showPreview: false }}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="flex-1 relative">
                    <Input 
                      placeholder="Compose message..." 
                      value={messageText} 
                      onChange={(e) => setMessageText(e.target.value)} 
                      className="flex-1 h-14 rounded-xl bg-muted/30 border-none shadow-inner text-lg font-medium px-8 focus:ring-4 focus:ring-primary/10 transition-all outline-none" 
                    />
                  </div>

                  <Button type="submit" size="icon" className="h-14 w-14 shrink-0 rounded-xl shadow-xl shadow-primary/20 transition-all active:scale-90 bg-primary hover:bg-primary/90" disabled={!messageText.trim() || uploadingFile}>
                    <Send className="w-5 h-5" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 bg-muted/5 relative overflow-hidden text-center">
               <Zap className="absolute -right-20 -bottom-20 w-96 h-96 text-primary/5 -rotate-12" />
               <div className="p-12 bg-white rounded-full shadow-2xl mb-10 scale-125 ring-8 ring-primary/5">
                  <MessageSquare className="w-16 h-16 text-primary opacity-20" />
               </div>
               <h3 className="text-4xl font-black text-foreground mb-4 tracking-tighter">Initiate Conversation</h3>
               <p className="text-lg font-medium max-w-sm italic border-l-8 border-primary/20 pl-8 leading-relaxed">
                 Select a verified partner from your connection list to begin a secure strategic inquiry.
               </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}