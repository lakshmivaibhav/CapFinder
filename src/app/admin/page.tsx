"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, limit, doc, getDoc, where, orderBy } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  Trash2, 
  ShieldAlert, 
  UserX, 
  UserCheck, 
  ShieldCheck, 
  UserCog, 
  Megaphone, 
  Inbox, 
  Users, 
  AlertTriangle, 
  Zap, 
  Building, 
  LifeBuoy, 
  ExternalLink,
  MessageSquare,
  Clock,
  CheckCircle2,
  MoreVertical
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours } from 'date-fns';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

export default function AdminDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  
  const [verifying, setVerifying] = useState(true);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState(false);

  useEffect(() => {
    async function verifyAdminStatus() {
      if (authLoading) return;
      if (!user) {
        router.push('/login');
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        if (userDoc.exists() && userData?.role === 'admin' && !userData.disabled) {
          setIsVerifiedAdmin(true);
        } else {
          toast({ variant: "destructive", title: "Access Denied", description: "Admin privileges required." });
          router.push('/dashboard');
        }
      } catch (error) {
        router.push('/dashboard');
      } finally {
        setVerifying(false);
      }
    }
    verifyAdminStatus();
  }, [user, authLoading, db, router, toast]);

  if (authLoading || verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="animate-spin w-12 h-12 text-primary opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Establishing Admin Session...</p>
      </div>
    );
  }

  if (!isVerifiedAdmin || !profile) return null;

  return <AdminDashboardContent />;
}

