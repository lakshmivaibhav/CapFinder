"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Card, CardDescription, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Inbox, CheckCircle2, XCircle, Mail, Clock, User, ExternalLink, ShieldCheck, MessageSquare, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';

export default function RequestsPage() {
  const { user, profile, loading: authLoading, emailVerified } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (!emailVerified) {
        router.push('/verify-email');
      } else if (profile && profile.role !== 'startup') {
        toast({
          variant: "destructive",
          title: "Access Restricted",
          description: "This interface is reserved for venture management."
        });
        router.push('/dashboard');
      }
    }
  }, [user, profile, authLoading, emailVerified, router, toast]);

  const requestsQuery = useMemoFirebase(() => {
    if (!user || profile?.role !== 'startup' || !emailVerified) return null;
    return query(
      collection(db, 'contactRequests'),
      where('receiverId', '==', user.uid)
    );
  }, [db, user, profile, emailVerified]);

  const { data: requests, isLoading: loadingRequests } = useCollection(requestsQuery);

  const handleUpdateStatus = (req: any, status: 'accepted' | 'rejected') => {
    updateDocumentNonBlocking(doc(db, 'contactRequests', req.id), { status });
    toast({
      title: `Identity Access ${status === 'accepted' ? 'Granted' : 'Revoked'}`,
      description: status === 'accepted' ? 'The investor has been granted direct messaging access.' : 'The inquiry has been declined.',
    });
  };

  if (authLoading || (user && !emailVerified)) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" /></div>;
  if (!user || profile?.role !== 'startup') return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-6xl mx-auto w-full space-y-12">
        <div className="space-y-3">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-primary">Inbound Queue</p>
          <h1 className="text-4xl font-black tracking-tighter flex items-center gap-4">
            <Inbox className="w-10 h-10 text-primary" />
            Venture Inquiries
          </h1>
          <p className="text-muted-foreground text-xl max-w-2xl leading-relaxed italic border-l-4 border-primary/20 pl-6">
            Review and authenticate strategic capital partners interested in your portfolio.
          </p>
        </div>

        {loadingRequests ? (
          <div className="flex justify-center p-32">
            <Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" />
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="grid gap-8">
            {requests
              .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
              .map((req) => (
              <Card key={req.id} className="overflow-hidden border-none shadow-xl bg-white hover:shadow-2xl transition-all rounded-[2rem] group">
                <div className="flex flex-col md:flex-row">
                  <CardContent className="flex-1 p-10">
                    <div className="flex items-center justify-between mb-8">
                      <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'accepted' ? 'default' : 'destructive'} className="capitalize px-4 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-widest">
                        {req.status === 'pending' ? <Clock className="w-3.5 h-3.5 mr-2 animate-pulse" /> : req.status === 'accepted' ? <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> : <XCircle className="w-3.5 h-3.5 mr-2" />}
                        {req.status === 'pending' ? 'Verification Pending' : req.status === 'accepted' ? 'Connected' : 'Access Restricted'}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">
                        {req.timestamp?.toDate ? format(req.timestamp.toDate(), 'MMM d, HH:mm') : 'Syncing...'}
                      </span>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="p-4 bg-muted rounded-2xl group-hover:bg-primary/5 transition-all">
                          <User className="w-8 h-8 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <h2 className="text-2xl font-black tracking-tight flex items-center gap-3">
                            {req.investorEmail}
                            <Link href={`/profile/${req.senderId}`}>
                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary">
                                <ExternalLink className="w-4 h-4" />
                              </Button>
                            </Link>
                          </h2>
                          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Certified Investor Identity</p>
                        </div>
                      </div>

                      <div className="p-6 bg-muted/30 rounded-2xl border-l-4 border-primary/20 space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Target Venture</p>
                        <p className="text-xl font-black text-foreground">{req.startupName}</p>
                      </div>
                    </div>
                  </CardContent>
                  
                  <div className="bg-muted/10 p-10 flex flex-col items-center justify-center gap-4 border-t md:border-t-0 md:border-l border-muted/50 min-w-[320px]">
                    {req.status === 'pending' ? (
                      <div className="flex flex-col gap-3 w-full">
                        <Button 
                          className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 shadow-xl shadow-emerald-500/20 rounded-2xl font-black uppercase text-xs tracking-widest"
                          onClick={() => handleUpdateStatus(req, 'accepted')}
                        >
                          <CheckCircle2 className="w-5 h-5 mr-3" /> Approve Access
                        </Button>
                        <Button 
                          variant="outline" 
                          className="w-full h-14 border-2 border-red-100 text-red-600 hover:bg-red-50 bg-white rounded-2xl font-black uppercase text-xs tracking-widest"
                          onClick={() => handleUpdateStatus(req, 'rejected')}
                        >
                          <XCircle className="w-5 h-5 mr-3" /> Decline Inquiry
                        </Button>
                      </div>
                    ) : req.status === 'accepted' ? (
                      <div className="text-center space-y-6 w-full">
                        <div className="p-4 bg-emerald-50 rounded-2xl border-2 border-emerald-100">
                           <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center justify-center gap-2">
                             <ShieldCheck className="w-4 h-4" /> Secure Connection Active
                           </p>
                        </div>
                        <div className="flex flex-col gap-3">
                          <Button variant="outline" className="w-full h-12 rounded-xl font-bold border-2" asChild>
                            <a href={`mailto:${req.investorEmail}`}>
                              <Mail className="w-4 h-4 mr-3" /> External Email
                            </a>
                          </Button>
                          <Link href="/messages" className="w-full">
                            <Button className="w-full h-12 bg-primary shadow-lg shadow-primary/20 rounded-xl font-bold">
                              <MessageSquare className="w-4 h-4 mr-3" /> Open Secure Chat
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="p-4 bg-red-50 rounded-2xl">
                           <XCircle className="w-10 h-10 text-red-300 mx-auto" />
                        </div>
                        <p className="text-sm font-black text-muted-foreground uppercase tracking-widest">Access Terminated</p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-48 bg-white rounded-[3rem] shadow-xl border-4 border-dashed border-muted/50 flex flex-col items-center">
            <div className="w-24 h-24 bg-muted/10 rounded-full flex items-center justify-center mb-8">
              <Inbox className="w-12 h-12 text-muted-foreground opacity-20" />
            </div>
            <h3 className="text-3xl font-black text-foreground mb-4">No Inbound Interest</h3>
            <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
              When investors initiate interest in your ventures, their authentication requests will appear in this secure queue.
            </p>
            <Link href="/pitches/new" className="mt-10">
              <Button size="lg" className="rounded-2xl px-10 h-14 bg-primary shadow-xl shadow-primary/20 font-black flex gap-3">
                <Zap className="w-6 h-6" /> Create New Venture
              </Button>
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
