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
import { Loader2, Trash2, ShieldAlert, UserX, UserCheck, ShieldCheck, UserCog, Megaphone, Inbox, Users, MessageSquare, AlertTriangle, Zap } from 'lucide-react';
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
        <Loader2 className="animate-spin w-12 h-12 text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Verifying Admin Access...</p>
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
    return query(collection(db, 'users'), where('disabled', 'in', [true, false]), limit(500));
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
    if (isAuto || confirm(`Confirm PERMANENT deletion of pitch: "${name}"?`)) {
      deleteDocumentNonBlocking(doc(db, 'pitches', pitchId));
      if (requestId) updateDocumentNonBlocking(doc(db, 'deleteRequests', requestId), { status: 'resolved' });
      if (!isAuto) toast({ title: "Pitch Deleted" });
    }
  };

  const handleDeleteUser = (userId: string, email: string, requestId?: string, isAuto = false) => {
    if (isAuto || confirm(`Confirm PERMANENT deletion of profile: "${email}"?`)) {
      deleteDocumentNonBlocking(doc(db, 'users', userId));
      if (requestId) updateDocumentNonBlocking(doc(db, 'deleteRequests', requestId), { status: 'resolved' });
      if (!isAuto) toast({ title: "User Profile Deleted" });
    }
  };

  const handleProcessStaleRequests = async () => {
    if (staleRequests.length === 0) return;
    if (!confirm(`Process ${staleRequests.length} stale deletion requests?`)) return;
    setProcessingStale(true);
    try {
      for (const req of staleRequests) {
        if (req.targetType === 'account') {
          handleDeleteUser(req.targetId, 'Stale Account', req.id, true);
        } else {
          handleDeletePitch(req.targetId, 'Stale Pitch', req.id, true);
        }
      }
      toast({ title: "Batch Processing Complete" });
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

  const stats = [
    { label: 'Total Users', value: allUsers?.length || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Live Pitches', value: allPitches?.length || 0, icon: Megaphone, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Connections', value: allRequests?.length || 0, icon: Inbox, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Messages', value: allMessages?.length || 0, icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-destructive" /> Platform Admin
            </h1>
            <p className="text-muted-foreground uppercase text-[10px] font-black tracking-widest">Global Governance Hub</p>
          </div>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
            <ShieldCheck className="w-4 h-4 mr-2" /> Secure Admin Session
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <Card key={i} className="border-none shadow-sm relative overflow-hidden">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{stat.label}</CardDescription>
                <CardTitle className="text-3xl font-black">{stat.value}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className={`absolute right-4 bottom-4 p-3 rounded-2xl ${stat.bg}`}>
                  <stat.icon className={`w-6 h-6 ${stat.color}`} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="bg-muted/50 p-1">
            <TabsTrigger value="users" className="gap-2"><UserCog className="w-4 h-4" /> Users</TabsTrigger>
            <TabsTrigger value="pitches" className="gap-2"><Megaphone className="w-4 h-4" /> Pitches</TabsTrigger>
            <TabsTrigger value="delete-requests" className="gap-2">
              <AlertTriangle className="w-4 h-4" /> Deletions
              {allDeleteRequests && allDeleteRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 rounded-full h-5 w-5 p-0 flex items-center justify-center text-[10px]">{allDeleteRequests.length}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Identity</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allUsers?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-bold">{u.name || 'Anonymous'}</span>
                            <span className="text-[10px] text-muted-foreground">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="capitalize">{u.role}</Badge></TableCell>
                        <TableCell>
                          {u.disabled ? <Badge variant="destructive">Disabled</Badge> : <Badge variant="secondary" className="bg-green-50 text-green-700">Active</Badge>}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" onClick={() => toggleUserStatus(u.id, u.email, !!u.disabled)}>
                            {u.disabled ? <UserCheck className="w-4 h-4 text-green-600" /> : <UserX className="w-4 h-4 text-amber-600" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteUser(u.id, u.email)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
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
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Startup</TableHead>
                      <TableHead>Goal</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPitches ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allPitches?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-bold text-primary">{p.startupName}</TableCell>
                        <TableCell className="font-mono text-emerald-600 font-bold">${p.fundingNeeded?.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeletePitch(p.id, p.startupName)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
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
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Pending Purge Queue</h3>
                {staleRequests.length > 0 && (
                  <Button variant="destructive" size="sm" onClick={handleProcessStaleRequests} disabled={processingStale}>
                    {processingStale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Purge Stale (+24h)
                  </Button>
                )}
              </div>
              <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Requested On</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDeleteRequests ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                      ) : allDeleteRequests?.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-10 text-muted-foreground italic">No pending requests.</TableCell></TableRow>
                      ) : allDeleteRequests?.map((req) => (
                        <TableRow key={req.id}>
                          <TableCell><Badge variant="outline" className="capitalize">{req.targetType}</Badge></TableCell>
                          <TableCell className="text-[10px] text-muted-foreground">
                            {req.timestamp?.toDate ? format(req.timestamp.toDate(), 'MMM d, HH:mm') : 'Recently'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="bg-red-50 text-red-600 hover:bg-red-100"
                              onClick={() => req.targetType === 'account' ? handleDeleteUser(req.targetId, 'Account Deletion', req.id) : handleDeletePitch(req.targetId, 'Pitch Deletion', req.id)}
                            >
                              Approve Purge
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