function AdminDashboardContent() {
  const { user, profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [processingStale, setProcessingStale] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<any>(null);
  const [adminNote, setAdminNote] = useState('');

  const usersQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile || profile.role !== 'admin' || profile.disabled) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db, user, profile]);

  const pitchesQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile || profile.role !== 'admin' || profile.disabled) return null;
    return query(collection(db, 'pitches'), limit(500));
  }, [db, user, profile]);

  const requestsQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile || profile.role !== 'admin' || profile.disabled) return null;
    return query(collection(db, 'contactRequests'), limit(500));
  }, [db, user, profile]);
  
  const deleteRequestsQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile || profile.role !== 'admin' || profile.disabled) return null;
    return query(collection(db, 'deleteRequests'), where('status', '==', 'pending'), limit(100));
  }, [db, user, profile]);

  const ticketsQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile || profile.role !== 'admin' || profile.disabled) return null;
    return query(collection(db, 'supportTickets'), orderBy('createdAt', 'desc'), limit(100));
  }, [db, user, profile]);

  const { data: allUsers, isLoading: loadingUsers } = useCollection(usersQuery);
  const { data: allPitches, isLoading: loadingPitches } = useCollection(pitchesQuery);
  const { data: allRequests, isLoading: loadingRequests } = useCollection(requestsQuery);
  const { data: allDeleteRequests, isLoading: loadingDeleteRequests } = useCollection(deleteRequestsQuery);
  const { data: allTickets, isLoading: loadingTickets } = useCollection(ticketsQuery);

  const staleRequests = useMemo(() => {
    if (!allDeleteRequests) return [];
    const now = new Date();
    return allDeleteRequests.filter(req => {
      const ts = req.timestamp?.toDate ? req.timestamp.toDate() : null;
      if (!ts) return false;
      return differenceInHours(now, ts) >= 24;
    });
  }, [allDeleteRequests]);

  const newTicketsCount = useMemo(() => {
    return allTickets?.filter(t => t.status === 'new').length || 0;
  }, [allTickets]);

  const handleDeletePitch = (pitchId: string, name: string, requestId?: string, isAuto = false) => {
    if (isAuto || confirm(`Confirm PERMANENT deletion of venture: "${name}"?`)) {
      deleteDocumentNonBlocking(doc(db, 'pitches', pitchId));
      if (requestId) updateDocumentNonBlocking(doc(db, 'deleteRequests', requestId), { status: 'resolved' });
      if (!isAuto) toast({ title: "Venture Deleted" });
    }
  };

  const handleDeleteUser = (userId: string, email: string, requestId?: string, isAuto = false) => {
    if (isAuto || confirm(`Confirm PERMANENT deletion of profile: "${email}"?`)) {
      deleteDocumentNonBlocking(doc(db, 'users', userId));
      if (requestId) updateDocumentNonBlocking(doc(db, 'deleteRequests', requestId), { status: 'resolved' });
      if (!isAuto) toast({ title: "Profile Deleted" });
    }
  };

  const handleProcessStaleRequests = async () => {
    if (staleRequests.length === 0) return;
    if (!confirm(`Process ${staleRequests.length} stale requests?`)) return;
    setProcessingStale(true);
    try {
      for (const req of staleRequests) {
        if (req.targetType === 'account') {
          handleDeleteUser(req.targetId, 'Batch User', req.id, true);
        } else {
          handleDeletePitch(req.targetId, 'Batch Pitch', req.id, true);
        }
      }
      toast({ title: "Batch purge complete" });
    } finally {
      setProcessingStale(false);
    }
  };

  const toggleUserStatus = (userId: string, email: string, currentDisabledStatus: boolean) => {
    const action = currentDisabledStatus ? 'enable' : 'disable';
    if (confirm(`Confirm ${action} for ${email}?`)) {
      updateDocumentNonBlocking(doc(db, 'users', userId), { disabled: !currentDisabledStatus });
      toast({ title: currentDisabledStatus ? "User Enabled" : "User Disabled" });
    }
  };

  const toggleVerificationStatus = (userId: string, email: string, currentVerifiedStatus: boolean) => {
    const action = currentVerifiedStatus ? 'unverify' : 'verify';
    if (confirm(`Confirm ${action} for ${email}?`)) {
      updateDocumentNonBlocking(doc(db, 'users', userId), { verified: !currentVerifiedStatus });
      toast({ title: currentVerifiedStatus ? "User Unverified" : "User Verified" });
    }
  };

  const handleUpdateTicket = (ticketId: string, updates: any) => {
    updateDocumentNonBlocking(doc(db, 'supportTickets', ticketId), updates);
    if (selectedTicket && selectedTicket.id === ticketId) {
      setSelectedTicket({ ...selectedTicket, ...updates });
    }
    toast({ title: "Ticket Updated" });
  };

  const stats = [
    { label: 'Total Members', value: allUsers?.length || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Live Ventures', value: allPitches?.length || 0, icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Market Connections', value: allRequests?.length || 0, icon: Inbox, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 p-4 md:p-10 max-w-7xl mx-auto w-full space-y-8 md:space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-8 md:pb-10 text-center md:text-left">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-destructive">Restricted Access</p>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center justify-center md:justify-start gap-3">
              <ShieldAlert className="w-8 h-8 md:w-10 md:h-10 text-destructive" /> Platform Console
            </h1>
            <p className="text-muted-foreground text-xs md:text-sm font-medium">Global Administrative Control Center</p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-10 px-4 rounded-xl font-black uppercase tracking-widest text-[9px] w-fit mx-auto md:mx-0">
            <ShieldCheck className="w-4 h-4 mr-2" /> Verified Session
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-xl rounded-[2rem] overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</CardDescription>
                <CardTitle className="text-3xl md:text-4xl font-black">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`absolute right-4 bottom-4 md:right-6 md:bottom-6 p-3 md:p-4 rounded-2xl ${stat.bg} shadow-inner`}>
                  <stat.icon className={`w-6 h-6 md:w-8 md:h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users" className="space-y-6 md:space-y-10">
          <ScrollArea className="w-full">
            <TabsList className="bg-muted/50 p-1 md:p-1.5 rounded-xl md:rounded-2xl h-12 md:h-14 w-fit min-w-full sm:min-w-0">
              <TabsTrigger value="users" className="gap-2 px-4 md:px-8 h-10 md:h-11 rounded-lg md:rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all"><UserCog className="w-4 h-4" /> Identity</TabsTrigger>
              <TabsTrigger value="pitches" className="gap-2 px-4 md:px-8 h-10 md:h-11 rounded-lg md:rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all"><Building className="w-4 h-4" /> Ventures</TabsTrigger>
              <TabsTrigger value="support" className="gap-2 px-4 md:px-8 h-10 md:h-11 rounded-lg md:rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all relative">
                <LifeBuoy className="w-4 h-4" /> Support
                {newTicketsCount > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 rounded-full h-4 min-w-4 p-1 flex items-center justify-center text-[8px] border-2 border-white">{newTicketsCount}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="delete-requests" className="gap-2 px-4 md:px-8 h-10 md:h-11 rounded-lg md:rounded-xl font-black uppercase text-[10px] tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all relative">
                <AlertTriangle className="w-4 h-4" /> Purge
                {allDeleteRequests && allDeleteRequests.length > 0 && (
                  <Badge variant="destructive" className="absolute -top-1 -right-1 rounded-full h-4 min-w-4 p-1 flex items-center justify-center text-[8px] border-2 border-white">{allDeleteRequests.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>
            <ScrollBar orientation="horizontal" />
          </ScrollArea>

          <TabsContent value="users">
            <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="px-6 md:px-8 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Professional Identity</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Classification</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Status</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Verification</TableHead>
                      <TableHead className="text-right px-6 md:px-8 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Governance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                    ) : allUsers?.map((u) => (
                      <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="px-6 md:px-8">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black text-foreground text-xs md:text-sm whitespace-nowrap">{u.name || 'Incognito User'}</span>
                            <span className="text-[9px] text-muted-foreground font-black uppercase tracking-widest">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize rounded-lg px-2 md:px-3 font-black border-muted-foreground/20 text-[9px] uppercase tracking-widest">{(u.role as string)}</Badge></TableCell>
                        <TableCell>
                          {u.disabled ? <Badge variant="destructive" className="rounded-lg px-2 md:px-3 font-black text-[9px] uppercase tracking-widest">Suspended</Badge> : <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 rounded-lg px-2 md:px-3 font-black text-[9px] uppercase tracking-widest">Compliant</Badge>}
                        </TableCell>
                        <TableCell>
                          {u.verified ? <Badge className="bg-emerald-500 text-white rounded-lg px-2 md:px-3 font-black text-[9px] uppercase tracking-widest">Verified</Badge> : <Badge variant="outline" className="rounded-lg px-2 md:px-3 font-black text-[9px] uppercase tracking-widest">Unverified</Badge>}
                        </TableCell>
                        <TableCell className="text-right px-6 md:px-8 space-x-1 whitespace-nowrap">
                          <Button variant="ghost" size="icon" title={u.verified ? "Unverify User" : "Verify User"} className="rounded-xl h-10 w-10" onClick={() => toggleVerificationStatus(u.id, u.email, !!u.verified)}>
                            <ShieldCheck className={cn("w-5 h-5", u.verified ? "text-emerald-600" : "text-muted-foreground")} />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10" onClick={() => toggleUserStatus(u.id, u.email, !!u.disabled)}>
                            {u.disabled ? <UserCheck className="w-5 h-5 text-emerald-600" /> : <UserX className="w-5 h-5 text-amber-600" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-xl h-10 w-10 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUser(u.id, u.email)}>
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="pitches">
            <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="px-6 md:px-8 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Venture Name</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Capital Goal</TableHead>
                      <TableHead className="text-right px-6 md:px-8 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Governance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPitches ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-20"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                    ) : allPitches?.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="px-6 md:px-8 font-black text-primary text-xs md:text-sm whitespace-nowrap">{(p.startupName as string)}</TableCell>
                        <TableCell className="font-black text-emerald-600 text-xs md:text-sm whitespace-nowrap">${(p.fundingNeeded as number)?.toLocaleString()}</TableCell>
                        <TableCell className="text-right px-6 md:px-8 space-x-1 whitespace-nowrap">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl h-10 w-10 text-destructive hover:bg-destructive/10" 
                            title="Delete Venture"
                            onClick={() => handleDeletePitch(p.id, (p.startupName as string))}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </Card>
          </TabsContent>

          <TabsContent value="support">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">User Inquiries ({allTickets?.length || 0})</h3>
              </div>
              <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="px-6 md:px-8 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Submitted</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Member</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Subject</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Status</TableHead>
                        <TableHead className="text-right px-6 md:px-8 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingTickets ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                      ) : allTickets?.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-20 text-muted-foreground font-black italic">No support tickets found.</TableCell></TableRow>
                      ) : allTickets?.map((ticket) => (
                        <TableRow key={ticket.id} className={cn("hover:bg-muted/10 transition-colors", ticket.status === 'new' && "bg-primary/5")}>
                          <TableCell className="px-6 md:px-8 text-[10px] font-black uppercase text-muted-foreground whitespace-nowrap">
                            {ticket.createdAt?.toDate ? format(ticket.createdAt.toDate(), 'MMM d, HH:mm') : 'Recently'}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-black text-xs md:text-sm">{ticket.name}</span>
                              <Badge variant="outline" className="w-fit text-[8px] uppercase px-1.5 rounded-sm mt-1">{ticket.role}</Badge>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-[200px] truncate font-medium text-xs">{ticket.subject}</TableCell>
                          <TableCell>
                            <Badge className={cn(
                              "text-[8px] uppercase font-black px-2 py-0.5 rounded-lg",
                              ticket.status === 'new' ? "bg-primary text-white" :
                              ticket.status === 'in-progress' ? "bg-amber-500 text-white" :
                              "bg-emerald-500 text-white"
                            )}>
                              {ticket.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right px-6 md:px-8">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="h-10 px-4 rounded-xl font-black uppercase text-[10px] tracking-widest"
                              onClick={() => {
                                setSelectedTicket(ticket);
                                setAdminNote(ticket.adminNotes || '');
                              }}
                            >
                              Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="delete-requests">
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pending Purge Operations</h3>
                {staleRequests.length > 0 && (
                  <Button variant="destructive" size="sm" className="w-full sm:w-auto rounded-xl font-black h-12 px-6 shadow-xl shadow-destructive/20 text-[10px] uppercase tracking-widest" onClick={handleProcessStaleRequests} disabled={processingStale}>
                    {processingStale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Batch Purge (+24h)
                  </Button>
                )}
              </div>
              <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="px-6 md:px-8 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Type</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Entity ID</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Initiated</TableHead>
                        <TableHead className="text-right px-6 md:px-8 font-black uppercase tracking-widest text-[10px] whitespace-nowrap">Decision</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDeleteRequests ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                      ) : allDeleteRequests?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-black italic">Queue Cleared (No Pending Requests)</TableCell></TableRow>
                      ) : allDeleteRequests?.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="px-6 md:px-8"><Badge variant="outline" className="capitalize font-black border-destructive/20 text-destructive bg-destructive/5 px-2 md:px-3 py-1 rounded-lg text-[9px] uppercase tracking-widest">{(req.targetType as string)}</Badge></TableCell>
                          <TableCell className="text-[10px] font-mono font-black text-muted-foreground whitespace-nowrap">{(req.targetId as string)}</TableCell>
                          <TableCell className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
                            {req.timestamp?.toDate ? format(req.timestamp.toDate(), 'MMM d, HH:mm') : 'Recently'}
                          </TableCell>
                          <TableCell className="text-right px-6 md:px-8 whitespace-nowrap">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 rounded-xl font-black h-10 md:h-12 px-4 md:px-6 text-[10px] uppercase tracking-widest"
                              onClick={() => req.targetType === 'account' ? handleDeleteUser(req.targetId as string, 'Account Purge', req.id) : handleDeletePitch(req.targetId as string, 'Pitch Purge', req.id)}
                            >
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={!!selectedTicket} onOpenChange={(open) => !open && setSelectedTicket(null)}>
        <DialogContent className="max-w-2xl rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <DialogHeader className="p-8 bg-muted/30 border-b">
            <div className="flex justify-between items-start">
              <div>
                <DialogTitle className="text-2xl font-black tracking-tight">{selectedTicket?.subject}</DialogTitle>
                <DialogDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">
                  Ticket #{selectedTicket?.id?.slice(-6)} • {selectedTicket?.createdAt?.toDate ? format(selectedTicket.createdAt.toDate(), 'PPP p') : ''}
                </DialogDescription>
              </div>
              <Badge className={cn(
                "uppercase font-black px-3 py-1 rounded-xl text-[10px]",
                selectedTicket?.status === 'new' ? "bg-primary" : selectedTicket?.status === 'in-progress' ? "bg-amber-500" : "bg-emerald-500"
              )}>
                {selectedTicket?.status}
              </Badge>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Sender</p>
                  <p className="font-bold text-sm">{selectedTicket?.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Email</p>
                  <p className="font-bold text-sm">{selectedTicket?.email}</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Message</p>
                <div className="p-6 bg-muted/20 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap italic">
                  "{selectedTicket?.message}"
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-dashed">
                <Label className="text-[10px] font-black uppercase tracking-widest">Administrative Notes</Label>
                <Textarea 
                  placeholder="Internal notes for this ticket..." 
                  className="min-h-[120px] rounded-xl bg-muted/10 border-muted focus:ring-primary/20 italic p-6"
                  value={adminNote}
                  onChange={(e) => setAdminNote(e.target.value)}
                />
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="p-8 bg-muted/10 border-t flex flex-wrap gap-3 sm:justify-between items-center">
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2"
                onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'in-progress', adminNotes: adminNote })}
                disabled={selectedTicket?.status === 'in-progress'}
              >
                In Progress
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-12 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest border-2 text-emerald-600 border-emerald-100 hover:bg-emerald-50"
                onClick={() => handleUpdateTicket(selectedTicket.id, { status: 'resolved', adminNotes: adminNote })}
                disabled={selectedTicket?.status === 'resolved'}
              >
                Resolve
              </Button>
            </div>
            <Button 
              className="h-12 px-8 rounded-xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-primary/20"
              onClick={() => handleUpdateTicket(selectedTicket.id, { adminNotes: adminNote })}
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
