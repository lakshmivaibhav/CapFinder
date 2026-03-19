"use client";

import { use, useState, useMemo } from 'react';
import { doc, collection, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Mail, MessageSquare, Clock, CheckCircle2, Bookmark, BookmarkCheck, Sparkles, XCircle, User, DollarSign, Building2, Trash2, Zap, LayoutGrid, Info } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function PitchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);
  const [resolving, setResolving] = useState(false);

  const pitchRef = useMemoFirebase(() => doc(db, 'pitches', id), [db, id]);
  const { data: pitch, isLoading: loadingPitch } = useDoc(pitchRef);

  const isInvestor = profile?.role === 'investor';
  const isOwner = user?.uid === pitch?.ownerId;

  const interestsQuery = useMemoFirebase(() => {
    if (!user || !isInvestor || !pitch) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, isInvestor, id, pitch]);
  const { data: interests } = useCollection(interestsQuery);
  const isInterested = interests && interests.length > 0;

  const favoritesQuery = useMemoFirebase(() => {
    if (!user || !isInvestor || !pitch) return null;
    return query(collection(db, 'favorites'), where('investorId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, isInvestor, id, pitch]);
  const { data: favorites } = useCollection(favoritesQuery);
  const isFavorited = favorites && favorites.length > 0;

  const contactRequestsQuery = useMemoFirebase(() => {
    if (!user || !isInvestor || !pitch) return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, isInvestor, id, pitch]);
  const { data: contactRequests } = useCollection(contactRequestsQuery);
  const contactRequest = contactRequests?.[0];

  const handleShowInterest = () => {
    if (!user || !pitch || isInterested) return;
    addDocumentNonBlocking(collection(db, 'interests'), {
      pitchId: pitch.id,
      investorId: user.uid,
      investorEmail: user.email,
      startupOwnerId: pitch.ownerId,
      startupName: pitch.startupName,
      industry: pitch.industry,
      timestamp: serverTimestamp(),
    });
    toast({ title: "Interest Registered", description: `The founders of ${pitch.startupName} have been notified.` });
  };

  const handleToggleFavorite = () => {
    if (!user || !pitch) return;
    if (isFavorited) {
      const existingFav = favorites?.find(f => f.pitchId === pitch.id);
      if (existingFav) deleteDocumentNonBlocking(doc(db, 'favorites', existingFav.id));
      toast({ title: "Removed from favorites" });
    } else {
      addDocumentNonBlocking(collection(db, 'favorites'), {
        pitchId: pitch.id,
        investorId: user.uid,
        startupName: pitch.startupName,
        industry: pitch.industry,
        timestamp: serverTimestamp(),
      });
      toast({ title: "Saved to favorites" });
    }
  };

  const handleRequestContact = () => {
    if (!user || !pitch || contactRequest) return;
    const requestId = `${user.uid}_${pitch.ownerId}_${pitch.id}`;
    setDocumentNonBlocking(doc(db, 'contactRequests', requestId), {
      senderId: user.uid,
      receiverId: pitch.ownerId,
      pitchId: pitch.id,
      startupName: pitch.startupName,
      investorEmail: user.email,
      status: 'pending',
      timestamp: serverTimestamp(),
    }, { merge: true });
    toast({ title: "Contact Request Sent", description: "The startup will review your request shortly." });
  };

  const handleResolveConnection = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!user || !pitch || !isInvestor) return;
    if (!confirm("This will permanently remove your connection, messages, and interest for this pitch. Proceed?")) return;

    setResolving(true);
    try {
      const intSnap = await getDocs(query(collection(db, 'interests'), where('pitchId', '==', pitch.id), where('investorId', '==', user.uid)));
      intSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'interests', d.id)));

      const reqSnap = await getDocs(query(collection(db, 'contactRequests'), where('pitchId', '==', pitch.id), where('senderId', '==', user.uid)));
      reqSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'contactRequests', d.id)));

      const msgsSnap = await getDocs(query(collection(db, 'messages'), where('pitchId', '==', pitch.id)));
      msgsSnap.docs.forEach(d => {
        const m = d.data();
        if ((m.senderId === user.uid && m.receiverId === pitch.ownerId) || (m.senderId === pitch.ownerId && m.receiverId === user.uid)) {
          deleteDocumentNonBlocking(doc(db, 'messages', d.id));
        }
      });

      toast({ title: "Connection resolved", description: "All records for this pitch have been cleared." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Resolve failed", description: error.message });
    } finally {
      setResolving(false);
    }
  };

  const handleRequestDeletion = async () => {
    if (!user || !pitch || !isOwner) return;
    
    setChecking(true);
    try {
      const interestsSnap = await getDocs(query(collection(db, 'interests'), where('pitchId', '==', pitch.id)));
      const requestsSnap = await getDocs(query(collection(db, 'contactRequests'), where('pitchId', '==', pitch.id)));

      if (!interestsSnap.empty || !requestsSnap.empty) {
        toast({
          variant: "destructive",
          title: "Resolve connection required",
          description: "Active connections exist. Investors must resolve their interest before you can delete this pitch."
        });
        setChecking(false);
        return;
      }

      if (confirm("Request deletion of this pitch? An administrator will review your request.")) {
        addDocumentNonBlocking(collection(db, 'deleteRequests'), {
          userId: user.uid,
          targetType: 'pitch',
          targetId: pitch.id,
          status: 'pending',
          timestamp: serverTimestamp(),
          details: `Startup owner requested deletion of pitch: ${pitch.startupName}`
        });
        toast({ title: "Deletion Request Sent", description: "Administrators have been notified." });
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Could not verify pitch status." });
    } finally {
      setChecking(false);
    }
  };

  if (loadingPitch || authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" /></div>;
  if (!pitch) return <div className="min-h-screen flex flex-col items-center justify-center gap-6"><div className="p-4 bg-destructive/10 rounded-full"><XCircle className="w-12 h-12 text-destructive" /></div><h2 className="text-2xl font-black">Venture Not Found</h2><Link href="/pitches"><Button variant="outline" className="rounded-xl border-2">Return to Marketplace</Button></Link></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto py-12 px-6 w-full space-y-12">
        <Link href="/pitches" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit font-bold text-sm group">
          <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-[2.5rem] relative">
              <CardHeader className="p-10 pb-6 space-y-10">
                <div className="flex items-center justify-between">
                  <Badge className="bg-primary/10 text-primary border-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl">
                    {pitch.industry}
                  </Badge>
                  <div className="flex items-center gap-3">
                    {isOwner && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10 h-10 px-4 rounded-xl font-bold"
                        onClick={handleRequestDeletion}
                        disabled={checking}
                      >
                        {checking ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Delete Request
                      </Button>
                    )}
                    {isInvestor && (
                      <div className="flex items-center gap-3">
                         {(isInterested || (contactRequest && contactRequest.status === 'accepted')) && (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="text-amber-600 border-amber-200 hover:bg-amber-50 h-10 px-4 rounded-xl font-bold border-2"
                             onClick={(e) => handleResolveConnection(e)}
                             disabled={resolving}
                           >
                             {resolving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                             Resolve
                           </Button>
                         )}
                         <Button 
                           variant="outline" 
                           size="sm" 
                           onClick={handleToggleFavorite} 
                           className={`h-10 px-6 rounded-xl border-2 font-bold transition-all flex gap-2 items-center ${isFavorited ? "text-accent bg-accent/5 border-accent/20" : "text-muted-foreground hover:text-accent border-muted/20"}`}
                         >
                           {isFavorited ? <><BookmarkCheck className="w-4 h-4 fill-current" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save Pitch</>}
                         </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h1 className="text-5xl md:text-6xl font-black tracking-tighter leading-[1.1]">{pitch.startupName}</h1>
                  <div className="flex items-center gap-6 text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Established {pitch.createdAt?.toDate ? pitch.createdAt.toDate().toLocaleDateString() : 'Active'}</span>
                    <span className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-accent" /> Verified Venture</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-10 pt-6 space-y-12">
                <div className="p-8 bg-muted/20 rounded-[2rem] border-l-8 border-primary relative overflow-hidden">
                  <Sparkles className="absolute -right-4 -top-4 w-24 h-24 text-primary/5 -rotate-12" />
                  <p className="text-2xl md:text-3xl leading-relaxed text-foreground font-medium italic relative z-10">
                    &quot;{pitch.description}&quot;
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-8 bg-primary shadow-xl shadow-primary/20 rounded-3xl space-y-3 flex flex-col items-center text-center text-white">
                    <div className="p-3 bg-white/20 rounded-2xl mb-2">
                      <DollarSign className="w-6 h-6" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest font-black opacity-80">Target Investment</p>
                    <p className="text-4xl font-black">${pitch.fundingNeeded?.toLocaleString()}</p>
                  </div>
                  <div className="p-8 bg-white border-2 border-muted shadow-sm rounded-3xl space-y-3 flex flex-col items-center text-center">
                    <div className="p-3 bg-accent/10 rounded-2xl mb-2">
                      <Building2 className="w-6 h-6 text-accent" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Market Sector</p>
                    <p className="text-3xl font-black text-foreground">{pitch.industry}</p>
                  </div>
                </div>
              </CardContent>

              {isInvestor && (
                <CardFooter className="p-10 border-t bg-muted/5 flex flex-col sm:flex-row gap-6">
                   <div className="flex-1 flex flex-col gap-3">
                     {!contactRequest ? (
                       <Button className="w-full h-16 text-xl font-black shadow-xl shadow-primary/20 bg-primary hover:bg-primary/90 rounded-2xl" onClick={handleRequestContact}>
                         <Mail className="mr-3 w-6 h-6" /> Request Direct Contact
                       </Button>
                     ) : contactRequest.status === 'pending' ? (
                       <Button className="w-full h-16 text-xl font-black rounded-2xl" variant="secondary" disabled>
                         <Clock className="mr-3 w-6 h-6 animate-pulse" /> Pending Approval
                       </Button>
                     ) : contactRequest.status === 'accepted' ? (
                       <div className="flex gap-4 w-full">
                          <Button className="flex-1 h-16 text-lg font-black bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-500/20 rounded-2xl" asChild>
                            <a href={`mailto:${pitch.contactEmail}`}>
                              <Mail className="mr-3 w-5 h-5" /> Email Founder
                            </a>
                          </Button>
                          <Button className="flex-1 h-16 text-lg font-black bg-accent hover:bg-accent/90 shadow-lg shadow-accent/20 rounded-2xl" asChild>
                            <Link href="/messages">
                              <MessageSquare className="mr-3 w-5 h-5" /> Secured Chat
                            </Link>
                          </Button>
                       </div>
                     ) : (
                       <Button className="w-full h-16 text-xl font-black rounded-2xl" variant="outline" disabled>
                         <XCircle className="mr-3 w-6 h-6" /> Inquiry Declined
                       </Button>
                     )}
                   </div>

                   <Button 
                    className={`flex-1 h-16 text-xl font-black transition-all rounded-2xl shadow-xl ${isInterested ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'border-2 border-primary text-primary hover:bg-primary/5 shadow-primary/5'}`} 
                    onClick={handleShowInterest}
                    variant={isInterested ? "default" : "outline"}
                    disabled={isInterested}
                   >
                     {isInterested ? <><CheckCircle2 className="mr-3 w-6 h-6" /> Interest Expressed</> : <><Sparkles className="mr-3 w-6 h-6" /> Show Interest</>}
                   </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-primary/5 border-b py-8 px-10">
                <CardTitle className="text-xs font-black flex items-center gap-3 text-primary uppercase tracking-widest">
                  <User className="w-5 h-5" /> Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-20 h-20 bg-muted/30 rounded-[1.5rem] flex items-center justify-center border-2 border-white shadow-inner">
                    <User className="w-10 h-10 text-muted-foreground opacity-30" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black">Startup Leadership</h3>
                    <p className="text-sm text-muted-foreground font-medium">Verified Identity</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-xs font-black uppercase text-muted-foreground tracking-widest">
                    <Info className="w-4 h-4 text-primary" /> Status Note
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed italic p-6 bg-muted/20 rounded-2xl border-l-2 border-primary/20">
                    Detailed founder background and historical performance data is available for connected strategic partners. Visit the <Link href="/pitches" className="text-primary hover:underline font-bold">Market Feed</Link> for more context.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-accent text-white overflow-hidden rounded-[2rem] p-10 relative">
              <Sparkles className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 -rotate-12" />
              <div className="space-y-6 relative z-10">
                <Badge className="bg-white/20 text-white border-none font-black uppercase text-[9px] tracking-widest px-4 py-1">Platform Verified</Badge>
                <h3 className="text-2xl font-black tracking-tight">Venture Protection</h3>
                <p className="text-sm opacity-90 leading-relaxed font-medium italic">
                  &quot;CapFinder ensures that all ventures undergo a preliminary verification process to maintain high ecosystem integrity.&quot;
                </p>
                <div className="h-1.5 w-full bg-white/20 rounded-full" />
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
