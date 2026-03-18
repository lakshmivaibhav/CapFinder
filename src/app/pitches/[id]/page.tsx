"use client";

import { use, useState } from 'react';
import { doc, collection, query, where, serverTimestamp, getDocs } from 'firebase/firestore';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useDoc, useCollection, useMemoFirebase, setDocumentNonBlocking, addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Mail, MessageSquare, Clock, CheckCircle2, Bookmark, BookmarkCheck, Sparkles, XCircle, User, ExternalLink, DollarSign, Building2, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function PitchDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [checking, setChecking] = useState(false);

  // CRITICAL: Pitch reference must be strictly guarded by auth to satisfy security rules
  // Rule requires isAuthorized() which checks for a signed-in user with an active profile.
  const pitchRef = useMemoFirebase(() => {
    if (!user || !profile || profile.disabled === true) return null;
    return doc(db, 'pitches', id);
  }, [db, id, user, profile]);

  const { data: pitch, isLoading: loadingPitch } = useDoc(pitchRef);

  const ownerRef = useMemoFirebase(() => {
    if (!pitch || !user || !profile || profile.disabled === true) return null;
    return doc(db, 'users', pitch.ownerId);
  }, [db, pitch, user, profile]);

  const { data: ownerProfile, isLoading: loadingOwner } = useDoc(ownerRef);

  const isInvestor = profile?.role === 'investor';
  const isOwner = user?.uid === pitch?.ownerId;

  const interestsQuery = useMemoFirebase(() => {
    if (!user || !isInvestor || !pitch || profile?.disabled === true) return null;
    return query(collection(db, 'interests'), where('investorId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, isInvestor, id, pitch, profile]);
  const { data: interests } = useCollection(interestsQuery);
  const isInterested = interests && interests.length > 0;

  const favoritesQuery = useMemoFirebase(() => {
    if (!user || !isInvestor || !pitch || profile?.disabled === true) return null;
    return query(collection(db, 'favorites'), where('investorId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, isInvestor, id, pitch, profile]);
  const { data: favorites } = useCollection(favoritesQuery);
  const isFavorited = favorites && favorites.length > 0;

  const contactRequestsQuery = useMemoFirebase(() => {
    if (!user || !isInvestor || !pitch || profile?.disabled === true) return null;
    return query(collection(db, 'contactRequests'), where('senderId', '==', user.uid), where('pitchId', '==', id));
  }, [db, user, isInvestor, id, pitch, profile]);
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

    addDocumentNonBlocking(collection(db, 'notifications'), {
      userId: pitch.ownerId,
      type: 'interest',
      text: `An investor is interested in your pitch: ${pitch.startupName}`,
      read: false,
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

    addDocumentNonBlocking(collection(db, 'notifications'), {
      userId: pitch.ownerId,
      type: 'contact_request',
      text: `New contact request for ${pitch.startupName} from ${user.email}`,
      read: false,
      timestamp: serverTimestamp(),
    });

    toast({ title: "Contact Request Sent", description: "The startup will review your request shortly." });
  };

  const handleRequestDeletion = async () => {
    if (!user || !pitch || !isOwner) return;
    
    setChecking(true);
    try {
      const interestsSnap = await getDocs(query(collection(db, 'interests'), where('pitchId', '==', pitch.id)));
      const requestsSnap = await getDocs(query(collection(db, 'contactRequests'), where('pitchId', '==', pitch.id)));
      const messagesSnap = await getDocs(query(collection(db, 'messages'), where('pitchId', '==', pitch.id)));

      if (!interestsSnap.empty || !requestsSnap.empty || !messagesSnap.empty) {
        toast({
          variant: "destructive",
          title: "Deletion Blocked",
          description: "This pitch has active connections. We've notified connected investors to resolve their interests."
        });

        interestsSnap.docs.forEach(d => {
          const interestData = d.data();
          addDocumentNonBlocking(collection(db, 'notifications'), {
            userId: interestData.investorId,
            type: 'system',
            text: `The startup owner of "${pitch.startupName}" wishes to delete this pitch. Please resolve your interest/connection.`,
            read: false,
            timestamp: serverTimestamp(),
          });
        });
        
        setChecking(false);
        return;
      }

      if (confirm("Are you sure you want to request deletion of this pitch? An administrator will review your request.")) {
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
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not verify pitch status." });
    } finally {
      setChecking(false);
    }
  };

  if (loadingPitch || authLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin w-10 h-10 text-primary" /></div>;
  if (!pitch) return <div className="min-h-screen flex flex-col items-center justify-center gap-4"><Badge variant="destructive">Error</Badge><h2 className="text-xl font-bold">Pitch not found</h2><Link href="/pitches"><Button variant="link">Return to Marketplace</Button></Link></div>;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-6xl mx-auto py-10 px-6 w-full space-y-8">
        <Link href="/pitches" className="flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors w-fit font-medium text-sm">
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>

        <div className="grid lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-8 space-y-6">
            <Card className="border-none shadow-md overflow-hidden bg-white rounded-2xl">
              <CardHeader className="p-8 pb-4 space-y-6">
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-none px-4 py-1.5 text-xs font-bold uppercase">
                    {pitch.industry}
                  </Badge>
                  <div className="flex items-center gap-2">
                    {isOwner && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-destructive hover:bg-destructive/10"
                        onClick={handleRequestDeletion}
                        disabled={checking}
                      >
                        {checking ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                        Delete Pitch
                      </Button>
                    )}
                    {isInvestor && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleToggleFavorite} 
                        className={`gap-2 rounded-full border-muted-foreground/20 font-bold transition-all ${isFavorited ? "text-accent bg-accent/5 border-accent/20" : "text-muted-foreground hover:text-accent"}`}
                      >
                        {isFavorited ? <><BookmarkCheck className="w-4 h-4 fill-current" /> Saved</> : <><Bookmark className="w-4 h-4" /> Save</>}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <CardTitle className="text-4xl md:text-5xl font-black tracking-tight">{pitch.startupName}</CardTitle>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground font-semibold uppercase tracking-widest">
                    <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-primary" /> Posted {pitch.createdAt?.toDate ? pitch.createdAt.toDate().toLocaleDateString() : 'Recently'}</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8 pt-4 space-y-10">
                <p className="text-xl md:text-2xl leading-relaxed text-foreground/80 font-medium italic">
                  &quot;{pitch.description}&quot;
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-6 bg-primary/5 rounded-2xl space-y-2 border border-primary/10 flex flex-col items-center text-center">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-extrabold">Target Funding</p>
                    <p className="text-2xl font-black text-primary">${pitch.fundingNeeded?.toLocaleString()}</p>
                  </div>
                  <div className="p-6 bg-accent/5 rounded-2xl space-y-2 border border-accent/10 flex flex-col items-center text-center">
                    <Building2 className="w-5 h-5 text-accent" />
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-extrabold">Industry</p>
                    <p className="text-2xl font-black text-accent">{pitch.industry}</p>
                  </div>
                </div>
              </CardContent>

              {isInvestor && (
                <CardFooter className="p-8 border-t bg-muted/5 flex flex-col sm:flex-row gap-4">
                   <div className="flex-1 flex flex-col gap-2">
                     {!contactRequest ? (
                       <Button className="w-full h-14 text-lg font-bold shadow-lg bg-primary hover:bg-primary/90" onClick={handleRequestContact}>
                         <Mail className="mr-2 w-5 h-5" /> Request Contact
                       </Button>
                     ) : contactRequest.status === 'pending' ? (
                       <Button className="w-full h-14 text-lg font-bold" variant="secondary" disabled>
                         <Clock className="mr-2 w-5 h-5 animate-pulse" /> Pending Approval
                       </Button>
                     ) : contactRequest.status === 'accepted' ? (
                       <div className="flex gap-2 w-full">
                          <Button className="flex-1 h-14 text-lg font-bold bg-green-600 hover:bg-green-700" asChild>
                            <a href={`mailto:${pitch.contactEmail}`}>
                              <Mail className="mr-2 w-5 h-5" /> Email Founder
                            </a>
                          </Button>
                          <Button className="flex-1 h-14 text-lg font-bold bg-accent hover:bg-accent/90" asChild>
                            <Link href="/messages">
                              <MessageSquare className="mr-2 w-5 h-5" /> Chat
                            </Link>
                          </Button>
                       </div>
                     ) : (
                       <Button className="w-full h-14 text-lg font-bold" variant="outline" disabled>
                         <XCircle className="mr-2 w-5 h-5" /> Declined
                       </Button>
                     )}
                   </div>

                   <Button 
                    className={`flex-1 h-14 text-lg font-bold transition-all ${isInterested ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-primary text-primary hover:bg-primary/5'}`} 
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

          <div className="lg:col-span-4 space-y-6">
            <Card className="border-none shadow-md bg-white overflow-hidden rounded-2xl">
              <CardHeader className="bg-primary/5 border-b py-5 px-6">
                <CardTitle className="text-lg font-black flex items-center gap-2 text-primary uppercase">
                  <User className="w-5 h-5" /> Founder Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {loadingOwner ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin w-6 h-6 text-muted-foreground" /></div>
                ) : ownerProfile ? (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center border-2 border-primary/10 overflow-hidden shrink-0">
                        <User className="w-8 h-8 text-primary/40" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <Link href={`/profile/${pitch.ownerId}`} className="group block">
                          <h4 className="font-black text-lg text-foreground truncate group-hover:text-primary transition-colors">{ownerProfile.name || 'Founder'}</h4>
                        </Link>
                        <p className="text-[10px] font-black text-primary uppercase tracking-widest">{ownerProfile.company || 'Organization'}</p>
                      </div>
                    </div>
                    <Link href={`/profile/${pitch.ownerId}`} className="w-full block">
                      <Button variant="outline" className="w-full gap-2 text-xs font-black uppercase tracking-widest">
                        Professional Profile <ExternalLink className="w-3 h-3" />
                      </Button>
                    </Link>
                  </>
                ) : (
                  <div className="text-center py-6 text-sm text-muted-foreground italic">Profile is private.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
