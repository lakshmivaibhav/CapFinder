"use client";

import { use, useState, useMemo } from 'react';
import { doc, collection, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Mail, Clock, CheckCircle2, Bookmark, BookmarkCheck, Sparkles, XCircle, User, DollarSign, Building2, Trash2, Zap, LayoutGrid, Info, ShieldCheck, Image as ImageIcon, Wallet, PieChart, FastForward, Target, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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
  const barColor = maturityIndex >= 8 ? "bg-emerald-400" : maturityIndex >= 5 ? "bg-amber-400" : "bg-red-400";
  
  const scoreBadgeStyles = maturityIndex >= 8 
    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" 
    : maturityIndex >= 5 
      ? "bg-amber-500/20 text-amber-400 border-amber-500/30" 
      : "bg-red-500/20 text-red-400 border-red-500/30";

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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <Link href="/pitches" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit font-black text-xs uppercase tracking-widest group">
            <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-all">
              <ArrowLeft className="w-4 h-4" />
            </div>
            Back to marketplace
          </Link>
          <div className="flex items-center gap-4">
            {isOwner && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="text-destructive hover:bg-destructive/10 h-10 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all"
                onClick={handleDeletePitch}
                disabled={checking}
              >
                {checking ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                Archive
              </Button>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <section className="relative rounded-[3rem] overflow-hidden shadow-3xl bg-white group">
          <div className="relative aspect-[21/10] w-full overflow-hidden">
            {pitch.imageURL ? (
              <Image src={pitch.imageURL} alt={pitch.startupName} fill className="object-cover transition-transform duration-1000 group-hover:scale-105" unoptimized />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/10 bg-gradient-to-br from-muted/50 to-muted">
                <ImageIcon className="w-32 h-32" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-10 md:p-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div className="space-y-6 max-w-4xl">
                <div className="flex flex-wrap items-center gap-4">
                  <Badge variant="outline" className="bg-primary/20 backdrop-blur-md text-white border-white/30 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl shadow-2xl">
                    {pitch.category || pitch.industry || 'Venture'}
                  </Badge>
                  <Badge className="bg-emerald-500/20 backdrop-blur-md text-emerald-400 border-emerald-500/30 px-6 py-2 text-[10px] font-black uppercase tracking-[0.2em] rounded-xl">
                    <ShieldCheck className="w-4 h-4 mr-2" /> Authenticated
                  </Badge>
                </div>
                <h1 className="text-5xl md:text-8xl font-black tracking-tighter leading-none text-white drop-shadow-2xl">
                  {pitch.startupName}
                </h1>

                {/* Investor Maturity Card (Premium) */}
                <div className="mt-8 flex flex-col gap-8 p-10 rounded-[2.5rem] bg-white/10 backdrop-blur-xl border border-white/20 w-fit min-w-[360px] shadow-2xl shadow-black/20">
                  <div className="flex items-center gap-10">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Investor Score</p>
                      <div className="flex items-end gap-2">
                        <span className="text-4xl md:text-5xl font-black text-white">{maturityIndex}</span>
                        <span className="text-xl font-bold text-white/40 mb-1">/ 10</span>
                      </div>
                    </div>
                    <div className="h-12 w-[1px] bg-white/10" />
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">Quality Rating</p>
                      <div className={cn(
                        "px-4 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-[0.1em] inline-block shadow-md",
                        scoreBadgeStyles
                      )}>
                        {scoreLabel}
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="w-full bg-white/10 h-2 md:h-2.5 rounded-full overflow-hidden">
                    <div 
                      className={cn(
                        "h-full transition-all duration-1000 ease-out",
                        barColor
                      )}
                      style={{ width: `${maturityIndex * 10}%` }}
                    />
                  </div>

                  {/* Score Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4 pt-8 border-t border-white/10">
                    {breakdown.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-4">
                        {item.met ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-400 shrink-0" />
                        )}
                        <span className={cn(
                          "text-[11px] font-black uppercase tracking-widest",
                          item.met ? "text-white/80" : "text-red-400"
                        )}>
                          {item.met ? item.label : item.missingLabel}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] font-medium text-white/40 italic mt-2 border-t border-white/5 pt-4">This score is based on completeness and clarity of the pitch.</p>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-xl p-10 rounded-[2.5rem] border border-white/20 shadow-2xl min-w-[320px] text-center space-y-2 self-start md:self-end">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/60">Target Capital</p>
                <p className="text-5xl font-black text-white tracking-tighter">
                  ${pitch.fundingNeeded?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-12">
            
            {/* About Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                Venture Intelligence
              </h2>
              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-12">
                  <p className="text-2xl md:text-3xl leading-relaxed text-foreground/90 font-medium italic border-l-8 border-primary pl-10 shadow-inner p-10 bg-muted/10 rounded-3xl">
                    &quot;{pitch.description}&quot;
                  </p>
                </CardContent>
              </Card>
            </section>

            {/* Commitment Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-amber-100 flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-amber-600" />
                </div>
                Founder Commitment
              </h2>
              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-amber-50/50 border border-amber-100 relative overflow-hidden">
                <CardContent className="p-12 space-y-8 relative z-10">
                  {pitch.founderInvestment && Number(pitch.founderInvestment) > 0 ? (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.3em] text-amber-600/60">Equity Contribution</p>
                      <p className="text-6xl font-black text-amber-700 tracking-tighter">
                        ${Number(pitch.founderInvestment).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-500/20 px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest">No Direct Capital Contribution</Badge>
                      <div className="space-y-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Strategic Rationale</p>
                        <p className="text-xl text-foreground/80 font-medium italic leading-relaxed border-l-4 border-amber-200 pl-8 bg-white/50 p-8 rounded-2xl">
                          {pitch.noInvestmentReason || "No rationale provided for investment status."}
                        </p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </section>

            {/* Allocation Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-emerald-600" />
                </div>
                Capital Allocation Roadmap
              </h2>
              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-12">
                  <div className="space-y-8">
                    <p className="text-xl text-muted-foreground leading-relaxed font-medium">
                      Deployment strategy for the <span className="text-foreground font-black">${pitch.fundingNeeded?.toLocaleString()}</span> target capital:
                    </p>
                    <div className="p-10 bg-emerald-50 rounded-[2rem] border border-emerald-100 italic text-xl leading-relaxed text-emerald-900/80 shadow-inner">
                      {pitch.fundUsage || "Detailed allocation breakdown is restricted to authenticated strategic partners."}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>

            {/* Vision Section */}
            <section className="space-y-6">
              <h2 className="text-3xl font-black tracking-tight flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <FastForward className="w-6 h-6 text-primary" />
                </div>
                Venture Scaling & Vision
              </h2>
              <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
                <CardContent className="p-12">
                  <div className="space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">Long-Term Strategic Outlook</p>
                    <div className="p-12 bg-muted/20 rounded-[3rem] italic text-3xl leading-relaxed text-foreground/80 border-l-8 border-primary shadow-inner">
                      &quot;{pitch.longTermVision || "Strategic scaling roadmap is restricted to verified network members."}&quot;
                    </div>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {/* Sidebar Column */}
          <div className="lg:col-span-4 space-y-10 sticky top-32">
            
            {/* Engagement Action Card */}
            <Card className="border-none shadow-3xl bg-primary text-white rounded-[3rem] overflow-hidden relative group transition-all hover:scale-[1.02]">
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-150 transition-transform duration-1000" />
              <CardHeader className="p-12 pb-6 relative z-10">
                <CardTitle className="text-3xl font-black tracking-tight">Initiate Engagement</CardTitle>
                <p className="text-white/70 text-sm mt-2 font-medium">Authenticate your intent to access the venture data room and founder dialogue.</p>
              </CardHeader>
              <CardContent className="p-12 pt-0 space-y-6 relative z-10">
                {isInvestor ? (
                  <div className="space-y-4">
                    {!contactRequest ? (
                      <Button 
                        className="w-full h-20 bg-white text-primary hover:bg-white/90 rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all" 
                        onClick={handleRequestContact}
                      >
                        <Mail className="mr-4 w-6 h-6" /> Request Direct Inquiry
                      </Button>
                    ) : contactRequest.status === 'pending' ? (
                      <Button className="w-full h-20 rounded-2xl bg-white/20 text-white border-2 border-white/30 border-dashed font-black uppercase tracking-widest text-sm" disabled>
                        <Clock className="mr-4 w-6 h-6 animate-pulse" /> Identity Protocol Active
                      </Button>
                    ) : contactRequest.status === 'accepted' ? (
                      <Link href="/messages" className="block">
                        <Button className="w-full h-20 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-sm shadow-2xl active:scale-95 transition-all">
                          <Zap className="mr-4 w-6 h-6" /> Enter Secure Hub
                        </Button>
                      </Link>
                    ) : (
                      <Button className="w-full h-20 rounded-2xl opacity-50 bg-red-500/20 text-red-200 border-2 border-red-500/30 font-black uppercase tracking-widest text-sm" disabled>
                        <XCircle className="mr-4 w-6 h-6" /> Inquiry Declined
                      </Button>
                    )}

                    <Button 
                      className={cn(
                        "w-full h-20 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-95 shadow-xl",
                        isInterested 
                          ? "bg-emerald-500/20 text-white border-2 border-emerald-500/40" 
                          : "bg-white/10 hover:bg-white/20 text-white border-2 border-white/20"
                      )} 
                      onClick={handleShowInterest}
                      disabled={isInterested}
                    >
                      {isInterested ? <><CheckCircle2 className="mr-3 w-6 h-6" /> Interest Authenticated</> : <><Sparkles className="mr-3 w-6 h-6" /> Register Strategic Interest</>}
                    </Button>

                    {(isInterested || (contactRequest && contactRequest.status === 'accepted')) && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="w-full text-white/50 hover:text-white hover:bg-white/10 h-12 font-black uppercase tracking-widest text-[10px]"
                        onClick={handleResolveConnection}
                        disabled={resolving}
                      >
                        {resolving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : "Resolve Engagement Status"}
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-8 bg-white/10 rounded-3xl border border-white/20 text-center space-y-4">
                    <p className="text-[10px] font-black uppercase text-white/80 tracking-widest">Protocol Restriction</p>
                    <p className="text-sm text-white/60 font-medium italic leading-relaxed">Direct engagement is restricted to verified capital partner accounts only.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Founder Summary */}
            <Card className="border-none shadow-2xl bg-white rounded-[3rem] overflow-hidden">
              <CardHeader className="bg-muted/30 border-b p-10">
                <CardTitle className="text-xs font-black flex items-center gap-3 text-primary uppercase tracking-[0.3em]">
                  <User className="w-5 h-5" /> Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-10">
                <div className="flex items-center gap-6 group">
                  <div className="w-20 h-20 bg-muted/30 rounded-2xl flex items-center justify-center border-2 border-muted shadow-inner relative overflow-hidden transition-transform duration-500 group-hover:scale-105">
                    {founder.photoURL ? (
                      <Image src={founder.photoURL} alt={founder.name || 'Founder'} fill className="object-cover" />
                    ) : (
                      <User className="text-muted-foreground opacity-30 w-10 h-10" />
                    )}
                  </div>
                  <div className="space-y-1.5 overflow-hidden">
                    <h3 className="text-2xl font-black truncate text-foreground group-hover:text-primary transition-colors leading-none">{founder.name || 'Incognito Founder'}</h3>
                    <div className="flex items-center gap-2">
                      <div className="p-1 bg-emerald-500 text-white rounded-full"><ShieldCheck className="w-3 h-3" /></div>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">Verified ID</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <p className="text-[10px] uppercase font-black text-muted-foreground tracking-[0.2em]">Background Profile</p>
                  <p className="text-sm text-muted-foreground leading-relaxed italic p-8 bg-muted/20 rounded-[2rem] border-l-4 border-primary/20 shadow-inner">
                    &quot;{founder.bio || "Founder professional background is restricted to active inquiry phases within the verified ecosystem."}&quot;
                  </p>
                </div>
                <Link href={`/profile/${founder.id}`} className="block group">
                  <Button variant="outline" className="w-full h-14 rounded-2xl border-2 font-black uppercase tracking-widest text-[10px] transition-all hover:bg-primary hover:text-white active:scale-95 shadow-sm">
                    Analyze Verified Credentials
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Platform Security */}
            <div className="p-12 bg-accent text-white rounded-[3rem] shadow-2xl relative overflow-hidden group">
              <Sparkles className="absolute -right-8 -bottom-8 w-48 h-48 text-white/10 -rotate-12 transition-transform duration-1000 group-hover:rotate-0" />
              <div className="relative z-10 space-y-8">
                <Badge className="bg-white/20 text-white border-none font-black uppercase text-[10px] px-6 py-2 rounded-xl">Trust Protocol v2.4</Badge>
                <h3 className="text-3xl font-black tracking-tighter leading-none">Security Standard</h3>
                <p className="text-sm opacity-90 leading-relaxed font-medium italic border-l-2 border-white/30 pl-6">
                  &quot;CapFinder enforces preliminary verification protocols for all ventures to maintain high-trust institutional quality across the entire strategic network.&quot;
                </p>
                <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                   <div className="h-full bg-white w-2/3 shadow-[0_0_20px_rgba(255,255,255,0.6)]" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
