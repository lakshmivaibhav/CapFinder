"use client";

import { use, useState } from 'react';
import { doc, collection, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Mail, Clock, CheckCircle2, Bookmark, BookmarkCheck, Sparkles, XCircle, User, DollarSign, Building2, Trash2, Zap, LayoutGrid, Info, ShieldCheck, Image as ImageIcon } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

export default function StartupProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [resolving, setResolving] = useState(false);
  const [checking, setChecking] = useState(false);

  const pitchRef = useMemoFirebase(() => doc(db, 'pitches', id), [db, id]);
  const { data: pitch, isLoading: loadingPitch } = useDoc(pitchRef);

  const founderRef = useMemoFirebase(() => {
    if (!pitch?.ownerId) return null;
    return doc(db, 'users', pitch.ownerId);
  }, [db, pitch?.ownerId]);
  const { data: founder, isLoading: loadingFounder } = useDoc(founderRef);

  const isInvestor = profile?.role === 'investor';
  const isOwner = user?.uid === pitch?.ownerId;

  const interestsQuery = useMemoFirebase(() => {
    if (!user || !isInvestor || !pitch) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, isInvestor, id, pitch]);
  const { data: interests } = useCollection(interestsQuery);
  const isInterested = interests && interests.length > 0;

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
      industry: pitch.category || pitch.industry || 'Other',
      timestamp: serverTimestamp(),
    });
    toast({ title: "Interest Registered", description: `The founders of ${pitch.startupName} have been notified.` });
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

  const handleResolveConnection = async () => {
    if (!user || !pitch || !isInvestor) return;
    if (!confirm("This will permanently remove your connection and interest for this pitch. Proceed?")) return;

    setResolving(true);
    try {
      const intSnap = await getDocs(query(collection(db, 'interests'), where('pitchId', '==', pitch.id), where('investorId', '==', user.uid)));
      intSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'interests', d.id)));

      const reqSnap = await getDocs(query(collection(db, 'contactRequests'), where('pitchId', '==', pitch.id), where('senderId', '==', user.uid)));
      reqSnap.docs.forEach(d => deleteDocumentNonBlocking(doc(db, 'contactRequests', d.id)));

      toast({ title: "Connection resolved", description: "All records for this pitch have been cleared." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Resolve failed", description: error.message });
    } finally {
      setResolving(false);
    }
  };

  const handleDeletePitch = async () => {
    if (!user || !pitch || !isOwner || profile?.role !== 'startup') return;
    
    setChecking(true);
    try {
      const interestsSnap = await getDocs(query(collection(db, 'interests'), where('pitchId', '==', pitch.id)));
      const requestsSnap = await getDocs(query(collection(db, 'contactRequests'), where('pitchId', '==', pitch.id)));

      if (!interestsSnap.empty || !requestsSnap.empty) {
        toast({
          variant: "destructive",
          title: "Resolve connections before deleting",
          description: "Active connections exist. Investors must resolve their interest before you can delete this pitch."
        });
        setChecking(false);
        return;
      }

      if (confirm("Confirm PERMANENT deletion of this pitch? This action cannot be reversed.")) {
        deleteDocumentNonBlocking(doc(db, 'pitches', pitch.id));
        toast({ title: "Venture Deleted", description: "Your pitch has been successfully removed from the marketplace." });
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Deletion failed", description: "Identity authentication or database verification failed." });
    } finally {
      setChecking(false);
    }
  };

  if (authLoading || loadingPitch || loadingFounder) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" /></div>;
  
  if (!user || !emailVerified) {
    router.push(user ? '/verify-email' : '/login');
    return null;
  }

  if (!pitch || !founder) return <div className="min-h-screen flex flex-col items-center justify-center gap-6"><div className="p-4 bg-destructive/10 rounded-full"><XCircle className="w-12 h-12 text-destructive" /></div><h2 className="text-2xl font-black">Startup Profile Not Found</h2><Link href="/pitches"><Button variant="outline" className="rounded-xl border-2">Return to Marketplace</Button></Link></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto py-12 px-6 w-full space-y-12">
        <Link href="/pitches" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit font-black text-xs uppercase tracking-widest group">
          <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to marketplace
        </Link>

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          <div className="lg:col-span-8 space-y-10">
            <Card className="border-none shadow-3xl overflow-hidden bg-white rounded-[3rem] relative">
              <div className="relative aspect-[21/10] w-full overflow-hidden bg-muted/30">
                {pitch.imageURL ? (
                  <Image src={pitch.imageURL} alt={pitch.startupName} fill className="object-cover transition-transform duration-1000 group-hover:scale-105" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/10 bg-gradient-to-br from-muted/50 to-muted">
                    <ImageIcon className="w-32 h-32" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-10 left-10 right-10 flex items-end justify-between gap-8">
                   <div className="space-y-5">
                    <Badge variant="outline" className="bg-black/40 backdrop-blur-md text-white border-white/20 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-2xl">
                      {pitch.category || pitch.industry || 'Other'}
                    </Badge>
                    <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none text-white drop-shadow-2xl">{pitch.startupName}</h1>
                   </div>
                   {founder.logoURL && (
                     <div className="w-28 h-28 bg-white/90 backdrop-blur-md p-4 rounded-[2rem] shadow-3xl shrink-0 hidden sm:flex items-center justify-center ring-4 ring-white/20">
                        <Image src={founder.logoURL} alt="Startup Logo" width={80} height={80} className="object-contain max-h-full" unoptimized />
                     </div>
                   )}
                </div>
              </div>

              <CardHeader className="p-12 pb-8 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-8 text-[10px] text-muted-foreground font-black uppercase tracking-[0.3em]">
                    <span className="flex items-center gap-2.5 px-4 py-2 bg-muted/40 rounded-full"><Clock className="w-4 h-4 text-primary" /> Active Opportunity</span>
                    <span className="flex items-center gap-2.5 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-full"><ShieldCheck className="w-4 h-4 text-emerald-600" /> Platform Verified</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {isOwner && profile?.role === 'startup' && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10 h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all"
                        onClick={handleDeletePitch}
                        disabled={checking}
                      >
                        {checking ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Archive Pitch
                      </Button>
                    )}
                    {isInvestor && (isInterested || (contactRequest && contactRequest.status === 'accepted')) && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-amber-600 border-amber-200 hover:bg-amber-50 h-12 px-6 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 shadow-sm transition-all"
                        onClick={handleResolveConnection}
                        disabled={resolving}
                      >
                        {resolving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                        Resolve Protocol
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-12 pt-0 space-y-12">
                <div className="p-10 bg-muted/20 rounded-[3rem] border-l-8 border-primary relative overflow-hidden shadow-inner">
                  <Sparkles className="absolute -right-6 -top-6 w-32 h-32 text-primary/5 -rotate-12" />
                  <p className="text-2xl md:text-4xl leading-relaxed text-foreground/90 font-medium italic relative z-10 tracking-tight">
                    &quot;{pitch.description}&quot;
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <div className="p-10 bg-primary shadow-2xl shadow-primary/20 rounded-[2.5rem] space-y-4 flex flex-col items-center text-center text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                    <div className="p-4 bg-white/20 rounded-2xl mb-2 backdrop-blur-md">
                      <DollarSign className="w-8 h-8" />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black opacity-70">Target Investment</p>
                    <p className="text-5xl font-black tracking-tighter">${pitch.fundingNeeded?.toLocaleString()}</p>
                  </div>
                  <div className="p-10 bg-white border-2 border-muted shadow-sm rounded-[2.5rem] space-y-4 flex flex-col items-center text-center group hover:border-primary/20 transition-all hover:shadow-xl">
                    <div className="p-4 bg-accent/10 rounded-2xl mb-2">
                      <Building2 className="w-8 h-8 text-accent" />
                    </div>
                    <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-black">Strategic Sector</p>
                    <p className="text-4xl font-black text-foreground tracking-tight">{pitch.category || pitch.industry || 'Other'}</p>
                  </div>
                </div>
              </CardContent>

              {isInvestor && (
                <CardFooter className="p-12 border-t bg-muted/5 flex flex-col sm:flex-row gap-8">
                   <div className="flex-[1.5] flex flex-col gap-4">
                     {!contactRequest ? (
                       <Button className="w-full h-20 text-xl font-black shadow-2xl shadow-primary/20 bg-primary hover:bg-primary/90 rounded-[1.5rem] transition-all active:scale-95" onClick={handleRequestContact}>
                         <Mail className="mr-4 w-7 h-7" /> Request Direct Inquiry
                       </Button>
                     ) : contactRequest.status === 'pending' ? (
                       <Button className="w-full h-20 text-xl font-black rounded-[1.5rem] bg-muted/50 border-2 border-dashed text-muted-foreground" variant="secondary" disabled>
                         <Clock className="mr-4 w-7 h-7 animate-pulse" /> Authentication Pending
                       </Button>
                     ) : contactRequest.status === 'accepted' ? (
                       <div className="flex gap-4 w-full">
                          <Button className="flex-1 h-20 text-lg font-black bg-emerald-600 hover:bg-emerald-700 shadow-2xl shadow-emerald-500/20 rounded-[1.5rem] transition-all active:scale-95" asChild>
                            <a href={`mailto:${pitch.contactEmail}`}>
                              <Mail className="mr-3 w-6 h-6" /> Email Founder
                            </a>
                          </Button>
                       </div>
                     ) : (
                       <Button className="w-full h-20 text-xl font-black rounded-[1.5rem] opacity-50" variant="outline" disabled>
                         <XCircle className="mr-4 w-7 h-7" /> Inquiry Denied
                       </Button>
                     )}
                   </div>

                   <Button 
                    className={`flex-1 h-20 text-xl font-black transition-all rounded-[1.5rem] shadow-2xl active:scale-95 ${isInterested ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20' : 'border-2 border-primary text-primary hover:bg-primary/5 shadow-primary/5'}`} 
                    onClick={handleShowInterest}
                    variant={isInterested ? "default" : "outline"}
                    disabled={isInterested}
                   >
                     {isInterested ? <><CheckCircle2 className="mr-3 w-7 h-7" /> Logged</> : <><Sparkles className="mr-3 w-7 h-7" /> Show Interest</>}
                   </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          <div className="lg:col-span-4 space-y-10">
            <Card className="border-none shadow-2xl bg-white overflow-hidden rounded-[2.5rem] hover:shadow-3xl transition-all duration-500">
              <CardHeader className="bg-primary/5 border-b py-10 px-10">
                <CardTitle className="text-xs font-black flex items-center gap-3 text-primary uppercase tracking-[0.3em]">
                  <User className="w-5 h-5" /> Executive Identity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="flex items-center gap-6 group">
                  <div className="w-24 h-24 bg-muted/30 rounded-[2rem] flex items-center justify-center border-4 border-white shadow-xl relative overflow-hidden transition-transform duration-500 group-hover:scale-105">
                    {founder.photoURL ? (
                      <Image src={founder.photoURL} alt={founder.name || 'Founder'} fill className="object-cover" />
                    ) : (
                      <User className="text-muted-foreground opacity-30 w-12 h-12" />
                    )}
                  </div>
                  <div className="space-y-1.5 overflow-hidden">
                    <h3 className="text-2xl font-black truncate text-foreground group-hover:text-primary transition-colors leading-none">{founder.name || 'Anonymous Founder'}</h3>
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-emerald-500 text-white rounded-full"><ShieldCheck className="w-3 h-3" /></div>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Verified Identity</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-primary rounded-full" /> Founder Background
                  </h4>
                  <p className="text-sm text-muted-foreground leading-relaxed italic p-8 bg-muted/20 rounded-[2rem] border-l-4 border-primary/20 shadow-inner">
                    &quot;{founder.bio || "This founder is currently leading innovation and strategic growth within the platform's top-tier venture ecosystem."}&quot;
                  </p>
                </div>

                <Link href={`/profile/${founder.id}`} className="block group">
                  <Button variant="outline" className="w-full h-14 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-primary hover:text-white group-active:scale-95 shadow-sm">
                    View Verified Credentials
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-none shadow-2xl bg-accent text-white overflow-hidden rounded-[2.5rem] p-12 relative group">
              <Sparkles className="absolute -right-8 -bottom-8 w-40 h-40 text-white/5 -rotate-12 transition-transform duration-700 group-hover:rotate-0 group-hover:scale-110" />
              <div className="space-y-8 relative z-10">
                <Badge className="bg-white/20 text-white border-none font-black uppercase text-[9px] tracking-[0.2em] px-5 py-2 rounded-xl shadow-lg">Network Security</Badge>
                <h3 className="text-3xl font-black tracking-tighter leading-none">Identity Assurance</h3>
                <p className="text-sm opacity-90 leading-relaxed font-medium italic border-l-2 border-white/20 pl-6">
                  &quot;CapFinder enforces preliminary verification protocols for all ventures to maintain high-trust institutional quality across the network.&quot;
                </p>
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-white w-2/3 shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
