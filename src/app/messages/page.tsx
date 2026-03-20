
"use client";

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, serverTimestamp, doc } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Send, MessageSquare, Clock, CheckCheck, Inbox, Zap, Smile, Paperclip, FileText, Download, Image as ImageIcon } from 'lucide-react';
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
      where(profile.role === 'investor' ? 'senderId' : 'receiverId', '==', user.uid)
    );
  }, [db, user, profile, emailVerified]);

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

      <main className="flex-1 flex overflow-hidden max-w-[1600px] mx-auto w-full border-x bg-white/50 backdrop-blur-md">
        <aside className="w-[380px] border-r flex flex-col bg-muted/20">
          <div className="p-8 border-b bg-white/40">
            <h2 className="text-xl font-black flex items-center gap-3">
              <Inbox className="w-6 h-6 text-primary" />
              Secure Hub
            </h2>
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-2">Verified Connections Only</p>
          </div>
          <ScrollArea className="flex-1">
            {loadingConnections ? (
              <div className="p-12 text-center"><Loader2 className="animate-spin mx-auto w-8 h-8 text-muted-foreground opacity-20" /></div>
            ) : connections.length > 0 ? (
              <div className="p-4 space-y-2">
                {connections.map((conn) => {
                  const hasUnread = rawMessages?.some(m => m.pitchId === conn.pitchId && m.receiverId === user.uid && m.read === false);
                  const isActive = selectedConnection?.id === conn.id;
                  return (
                    <div
                      key={conn.id}
                      className={cn(
                        "p-5 cursor-pointer rounded-2xl transition-all flex items-center gap-4 relative group", 
                        isActive ? "bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]" : "hover:bg-white hover:shadow-lg hover:shadow-black/5"
                      )}
                      onClick={() => setSelectedConnection(conn)}
                    >
                      <Avatar className="h-12 w-12 border-2 border-white shadow-sm ring-1 ring-black/5">
                        <AvatarFallback className={cn("font-black", isActive ? "bg-white/20 text-white" : "bg-primary/10 text-primary")}>
                          {conn.startupName[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 overflow-hidden">
                        <div className="flex justify-between items-center mb-0.5">
                          <p className={cn("text-sm font-black truncate", isActive ? "text-white" : "text-foreground")}>{conn.startupName}</p>
                          {hasUnread && <div className="w-2.5 h-2.5 bg-accent rounded-full animate-pulse border-2 border-white" />}
                        </div>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest", isActive ? "text-white/70" : "text-muted-foreground")}>Connected Partner</p>
                      </div>
                      {isActive && <Zap className="w-4 h-4 text-white/50 absolute right-4 top-4" />}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-20 text-center space-y-4">
                <div className="p-6 bg-muted rounded-full w-fit mx-auto">
                   <MessageSquare className="w-10 h-10 text-muted-foreground opacity-20" />
                </div>
                <h3 className="font-bold text-muted-foreground">No active channels.</h3>
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/50">Market interests will appear here.</p>
              </div>
            )}
          </ScrollArea>
        </aside>

        <section className="flex-1 flex flex-col bg-white/40">
          {selectedConnection ? (
            <>
              <div className="p-8 border-b flex items-center justify-between bg-white shadow-sm z-10">
                <div className="flex items-center gap-5">
                  <Avatar className="h-14 w-14 border-2 shadow-sm"><AvatarFallback className="bg-primary text-white font-black text-xl">{selectedConnection.startupName[0]}</AvatarFallback></Avatar>
                  <div className="space-y-0.5">
                    <h3 className="text-2xl font-black tracking-tight">{selectedConnection.startupName}</h3>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest font-black flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Encrypted Session
                    </div>
                  </div>
                </div>
                <Badge variant="outline" className="h-10 px-6 rounded-xl font-bold border-2 hidden md:flex">Strategic Inquiry</Badge>
              </div>

              <ScrollArea className="flex-1 p-10">
                <div className="space-y-8">
                  {messages.map((msg) => (
                    <div key={msg.id} className={cn("flex flex-col max-w-[75%] space-y-2", msg.senderId === user.uid ? "ml-auto items-end" : "items-start")}>
                      <div className={cn(
                        "px-6 py-4 rounded-3xl text-sm font-medium shadow-md leading-relaxed flex flex-col gap-3", 
                        msg.senderId === user.uid ? "bg-primary text-white rounded-br-none shadow-primary/20" : "bg-white text-foreground rounded-bl-none shadow-black/5 ring-1 ring-black/5"
                      )}>
                        {msg.fileURL && (
                          <div className="mb-2">
                            {msg.fileType.startsWith('image/') ? (
                              <div className="relative w-full aspect-video rounded-xl overflow-hidden border-2 border-white/20 shadow-inner group">
                                <Image src={msg.fileURL} alt="Attachment" fill className="object-cover" unoptimized />
                                <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                  <Download className="w-6 h-6 text-white" />
                                </a>
                              </div>
                            ) : (
                              <a href={msg.fileURL} target="_blank" rel="noopener noreferrer" className={cn(
                                "flex items-center gap-3 p-4 rounded-xl border-2 transition-all hover:scale-[1.02]",
                                msg.senderId === user.uid ? "bg-white/10 border-white/20 hover:bg-white/20" : "bg-muted/30 border-muted/50 hover:bg-muted/50"
                              )}>
                                <div className={cn("p-2 rounded-lg", msg.senderId === user.uid ? "bg-white/20" : "bg-primary/10")}>
                                  <FileText className={cn("w-5 h-5", msg.senderId === user.uid ? "text-white" : "text-primary")} />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60 mb-0.5">Shared Document</p>
                                  <p className="font-bold truncate text-xs">{msg.fileName || 'document.pdf'}</p>
                                </div>
                                <Download className="w-4 h-4 opacity-40" />
                              </a>
                            )}
                          </div>
                        )}
                        <p>{msg.text}</p>
                      </div>
                      <div className="flex items-center gap-2 px-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                          <Clock className="w-3 h-3" />
                          {msg.timestamp?.toDate ? format(msg.timestamp.toDate(), 'HH:mm') : 'Syncing...'}
                        </span>
                        {msg.senderId === user.uid && (
                          <CheckCheck className={cn("w-3.5 h-3.5", msg.read ? "text-accent" : "text-muted-foreground opacity-30")} />
                        )}
                      </div>
                    </div>
                  ))}
                  <div ref={scrollRef} />
                </div>
              </ScrollArea>

              <div className="p-8 border-t bg-white/60 shadow-[0_-4px_20px_rgba(0,0,0,0.03)]">
                <form onSubmit={handleSendMessage} className="flex gap-4 items-center">
                  <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} accept=".jpg,.png,.jpeg,.pdf,.doc,.docx" />
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className="h-14 w-14 rounded-2xl bg-white border-none shadow-inner text-muted-foreground hover:bg-primary/10 hover:text-primary transition-all active:scale-95 disabled:opacity-50"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingFile}
                  >
                    {uploadingFile ? <Loader2 className="w-6 h-6 animate-spin" /> : <Paperclip className="w-6 h-6" />}
                  </Button>
                  
                  <div className="flex-1 relative flex items-center">
                    <Input 
                      placeholder="Compose message..." 
                      value={messageText} 
                      onChange={(e) => setMessageText(e.target.value)} 
                      className="flex-1 h-14 rounded-2xl bg-white border-none shadow-inner text-lg font-medium px-6 pr-14 focus:ring-2 focus:ring-primary/20 transition-all" 
                    />
                    <div className="absolute right-4">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-muted text-muted-foreground transition-all">
                            <Smile className="w-6 h-6" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="end" className="p-0 border-none shadow-2xl rounded-2xl w-auto">
                          <EmojiPicker 
                            onEmojiClick={onEmojiClick}
                            lazyLoadEmojis={true}
                            skinTonesDisabled={true}
                            previewConfig={{ showPreview: false }}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  <Button type="submit" size="icon" className="h-14 w-14 shrink-0 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 bg-primary hover:bg-primary/90" disabled={!messageText.trim() || uploadingFile}>
                    <Send className="w-6 h-6" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-12 bg-muted/5">
               <div className="p-10 bg-white rounded-full shadow-xl mb-10 scale-125">
                  <MessageSquare className="w-16 h-16 text-primary opacity-20" />
               </div>
               <h3 className="text-3xl font-black text-foreground mb-4">Start a Conversation</h3>
               <p className="text-lg font-medium max-w-sm text-center italic border-l-4 border-primary/20 pl-6">
                 Select a verified partner from your connection list to initiate a secure inquiry.
               </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
