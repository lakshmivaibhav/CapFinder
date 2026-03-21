"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, limit, doc, getDoc, where } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, ShieldAlert, UserX, UserCheck, ShieldCheck, UserCog, Megaphone, Inbox, Users, MessageSquare, AlertTriangle, Zap, LayoutGrid, Building, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours } from 'date-fns';

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
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Establishing Admin Session...</p>
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

  const messagesQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile || profile.role !== 'admin' || profile.disabled) return null;
    return query(collection(db, 'messages'), limit(500));
  }, [db, user, profile]);
  
  const deleteRequestsQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile || profile.role !== 'admin' || profile.disabled) return null;
    return query(collection(db, 'deleteRequests'), where('status', '==', 'pending'), limit(100));
  }, [db, user, profile]);

  const { data: allUsers, isLoading: loadingUsers } = useCollection(usersQuery);
  const { data: allPitches, isLoading: loadingPitches } = useCollection(pitchesQuery);
  const { data: allRequests, isLoading: loadingRequests } = useCollection(requestsQuery);
  const { data: allMessages, isLoading: loadingMessages } = useCollection(messagesQuery);
  const { data: allDeleteRequests, isLoading: loadingDeleteRequests } = useCollection(deleteRequestsQuery);

  const staleRequests = useMemo(() => {
    if (!allDeleteRequests) return [];
    const now = new Date();
    return allDeleteRequests.filter(req => {
      if (!req.timestamp?.toDate) return false;
      return differenceInHours(now, req.timestamp.toDate()) >= 24;
    });
  }, [allDeleteRequests]);

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

  const handleUpdatePitchStatus = (pitchId: string, status: 'approved' | 'rejected') => {
    updateDocumentNonBlocking(doc(db, 'pitches', pitchId), { status });
    toast({ title: `Venture ${status === 'approved' ? 'Approved' : 'Rejected'}` });
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

  const stats = [
    { label: 'Total Members', value: allUsers?.length || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Live Ventures', value: allPitches?.length || 0, icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Market Connections', value: allRequests?.length || 0, icon: Inbox, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Inbox Volume', value: allMessages?.length || 0, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-12">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b pb-10">
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-destructive">Restricted Access</p>
            <h1 className="text-4xl font-black tracking-tight flex items-center gap-3">
              <ShieldAlert className="w-10 h-10 text-destructive" /> Platform Console
            </h1>
            <p className="text-muted-foreground text-sm font-medium">Global Administrative Control Center</p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 h-10 px-4 rounded-xl font-bold uppercase tracking-widest text-[9px]">
            <ShieldCheck className="w-4 h-4 mr-2" /> Verified Session
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-md hover:shadow-lg transition-all relative overflow-hidden rounded-[2rem]">
              <CardHeader className="pb-2">
                <CardDescription className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">{stat.label}</CardDescription>
                <CardTitle className="text-4xl font-black">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`absolute right-6 bottom-6 p-4 rounded-2xl ${stat.bg} shadow-inner`}>
                  <stat.icon className={`w-8 h-8 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users" className="space-y-10">
          <TabsList className="bg-muted/50 p-1.5 rounded-2xl h-14">
            <TabsTrigger value="users" className="gap-2 px-8 h-11 rounded-xl font-bold data-[state=active]:shadow-lg"><UserCog className="w-4 h-4" /> Identity</TabsTrigger>
            <TabsTrigger value="pitches" className="gap-2 px-8 h-11 rounded-xl font-bold data-[state=active]:shadow-lg"><Building className="w-4 h-4" /> Ventures</TabsTrigger>
            <TabsTrigger value="delete-requests" className="gap-2 px-8 h-11 rounded-xl font-bold data-[state=active]:shadow-lg relative">
              <AlertTriangle className="w-4 h-4" /> Purge Queue
              {allDeleteRequests && allDeleteRequests.length > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 rounded-full h-5 min-w-5 p-1 flex items-center justify-center text-[10px] border-2 border-white">{allDeleteRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="px-8 font-black uppercase tracking-widest text-[10px]">Professional Identity</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Classification</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Status</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Verification</TableHead>
                      <TableHead className="text-right px-8 font-black uppercase tracking-widest text-[10px]">Governance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-20"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                    ) : allUsers?.map((u) => (
                      <TableRow key={u.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="px-8">
                          <div className="flex flex-col gap-1">
                            <span className="font-black text-foreground">{u.name || 'Incognito User'}</span>
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize rounded-lg px-3 font-bold border-muted-foreground/20">{u.role}</Badge></TableCell>
                        <TableCell>
                          {u.disabled ? <Badge variant="destructive" className="rounded-lg px-3 font-bold">Suspended</Badge> : <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 rounded-lg px-3 font-bold">Compliant</Badge>}
                        </TableCell>
                        <TableCell>
                          {u.verified ? <Badge className="bg-emerald-500 text-white rounded-lg px-3 font-bold">Verified</Badge> : <Badge variant="outline" className="rounded-lg px-3 font-bold">Unverified</Badge>}
                        </TableCell>
                        <TableCell className="text-right px-8 space-x-1">
                          <Button variant="ghost" size="icon" title={u.verified ? "Unverify User" : "Verify User"} className="rounded-xl" onClick={() => toggleVerificationStatus(u.id, u.email, !!u.verified)}>
                            <ShieldCheck className={u.verified ? "w-5 h-5 text-emerald-600" : "w-5 h-5 text-muted-foreground"} />
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-xl" onClick={() => toggleUserStatus(u.id, u.email, !!u.disabled)}>
                            {u.disabled ? <UserCheck className="w-5 h-5 text-emerald-600" /> : <UserX className="w-5 h-5 text-amber-600" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="rounded-xl text-destructive hover:bg-destructive/10" onClick={() => handleDeleteUser(u.id, u.email)}>
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pitches">
            <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="px-8 font-black uppercase tracking-widest text-[10px]">Venture Name</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Capital Goal</TableHead>
                      <TableHead className="font-black uppercase tracking-widest text-[10px]">Current Status</TableHead>
                      <TableHead className="text-right px-8 font-black uppercase tracking-widest text-[10px]">Governance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPitches ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                    ) : allPitches?.map((p) => (
                      <TableRow key={p.id} className="hover:bg-muted/10 transition-colors">
                        <TableCell className="px-8 font-black text-primary">{p.startupName}</TableCell>
                        <TableCell className="font-black text-emerald-600">${p.fundingNeeded?.toLocaleString()}</TableCell>
                        <TableCell>
                          {(!p.status || p.status === 'approved') ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 font-bold gap-1.5 rounded-lg px-3">
                              <CheckCircle2 className="w-3 h-3" /> Approved
                            </Badge>
                          ) : p.status === 'pending' ? (
                            <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50 font-bold gap-1.5 rounded-lg px-3">
                              <Clock className="w-3 h-3 animate-pulse" /> Pending Review
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="font-bold gap-1.5 rounded-lg px-3">
                              <XCircle className="w-3 h-3" /> Rejected
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right px-8 space-x-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl text-emerald-600 hover:bg-emerald-50" 
                            title="Approve Venture"
                            onClick={() => handleUpdatePitchStatus(p.id, 'approved')}
                            disabled={p.status === 'approved'}
                          >
                            <CheckCircle2 className="w-5 h-5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl text-amber-600 hover:bg-amber-50" 
                            title="Reject Venture"
                            onClick={() => handleUpdatePitchStatus(p.id, 'rejected')}
                            disabled={p.status === 'rejected'}
                          >
                            <XCircle className="w-5 h-5" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="rounded-xl text-destructive hover:bg-destructive/10" 
                            title="Delete Venture"
                            onClick={() => handleDeletePitch(p.id, p.startupName)}
                          >
                            <Trash2 className="w-5 h-5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="delete-requests">
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Pending Purge Operations</h3>
                {staleRequests.length > 0 && (
                  <Button variant="destructive" size="sm" className="rounded-xl font-bold h-10 px-6 shadow-lg shadow-destructive/20" onClick={handleProcessStaleRequests} disabled={processingStale}>
                    {processingStale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
                    Batch Purge (+24h)
                  </Button>
                )}
              </div>
              <Card className="border-none shadow-xl overflow-hidden rounded-[2rem] bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/40">
                      <TableRow>
                        <TableHead className="px-8 font-black uppercase tracking-widest text-[10px]">Operation Type</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px]">Entity ID</TableHead>
                        <TableHead className="font-black uppercase tracking-widest text-[10px]">Initiated</TableHead>
                        <TableHead className="text-right px-8 font-black uppercase tracking-widest text-[10px]">Decision</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDeleteRequests ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20"><Loader2 className="animate-spin mx-auto opacity-20" /></TableCell></TableRow>
                      ) : allDeleteRequests?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-20 text-muted-foreground font-bold italic">Queue Cleared (No Pending Requests)</TableCell></TableRow>
                      ) : allDeleteRequests?.map((req) => (
                        <TableRow key={req.id} className="hover:bg-muted/10 transition-colors">
                          <TableCell className="px-8"><Badge variant="outline" className="capitalize font-black border-destructive/20 text-destructive bg-destructive/5 px-3 py-1 rounded-lg">{req.targetType}</Badge></TableCell>
                          <TableCell className="text-[10px] font-mono font-bold text-muted-foreground">{req.targetId}</TableCell>
                          <TableCell className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">
                            {req.timestamp?.toDate ? format(req.timestamp.toDate(), 'MMM d, HH:mm') : 'Recently'}
                          </TableCell>
                          <TableCell className="text-right px-8">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 rounded-xl font-bold h-9 px-6"
                              onClick={() => req.targetType === 'account' ? handleDeleteUser(req.targetId, 'Account Purge', req.id) : handleDeletePitch(req.targetId, 'Pitch Purge', req.id)}
                            >
                              Approve
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
