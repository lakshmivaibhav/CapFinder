
"use client";

import { use, useState, useMemo } from 'react';
import { doc, collection, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Mail, MessageSquare, Clock, CheckCircle2, Bookmark, BookmarkCheck, Sparkles, XCircle, User, DollarSign, Building2, Trash2, Zap, LayoutGrid, Info, ShieldCheck, Image as ImageIcon } from 'lucide-react';
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

  // Fetch Pitch Data
  const pitchRef = useMemoFirebase(() => doc(db, 'pitches', id), [db, id]);
  const { data: pitch, isLoading: loadingPitch } = useDoc(pitchRef);

  // Fetch Founder Data (using ownerId from pitch)
  const founderRef = useMemoFirebase(() => {
    if (!pitch?.ownerId) return null;
    return doc(db, 'users', pitch.ownerId);
  }, [db, pitch?.ownerId]);
  const { data: founder, isLoading: loadingFounder } = useDoc(founderRef);

  const isInvestor = profile?.role === 'investor';
  const isOwner = user?.uid === pitch?.ownerId;

  // Interaction Queries
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
        <Link href="/pitches" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-all w-fit font-bold text-sm group">
          <div className="p-2 rounded-lg bg-muted group-hover:bg-primary/10 group-hover:text-primary transition-all">
            <ArrowLeft className="w-4 h-4" />
          </div>
          Back to marketplace
        </Link>

        <div className="grid lg:grid-cols-12 gap-12 items-start">
          {/* Main Content: Startup Details */}
          <div className="lg:col-span-8 space-y-8">
            <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-[2.5rem] relative">
              {/* Pitch Visual Hero */}
              <div className="relative aspect-[21/9] w-full overflow-hidden bg-muted">
                {pitch.imageURL ? (
                  <Image src={pitch.imageURL} alt={pitch.startupName} fill className="object-cover" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/20">
                    <ImageIcon className="w-20 h-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-8 left-10 right-10">
                   <Badge className="bg-primary text-white border-none px-6 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl mb-4">
                    {pitch.category || pitch.industry || 'Other'}
                  </Badge>
                  <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[1.1] text-white">{pitch.startupName}</h1>
                </div>
              </div>

              <CardHeader className="p-10 pb-6 space-y-8">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-6 text-[10px] text-muted-foreground font-black uppercase tracking-[0.2em]">
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary" /> Active Engagement</span>
                    <span className="flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-accent" /> Verified Venture</span>
                  </div>
                  {isInvestor && (isInterested || (contactRequest && contactRequest.status === 'accepted')) && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-amber-600 border-amber-200 hover:bg-amber-50 h-10 px-4 rounded-xl font-bold border-2"
                      onClick={handleResolveConnection}
                      disabled={resolving}
                    >
                      {resolving ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                      Resolve Connection
                    </Button>
                  )}
                </div>
              </CardHeader>

              <CardContent className="p-10 pt-0 space-y-12">
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
                    <p className="text-[10px] uppercase tracking-widest font-black opacity-80">Target Funding</p>
                    <p className="text-4xl font-black">${pitch.fundingNeeded?.toLocaleString()}</p>
                  </div>
                  <div className="p-8 bg-white border-2 border-muted shadow-sm rounded-3xl space-y-3 flex flex-col items-center text-center">
                    <div className="p-3 bg-accent/10 rounded-2xl mb-2">
                      <Building2 className="w-6 h-6 text-accent" />
                    </div>
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-black">Market Sector</p>
                    <p className="text-3xl font-black text-foreground">{pitch.category || pitch.industry || 'Other'}</p>
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

          {/* Sidebar: Founder Identity */}
          <div className="lg:col-span-4 space-y-8">
            <Card className="border-none shadow-xl bg-white overflow-hidden rounded-[2rem]">
              <CardHeader className="bg-primary/5 border-b py-8 px-10">
                <CardTitle className="text-xs font-black flex items-center gap-3 text-primary uppercase tracking-widest">
                  <User className="w-5 h-5" /> Startup Founder
                </CardTitle>
              </CardHeader>
              <CardContent className="p-10 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-muted/30 rounded-[1.5rem] flex items-center justify-center border-2 border-white shadow-inner relative overflow-hidden">
                    {founder.photoURL ? (
                      <Image src={founder.photoURL} alt={founder.name || 'Founder'} fill className="object-cover" />
                    ) : (
                      <User className="text-muted-foreground opacity-30 w-12 h-12" />
                    )}
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-xl font-black truncate max-w-[180px]">{founder.name || 'Anonymous Founder'}</h3>
                    <div className="flex items-center gap-2">
                      {founder.verified && <Badge className="bg-emerald-500 text-white border-none p-1 rounded-full"><ShieldCheck className="w-3 h-3" /></Badge>}
                      <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">{founder.verified ? 'Verified Identity' : 'Member Identity'}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">About the Founder</h4>
                  <p className="text-sm text-muted-foreground leading-relaxed italic p-6 bg-muted/20 rounded-2xl border-l-2 border-primary/20">
                    &quot;{founder.bio || "This founder is currently leading innovation and strategic growth within the CapFinder network."}&quot;
                  </p>
                </div>

                <Link href={`/profile/${founder.id}`} className="block">
                  <Button variant="outline" className="w-full h-12 rounded-xl border-2 font-bold hover:bg-primary/5">
                    View Full Founder Profile
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="border-none shadow-xl bg-accent text-white overflow-hidden rounded-[2rem] p-10 relative">
              <Sparkles className="absolute -right-6 -bottom-6 w-32 h-32 text-white/5 -rotate-12" />
              <div className="space-y-6 relative z-10">
                <Badge className="bg-white/20 text-white border-none font-black uppercase text-[9px] tracking-widest px-4 py-1">Venture Integrity</Badge>
                <h3 className="text-2xl font-black tracking-tight">Identity Assurance</h3>
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
