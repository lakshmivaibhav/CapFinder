"use client";

import { use, useState, useMemo } from 'react';
import { doc, collection, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Mail, Clock, CheckCircle2, Bookmark, BookmarkCheck, Sparkles, XCircle, User, DollarSign, Building2, Trash2, LayoutGrid, Info, ShieldCheck, Image as ImageIcon, Wallet, PieChart, FastForward, Zap, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function PitchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const router = useRouter();
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

  const maturityIndex = useMemo(() => {
    if (!pitch) return 0;
    let score = 0;
    
    if (pitch.founderInvestment && Number(pitch.founderInvestment) > 0) {
      score += 2;
    } else if (pitch.noInvestmentReason && pitch.noInvestmentReason.length > 0) {
      score += 1;
    }

    if (pitch.fundUsage && pitch.fundUsage.length > 20) {
      score += 2;
    }

    if (pitch.longTermVision && pitch.longTermVision.length > 20) {
      score += 2;
    }

    if (pitch.description && pitch.description.length > 50) {
      score += 1;
    }

    if (pitch.startupName && (pitch.category || pitch.industry) && pitch.fundingNeeded) {
      score += 1;
    }

    return parseFloat(((score / 8) * 10).toFixed(1));
  }, [pitch]);

  const scoreLabel = maturityIndex >= 8 ? "Strong" : maturityIndex >= 5 ? "Moderate" : "Needs Improvement";
  const scoreColor = maturityIndex >= 8 ? "text-emerald-400" : maturityIndex >= 5 ? "text-amber-400" : "text-red-400";

  const breakdown = useMemo(() => {
    if (!pitch) return [];
    return [
      { 
        label: "Founder Commitment", 
        met: (pitch.founderInvestment && Number(pitch.founderInvestment) > 0) || (pitch.noInvestmentReason && pitch.noInvestmentReason.length > 0),
        missingLabel: "Missing Founder Investment"
      },
      { 
        label: "Fund Usage", 
        met: pitch.fundUsage && pitch.fundUsage.length > 20,
        missingLabel: "Weak Fund Allocation Plan"
      },
      { 
        label: "Vision", 
        met: pitch.longTermVision && pitch.longTermVision.length > 20,
        missingLabel: "Weak Long-Term Vision"
      },
      { 
        label: "Description", 
        met: pitch.description && pitch.description.length > 50,
        missingLabel: "Brief Narrative"
      }
    ];
  }, [pitch]);

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

  const handleToggleFavorite = () => {
    if (!user || !pitch) return;
    if (isFavorited) {
      const existingFav = favorites?.find(f => f.pitchId === pitch.id);
      if (existingFav) deleteDocumentNonBlocking(doc(db, 'favorites', existingFav.id));
      toast({ title: "Removed from saved" });
    } else {
      addDocumentNonBlocking(collection(db, 'favorites'), {
        pitchId: pitch.id,
        investorId: user.uid,
        startupName: pitch.startupName,
        industry: pitch.category || pitch.industry || 'Other',
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

      if (confirm("Confirm PERMANENT deletion of this pitch? This action cannot be undone.")) {
        deleteDocumentNonBlocking(doc(db, 'pitches', pitch.id));
        toast({ title: "Venture Deleted", description: "Your pitch has been removed from the ecosystem." });
        router.push('/dashboard');
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error", description: "Database authentication failed." });
    } finally {
      setChecking(false);
    }
  };

  if (loadingPitch || authLoading) return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" /></div>;
  if (!pitch) return <div className="min-h-screen flex flex-col items-center justify-center gap-6"><div className="p-4 bg-destructive/10 rounded-full"><XCircle className="w-12 h-12 text-destructive" /></div><h2 className="text-2xl font-black">Venture Not Found</h2><Link href="/pitches"><Button variant="outline" className="rounded-xl border-2 uppercase font-black tracking-widest text-[10px] h-12 px-8">Return to Marketplace</Button></Link></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto py-6 md:py-12 px-4 md:px-6 w-full space-y-8 md:space-y-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link href="/pitches" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit font-black text-[10px] uppercase tracking-widest group">
            <div className="p-1.5 md:p-2 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to Marketplace
          </Link>
          <div className="flex items-center gap-4">
            {isOwner && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:bg-destructive/10 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest"
                onClick={handleDeletePitch}
                disabled={checking}
              >
                {checking ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Archive Pitch
              </Button>
            )}
            {isInvestor && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleToggleFavorite} 
                className={cn(
                  "h-10 w-10 rounded-xl transition-all shadow-sm border",
                  isFavorited ? "text-accent bg-accent/5 border-accent/20" : "text-muted-foreground hover:text-accent border-muted/20 bg-white"
                )}
              >
                {isFavorited ? <BookmarkCheck className="w-5 h-5 fill-current" /> : <Bookmark className="w-5 h-5" />}
              </Button>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative rounded-[2.5rem] overflow-hidden shadow-2xl bg-white group">
          <div className="relative aspect-[16/9] md:aspect-[24/9] w-full overflow-hidden">
            {pitch.imageURL ? (
              <Image src={pitch.imageURL} alt={pitch.startupName} fill className="object-cover transition-transform duration-1000 group-hover:scale-105" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/10 bg-gradient-to-br from-muted/50 to-muted">
                <ImageIcon className="w-32 h-32" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-6 max-w-4xl">
                <div className="flex flex-wrap items-center gap-4">
                  <Badge variant="outline" className="bg-primary/20 backdrop-blur-md text-white border-white/30 px-5 py-2 font-black uppercase tracking-[0.2em] text-[10px] rounded-lg">
                    {pitch.category || pitch.industry || 'Venture'}
                  </Badge>
                  <Badge className="bg-emerald-500/20 backdrop-blur-md text-emerald-400 border-emerald-500/30 px-5 py-2 font-black uppercase tracking-[0.2em] text-[10px] rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5 mr-2" /> Verified ID
                  </Badge>
                </div>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-white drop-shadow-2xl">
                  {pitch.startupName}
                </h1>
                
                {/* Investor Score display */}
                <div className="mt-8 flex flex-col gap-6 p-8 rounded-[2rem] bg-white/5 backdrop-blur-sm border border-white/10 w-fit">
                  <div className="flex items-center gap-8">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Investor Score</p>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl font-black text-white">{maturityIndex}</span>
                        <span className="text-xl font-bold text-white/40 mb-1">/ 10</span>
                      </div>
                    </div>
                    <div className="h-10 w-[1px] bg-white/10" />
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Quality Rating</p>
                      <p className={cn("text-xl font-black uppercase tracking-tighter", scoreColor)}>
                        {scoreLabel}
                      </p>
                    </div>
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 pt-6 border-t border-white/10">
                    {breakdown.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        {item.met ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        )}
                        <span className={cn(
                          "text-[10px] font-black uppercase tracking-widest",
                          item.met ? "text-white/80" : "text-red-400"
                        )}>
                          {item.met ? item.label : item.missingLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/20 shadow-2xl min-w-[280px] text-center space-y-2 self-start md:self-end">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Target Capital</p>
                <p className="text-4xl md:text-5xl font-black text-white tracking-tighter">
                  ${pitch.fundingNeeded?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          {/* Main Content */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* About Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
                Venture Intelligence
              </h2>
              <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                <CardContent className="p-10">
                  <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 font-medium italic border-l-8 border-primary/20 pl-8">
                    &quot;{pitch.description}&quot;
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Founder Commitment Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-600" />
                </div>
                Founder Commitment
              </h2>
              <Card className="border-none shadow-xl rounded-[2rem] bg-amber-50/50 border border-amber-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-5">
                  <Wallet className="w-32 h-32 text-amber-600" />
                </div>
                <CardContent className="p-10 space-y-6 relative z-10">
                  {pitch.founderInvestment && Number(pitch.founderInvestment) > 0 ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-amber-600/60">Personal Capital Injected</p>
                      <p className="text-5xl font-black text-amber-700 tracking-tighter">
                        ${Number(pitch.founderInvestment).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex items-center gap-3">
                        <Badge variant="destructive" className="bg-red-500 text-white rounded-lg px-4 py-1 font-black text-[10px] uppercase">No Direct Investment</Badge>
                      </div>
                      <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Rationale</p>
                        <p className="text-lg text-foreground/70 font-medium italic leading-relaxed border-l-4 border-amber-200 pl-6">
                          {pitch.noInvestmentReason || "No rationale provided for lack of personal capital commitment."}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Fund Usage Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <PieChart className="w-5 h-5 text-emerald-600" />
                </div>
                Capital Allocation Strategy
              </h2>
              <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                <CardContent className="p-10">
                  <div className="space-y-6">
                    <p className="text-lg text-muted-foreground leading-relaxed font-medium">
                      The requested investment of <span className="text-foreground font-black">${pitch.fundingNeeded?.toLocaleString()}</span> will be distributed according to the following deployment roadmap:
                    </p>
                    <div className="p-8 bg-emerald-50/30 rounded-3xl border border-emerald-100 italic text-lg leading-relaxed text-emerald-900/80">
                      {pitch.fundUsage || "Allocation details are restricted to authenticated partners during inquiry phases."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Vision Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FastForward className="w-5 h-5 text-primary" />
                </div>
                Vision & Scaling Roadmap
              </h2>
              <Card className="border-none shadow-xl rounded-[2rem] bg-white overflow-hidden">
                <CardContent className="p-10 space-y-8">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Strategic Outlook (3–10 Years)</p>
                    <div className="p-10 bg-muted/20 rounded-[2.5rem] italic text-2xl leading-relaxed text-foreground/80 border-l-8 border-primary shadow-inner">
                      &quot;{pitch.longTermVision || "Roadmap details restricted to verified institutional partners."}&quot;
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-4 space-y-10 sticky top-32">
            
            {/* Action Card */}
            <Card className="border-none shadow-2xl bg-primary rounded-[2.5rem] overflow-hidden relative group transition-all hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-150 transition-transform duration-700" />
              <CardHeader className="p-10 pb-4 relative z-10">
                <CardTitle className="text-2xl font-black text-white tracking-tight">Initiate Engagement</CardTitle>
                <p className="text-white/70 text-xs font-medium">Connect with the founders to access detailed financial metrics and term sheets.</p>
              </CardHeader>
              <CardContent className="p-10 pt-6 space-y-6 relative z-10">
                {isInvestor ? (
                  <div className="space-y-4">
                    {!contactRequest ? (
                      <Button 
                        className="w-full h-16 bg-white text-primary hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all" 
                        onClick={handleRequestContact}
                      >
                        <Mail className="mr-3 w-5 h-5" /> Request Full Inquiry
                      </Button>
                    ) : contactRequest.status === 'pending' ? (
                      <Button className="w-full h-16 rounded-2xl bg-white/20 text-white border-2 border-white/30 border-dashed font-black uppercase tracking-widest text-xs" disabled>
                        <Clock className="mr-3 w-5 h-5 animate-pulse" /> Identity Syncing
                      </Button>
                    ) : contactRequest.status === 'accepted' ? (
                      <Link href="/messages" className="block">
                        <Button className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all">
                          <Zap className="mr-3 w-5 h-5" /> Enter Secure Hub
                        </Button>
                      </Link>
                    ) : (
                      <Button className="w-full h-16 rounded-2xl opacity-50 bg-red-500/20 text-red-200 border-2 border-red-500/30 font-black uppercase tracking-widest text-xs" disabled>
                        <XCircle className="mr-3 w-5 h-5" /> Access Restricted
                      </Button>
                    )}

                    <Button 
                      className={cn(
                        "w-full h-16 rounded-2xl font-black uppercase tracking-widest text-xs transition-all active:scale-95",
                        isInterested 
                          ? "bg-emerald-500/30 text-white border-2 border-emerald-500/50" 
                          : "bg-white/10 hover:bg-white/20 text-white border-2 border-white/20"
                      )} 
                      onClick={handleShowInterest}
                      disabled={isInterested}
                    >
                      {isInterested ? <><CheckCircle2 className="mr-2 w-5 h-5" /> Interest Logged</> : <><Sparkles className="mr-2 w-5 h-5" /> Log Interest</>}
                    </Button>

                    {(isInterested || (contactRequest && contactRequest.status === 'accepted')) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-white/60 hover:text-white hover:bg-white/10 h-10 font-black uppercase tracking-widest text-[9px]"
                        onClick={handleResolveConnection}
                        disabled={resolving}
                      >
                        {resolving ? <Loader2 className="animate-spin w-3 h-3 mr-2" /> : "Resolve Engagement Protocol"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-6 bg-white/10 rounded-2xl border border-white/20 text-center">
                    <p className="text-[10px] font-black uppercase text-white/80 tracking-widest">Inquiry Blocked</p>
                    <p className="text-xs text-white/60 mt-2">Only verified investor accounts can initiate direct contact requests.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Identity Card */}
            <Card className="border-none shadow-xl bg-white rounded-[2.5rem] overflow-hidden">
              <CardHeader className="bg-muted/30 border-b p-8">
                <CardTitle className="text-[10px] font-black flex items-center gap-3 text-muted-foreground uppercase tracking-[0.2em]">
                  <User className="w-4 h-4" /> Venture Management
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 space-y-8">
                <div className="flex items-center gap-4 group">
                  <div className="w-16 h-16 bg-primary/5 rounded-2xl flex items-center justify-center border-2 border-primary/10 relative overflow-hidden transition-transform duration-500 group-hover:scale-105 shadow-inner">
                    <User className="w-8 h-8 text-primary opacity-30" />
                  </div>
                  <div className="space-y-1 overflow-hidden">
                    <h3 className="text-xl font-black truncate text-foreground group-hover:text-primary transition-colors">Venture Principal</h3>
                    <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Verified Member</p>
                  </div>
                </div>
                <div className="p-6 bg-muted/20 rounded-2xl border-l-4 border-primary/20 italic text-sm text-muted-foreground leading-relaxed">
                  Founder history and syndicate benchmarks are available within the secure inquiry channel for verified partners.
                </div>
                <Link href={`/profile/${pitch.ownerId}`} className="block">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-primary hover:text-white">
                    Analyze Identity
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Security Notice */}
            <div className="p-10 bg-accent text-white rounded-[2.5rem] shadow-xl relative overflow-hidden group">
              <Sparkles className="absolute -right-6 -bottom-6 w-32 h-32 text-white/10 -rotate-12 transition-transform duration-700 group-hover:rotate-0" />
              <div className="relative z-10 space-y-4">
                <Badge className="bg-white/20 text-white border-none font-black uppercase text-[9px] px-4 py-1 rounded-lg">Trust Protocol</Badge>
                <h3 className="text-xl font-black tracking-tight">Ecosystem Assurance</h3>
                <p className="text-xs opacity-80 leading-relaxed italic border-l-2 border-white/30 pl-4">
                  "CapFinder ensures venture integrity through preliminary verification. All strategic communications are isolated and encrypted."
                </p>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
