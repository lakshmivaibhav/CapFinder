
"use client";

import { use, useEffect, useState } from 'react';
import { doc, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Mail, MessageSquare, TrendingUp, Globe, Clock, CheckCircle2, Bookmark, BookmarkCheck, Sparkles, XCircle, User, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function PitchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();

  // 1. Fetch Pitch Data
  const pitchRef = useMemoFirebase(() => doc(db, 'pitches', id), [db, id]);
  const { data: pitch, isLoading: loadingPitch } = useDoc(pitchRef);

  // 2. Fetch Owner Profile Data (Wait for pitch to load)
  const ownerRef = useMemoFirebase(() => pitch ? doc(db, 'users', pitch.ownerId) : null, [db, pitch]);
  const { data: ownerProfile, isLoading: loadingOwner } = useDoc(ownerRef);

  // 3. Subscription logic for investor interactions
  const interestsQuery = useMemoFirebase(() => {
    if (!user || profile?.role !== 'investor') return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, profile, id]);
  const { data: interests } = useCollection(interestsQuery);
  const isInterested = interests && interests.length > 0;

  const favoritesQuery = useMemoFirebase(() => {
    if (!user || profile?.role !== 'investor') return null;
    return query(collection(db, 'favorites'), where('investorId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, profile, id]);
  const { data: favorites } = useCollection(favoritesQuery);
  const isFavorited = favorites && favorites.length > 0;

  const contactRequestsQuery = useMemoFirebase(() => {
    if (!user || profile?.role !== 'investor') return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, profile, id]);
  const { data: contactRequests } = useCollection(contactRequestsQuery);
  const contactRequest = contactRequests?.[0];

  // Actions
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
      deleteDocumentNonBlocking(doc(db, 'favorites', favorites![0].id));
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

  if (loadingPitch || authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;
  if (!pitch) return <div className="p-20 text-center font-bold">Pitch not found.</div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-5xl mx-auto py-10 px-6 w-full space-y-8">
        <Link href="/pitches" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>

        <div className="grid md:grid-cols-12 gap-8">
          {/* Main Content */}
          <div className="md:col-span-8 space-y-6">
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="p-8 pb-4">
                <div className="flex items-center justify-between mb-4">
                  <Badge variant="outline" className="text-primary border-primary/20 bg-primary/5 px-3 py-1">
                    {pitch.industry}
                  </Badge>
                  {profile?.role === 'investor' && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={handleToggleFavorite} 
                      className={`h-10 w-10 rounded-full ${isFavorited ? "text-accent bg-accent/5" : "text-muted-foreground hover:text-accent"}`}
                    >
                      {isFavorited ? <BookmarkCheck className="w-6 h-6 fill-current" /> : <Bookmark className="w-6 h-6" />}
                    </Button>
                  )}
                </div>
                <CardTitle className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2">
                  {pitch.startupName}
                </CardTitle>
                <div className="flex items-center gap-4 text-xs text-muted-foreground font-medium uppercase tracking-widest">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Posted {pitch.createdAt?.toDate ? pitch.createdAt.toDate().toLocaleDateString() : 'Recently'}</span>
                </div>
              </CardHeader>
              <CardContent className="p-8 pt-4 space-y-8">
                <div className="p-8 bg-muted/30 rounded-3xl italic text-xl md:text-2xl leading-relaxed text-foreground/80 border-l-4 border-primary">
                  &quot;{pitch.description}&quot;
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="p-6 bg-primary/5 rounded-2xl space-y-2 border border-primary/10">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                      <TrendingUp className="w-4 h-4" /> Funding Goal
                    </p>
                    <p className="text-3xl font-black text-primary">
                      ${typeof pitch.fundingNeeded === 'number' ? pitch.fundingNeeded.toLocaleString() : pitch.fundingNeeded}
                    </p>
                  </div>
                  <div className="p-6 bg-accent/5 rounded-2xl space-y-2 border border-accent/10">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-bold flex items-center gap-2">
                      <Globe className="w-4 h-4" /> Industry
                    </p>
                    <p className="text-3xl font-black text-accent">{pitch.industry}</p>
                  </div>
                </div>
              </CardContent>
              {profile?.role === 'investor' && (
                <CardFooter className="p-8 pt-0 flex flex-col sm:flex-row gap-4 border-t mt-4 bg-muted/5">
                   {/* Contact Button Logic */}
                   {!contactRequest ? (
                     <Button className="flex-1 h-14 text-lg shadow-lg" onClick={handleRequestContact}>
                       <Mail className="mr-2 w-5 h-5" /> Request Contact
                     </Button>
                   ) : contactRequest.status === 'pending' ? (
                     <Button className="flex-1 h-14 text-lg" variant="secondary" disabled>
                       <Clock className="mr-2 w-5 h-5 animate-pulse" /> Pending Approval
                     </Button>
                   ) : contactRequest.status === 'accepted' ? (
                     <div className="flex-1 flex gap-2">
                        <Button className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700 shadow-md" asChild>
                          <a href={`mailto:${pitch.contactEmail}`}>
                            <Mail className="mr-2 w-5 h-5" /> Email Founder
                          </a>
                        </Button>
                        <Button className="flex-1 h-14 text-lg shadow-md" asChild>
                          <Link href="/messages">
                            <MessageSquare className="mr-2 w-5 h-5" /> Chat Now
                          </Link>
                        </Button>
                     </div>
                   ) : (
                     <Button className="flex-1 h-14 text-lg" variant="outline" disabled>
                       <XCircle className="mr-2 w-5 h-5" /> Request Declined
                     </Button>
                   )}

                   <Button 
                    className={`flex-1 h-14 text-lg ${isInterested ? 'bg-green-600 border-none' : 'border-primary text-primary hover:bg-primary/5'}`} 
                    onClick={handleShowInterest}
                    variant={isInterested ? "default" : "outline"}
                    disabled={isInterested}
                   >
                     {isInterested ? <><CheckCircle2 className="mr-2 w-5 h-5" /> Interested</> : <><Sparkles className="mr-2 w-5 h-5" /> Show Interest</>}
                   </Button>
                </CardFooter>
              )}
            </Card>
          </div>

          {/* Sidebar Info */}
          <div className="md:col-span-4 space-y-6">
            <Card className="border-none shadow-sm bg-white overflow-hidden">
              <CardHeader className="bg-primary/5 border-b py-4 px-6">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" /> Founder Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {loadingOwner ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>
                ) : ownerProfile ? (
                  <>
                    <div className="space-y-1">
                      <h4 className="font-bold text-xl text-foreground leading-tight">{ownerProfile.name || 'Anonymous Founder'}</h4>
                      <p className="text-xs font-bold text-primary uppercase tracking-wider">{ownerProfile.company || 'Venture Lead'}</p>
                    </div>
                    <div className="text-sm text-muted-foreground leading-relaxed italic bg-muted/20 p-4 rounded-xl">
                      &quot;{ownerProfile.bio || "This founder focuses on high-impact innovation and strategic growth."}&quot;
                    </div>
                    <div className="pt-6 border-t space-y-4">
                       <div className="flex flex-col gap-2">
                         <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-tighter">Account Status</p>
                         <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 w-fit px-3 py-1 rounded-full text-xs font-bold">
                           <ShieldCheck className="w-3.5 h-3.5" /> Verified Profile
                         </div>
                       </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <User className="w-10 h-10 text-muted-foreground mx-auto opacity-20 mb-2" />
                    <p className="text-sm text-muted-foreground italic">Founder profile detail is private.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-emerald-600 text-white overflow-hidden">
              <CardContent className="p-6 space-y-4">
                <h4 className="font-bold text-lg">Safe Investing</h4>
                <p className="text-xs opacity-90 leading-relaxed">
                  CapFinder verifies identities, but we recommend thorough due diligence before making any financial commitments.
                </p>
                <div className="h-1 w-full bg-white/20 rounded-full" />
                <p className="text-[10px] font-bold uppercase opacity-70">Strategic Partnership Program</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
