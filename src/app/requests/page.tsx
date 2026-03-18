"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Inbox, CheckCircle2, XCircle, Mail, Clock, User, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';

export default function RequestsPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/login');
      } else if (profile && profile.role !== 'startup') {
        toast({
          variant: "destructive",
          title: "Access Restricted",
          description: "This page is reserved for startups to manage incoming requests."
        });
        router.push('/dashboard');
      }
    }
  }, [user, profile, authLoading, router, toast]);

  const requestsQuery = useMemoFirebase(() => {
    if (!user || profile?.role !== 'startup') return null;
    return query(
      collection(db, 'contactRequests'),
      where('receiverId', '==', user.uid)
    );
  }, [db, user, profile]);

  const { data: requests, isLoading: loadingRequests } = useCollection(requestsQuery);

  const handleUpdateStatus = (req: any, status: 'accepted' | 'rejected') => {
    updateDocumentNonBlocking(doc(db, 'contactRequests', req.id), { status });
    toast({
      title: `Request ${status}`,
      description: status === 'accepted' ? 'Investor can now see your contact details and message you.' : 'Introduction request declined.',
    });
  };

  if (authLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto w-10 h-10 text-primary" /></div>;
  if (!user || profile?.role !== 'startup') return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-5xl mx-auto w-full space-y-8">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Inbox className="w-8 h-8 text-primary" />
            Contact Requests
          </h1>
          <p className="text-muted-foreground">
            Investors interested in your pitches. Approve requests to start collaborating.
          </p>
        </div>

        {loadingRequests ? (
          <div className="flex justify-center p-20">
            <Loader2 className="animate-spin w-10 h-10 text-primary" />
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="grid gap-6">
            {requests
              .sort((a, b) => (b.timestamp?.toMillis?.() || 0) - (a.timestamp?.toMillis?.() || 0))
              .map((req) => (
              <Card key={req.id} className="overflow-hidden border-none shadow-sm bg-white hover:shadow-md transition-shadow">
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <Badge variant={req.status === 'pending' ? 'secondary' : req.status === 'accepted' ? 'default' : 'destructive'} className="capitalize">
                        {req.status === 'pending' ? <Clock className="w-3 h-3 mr-1" /> : req.status === 'accepted' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                        {req.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {req.timestamp?.toDate ? format(req.timestamp.toDate(), 'PPP p') : 'Just now'}
                      </span>
                    </div>
                    <CardTitle className="text-xl font-bold mb-2 flex items-center gap-2">
                      <Link href={`/profile/${req.senderId}`} className="hover:text-primary transition-colors">
                        {req.investorEmail}
                      </Link>
                      <Link href={`/profile/${req.senderId}`}>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-primary">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    </CardTitle>
                    <CardDescription className="text-sm">
                      Interested in your pitch: <span className="font-semibold text-foreground">{req.startupName}</span>
                    </CardDescription>
                    <div className="mt-4">
                       <Link href={`/profile/${req.senderId}`}>
                         <Button variant="link" size="sm" className="p-0 h-auto text-xs text-primary gap-1">
                           <User className="w-3 h-3" /> View Investor Profile
                         </Button>
                       </Link>
                    </div>
                  </div>
                  
                  <div className="bg-muted/30 p-6 flex flex-col items-center justify-center gap-3 border-t md:border-t-0 md:border-l min-w-[240px]">
                    {req.status === 'pending' ? (
                      <div className="flex gap-2 w-full">
                        <Button 
                          variant="outline" 
                          className="flex-1 border-green-200 text-green-600 hover:bg-green-50 bg-white"
                          onClick={() => handleUpdateStatus(req, 'accepted')}
                        >
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Accept
                        </Button>
                        <Button 
                          variant="outline" 
                          className="flex-1 border-red-200 text-red-600 hover:bg-red-50 bg-white"
                          onClick={() => handleUpdateStatus(req, 'rejected')}
                        >
                          <XCircle className="w-4 h-4 mr-2" /> Reject
                        </Button>
                      </div>
                    ) : req.status === 'accepted' ? (
                      <div className="text-center space-y-2 w-full">
                        <p className="text-xs font-medium text-emerald-600 mb-2">Introduction Approved</p>
                        <Button variant="secondary" size="sm" className="w-full gap-2" asChild>
                          <a href={`mailto:${req.investorEmail}`}>
                            <Mail className="w-4 h-4" /> Email Investor
                          </a>
                        </Button>
                        <Link href="/messages" className="w-full block mt-2">
                          <Button variant="default" size="sm" className="w-full bg-primary">
                            Open Chat
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Request Declined</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-40 bg-white rounded-3xl shadow-sm border border-dashed flex flex-col items-center">
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-6">
              <Inbox className="w-10 h-10 text-muted-foreground opacity-30" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-2">Inbox clear</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              You don't have any contact requests yet. When investors request your details, they will appear here.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}