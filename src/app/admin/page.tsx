
"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, limit, doc, getDoc, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, ShieldAlert, UserX, UserCheck, ShieldCheck, UserCog, Megaphone, Inbox, ClipboardList, Clock, Users, MessageSquare, AlertTriangle, CheckCircle2, XCircle, Sparkles, Zap } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format, differenceInHours } from 'date-fns';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * AdminDashboardPage - Phase 1: Verification
 * This component handles the initial security check. It does not call any hooks for sensitive
 * collections until it has definitively verified the user's role via a direct Firestore fetch.
 */
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
        // Authoritative role verification directly from the database
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const userData = userDoc.data();
        
        // Ensure exact string match for 'admin' and that profile is synchronized
        if (userDoc.exists() && userData?.role === 'admin' && !userData.disabled) {
          setIsVerifiedAdmin(true);
        } else {
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "You do not have administrative privileges."
          });
          router.push('/dashboard');
        }
      } catch (error) {
        console.error("Admin Verification Error:", error);
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

  // Render the content component which only now initializes sensitive collection hooks
  return <AdminDashboardContent />;
}

/**
 * AdminDashboardContent - Phase 2: Administrative Content
 * This component is only rendered after Phase 1 confirmation.
 */
function AdminDashboardContent() {
  const { user, profile } = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [processingStale, setProcessingStale] = useState(false);

  // Queries are initialized here, ensuring they ONLY run after authoritative verification.
  // All list queries are strictly guarded by profile existence to satisfy isAuthorized() rules.
  const usersQuery = useMemoFirebase(() => {
    if (!profile) return null;
    return query(collection(db, 'users'), limit(500));
  }, [db, profile]);

  const pitchesQuery = useMemoFirebase(() => {
    if (!profile) return null;
    return query(collection(db, 'pitches'), limit(500));
  }, [db, profile]);

  const requestsQuery = useMemoFirebase(() => {
    if (!profile) return null;
    return query(collection(db, 'contactRequests'), limit(500));
  }, [db, profile]);

  const messagesQuery = useMemoFirebase(() => {
    if (!profile) return null;
    return query(collection(db, 'messages'), limit(500));
  }, [db, profile]);
  
  // SAFE LOG QUERY: Strictly includes userId filter to match first path of security rules.
  // Even for admins, this "safe query" avoids reliance on potentially slow rule-side get() calls.
  const logsQuery = useMemoFirebase(() => {
    if (!user || !profile) return null;
    return query(
      collection(db, 'logs'), 
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'), 
      limit(100)
    );
  }, [db, user, profile]);
  
  const deleteRequestsQuery = useMemoFirebase(() => {
    if (!profile) return null;
    return query(collection(db, 'deleteRequests'), where('status', '==', 'pending'), limit(100));
  }, [db, profile]);

  const { data: allUsers, isLoading: loadingUsers } = useCollection(usersQuery);
  const { data: allPitches, isLoading: loadingPitches } = useCollection(pitchesQuery);
  const { data: allRequests, isLoading: loadingRequests } = useCollection(requestsQuery);
  const { data: allMessages, isLoading: loadingMessages } = useCollection(messagesQuery);
  const { data: allLogs, isLoading: loadingLogs } = useCollection(logsQuery);
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
    const confirmMessage = `Are you sure you want to PERMANENTLY delete the pitch for "${name}"? This action cannot be undone.`;
    if (isAuto || confirm(confirmMessage)) {
      deleteDocumentNonBlocking(doc(db, 'pitches', pitchId));
      if (requestId) {
        updateDocumentNonBlocking(doc(db, 'deleteRequests', requestId), { status: 'resolved' });
      }
      
      addDocumentNonBlocking(collection(db, 'logs'), {
        userId: user?.uid,
        action: isAuto ? 'auto_pitch_deleted' : 'pitch_deleted',
        targetId: pitchId,
        details: isAuto ? `System auto-deleted stale pitch request for ${name}` : `Admin approved deletion of pitch: ${name}`,
        timestamp: serverTimestamp()
      });

      if (!isAuto) {
        toast({ title: "Pitch Deleted", description: `The pitch for ${name} has been removed.` });
      }
    }
  };

  const handleDeleteUser = (userId: string, email: string, requestId?: string, isAuto = false) => {
    const confirmMessage = `Are you sure you want to PERMANENTLY delete the profile for "${email}"? This will remove all their access to the platform.`;
    if (isAuto || confirm(confirmMessage)) {
      deleteDocumentNonBlocking(doc(db, 'users', userId));
      if (requestId) {
        updateDocumentNonBlocking(doc(db, 'deleteRequests', requestId), { status: 'resolved' });
      }

      addDocumentNonBlocking(collection(db, 'logs'), {
        userId: user?.uid,
        action: isAuto ? 'auto_user_deleted' : 'user_deleted',
        targetId: userId,
        details: isAuto ? `System auto-deleted stale account request for ${email}` : `Admin approved deletion of user: ${email}`,
        timestamp: serverTimestamp()
      });

      if (!isAuto) {
        toast({ title: "User Profile Deleted", description: `The profile for ${email} has been removed.` });
      }
    }
  };

  const handleProcessStaleRequests = async () => {
    if (staleRequests.length === 0) return;
    if (!confirm(`Are you sure you want to automatically process ${staleRequests.length} stale deletion requests?`)) return;

    setProcessingStale(true);
    try {
      for (const req of staleRequests) {
        if (req.targetType === 'account') {
          handleDeleteUser(req.targetId, 'Stale Account Deletion', req.id, true);
        } else {
          handleDeletePitch(req.targetId, 'Stale Pitch Deletion', req.id, true);
        }
      }
      toast({ title: "Batch Processing Complete", description: `${staleRequests.length} stale requests have been purged.` });
    } finally {
      setProcessingStale(false);
    }
  };

  const toggleUserStatus = (userId: string, email: string, currentDisabledStatus: boolean) => {
    const action = currentDisabledStatus ? 'enable' : 'disable';
    if (confirm(`Are you sure you want to ${action} the account for ${email}?`)) {
      updateDocumentNonBlocking(doc(db, 'users', userId), { disabled: !currentDisabledStatus });
      
      addDocumentNonBlocking(collection(db, 'logs'), {
        userId: user?.uid,
        action: currentDisabledStatus ? 'user_enabled' : 'user_disabled',
        targetId: userId,
        details: `Admin ${currentDisabledStatus ? 'enabled' : 'disabled'} user profile: ${email}`,
        timestamp: serverTimestamp()
      });

      toast({ 
        title: currentDisabledStatus ? "User Enabled" : "User Disabled", 
        description: `The account for ${email} has been ${currentDisabledStatus ? 'reactivated' : 'suspended'}.` 
      });
    }
  };

  const handleChangeRole = (userId: string, userEmail: string, currentRole: string, newRole: string) => {
    if (currentRole === newRole) return;

    const confirmationMessage = `Are you sure you want to change the role for ${userEmail} from "${currentRole.toUpperCase()}" to "${newRole.toUpperCase()}"?`;

    if (confirm(confirmationMessage)) {
      updateDocumentNonBlocking(doc(db, 'users', userId), { 
        role: newRole,
        updatedAt: new Date()
      });

      addDocumentNonBlocking(collection(db, 'logs'), {
        userId: user?.uid,
        action: 'role_changed',
        targetId: userId,
        details: `Role changed from ${currentRole} to ${newRole} for ${userEmail}`,
        timestamp: serverTimestamp()
      });
      
      toast({ 
        title: "Role Updated Successfully", 
        description: `${userEmail} is now a platform ${newRole}.` 
      });
    }
  };

  const handleResolveDeleteRequest = (requestId: string, status: 'resolved' | 'rejected') => {
    updateDocumentNonBlocking(doc(db, 'deleteRequests', requestId), { status });
    toast({ title: `Request ${status === 'resolved' ? 'Resolved' : 'Rejected'}` });
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
              <ShieldAlert className="w-8 h-8 text-destructive" />
              Platform Administration
            </h1>
            <p className="text-muted-foreground">Manage user roles, system data, and platform security.</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-lg border border-emerald-200 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" /> Secure Admin Session
          </div>
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
          <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto h-auto p-1 bg-muted/50">
            <TabsTrigger value="users" className="gap-2 py-2">
              <UserCog className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="pitches" className="gap-2 py-2">
              <Megaphone className="w-4 h-4" /> Pitches
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 py-2">
              <Inbox className="w-4 h-4" /> Connections
            </TabsTrigger>
            <TabsTrigger value="delete-requests" className="gap-2 py-2">
              <AlertTriangle className="w-4 h-4" /> Delete Requests
              {allDeleteRequests && allDeleteRequests.length > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 w-5 p-0 flex items-center justify-center rounded-full text-[10px]">{allDeleteRequests.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 py-2">
              <ClipboardList className="w-4 h-4" /> My Audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle>User Directory</CardTitle>
                <CardDescription>Manage roles and account status.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>User Identity</TableHead>
                      <TableHead>Current Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Activity</TableHead>
                      <TableHead className="text-right">Management</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allUsers?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link href={`/profile/${u.id}`} className="font-bold hover:underline text-primary">{u.name || 'Anonymous'}</Link>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={u.role || 'startup'} 
                            onValueChange={(val) => handleChangeRole(u.id, u.email, u.role || 'startup', val)}
                          >
                            <SelectTrigger className="h-9 w-32 bg-white text-xs font-semibold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="startup">Startup</SelectItem>
                              <SelectItem value="investor">Investor</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          {u.disabled ? (
                            <Badge variant="destructive" className="uppercase text-[9px]">Disabled</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 uppercase text-[9px]">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.lastActive?.toDate ? format(u.lastActive.toDate(), 'MMM d, HH:mm') : 'Never'}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={u.disabled ? "text-green-600 hover:bg-green-50" : "text-amber-600 hover:bg-amber-50"}
                            onClick={() => toggleUserStatus(u.id, u.email, !!u.disabled)}
                          >
                            {u.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-red-50"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                          >
                            <Trash2 className="w-4 h-4" />
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
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle>Content Moderation</CardTitle>
                <CardDescription>Review all active investment proposals.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Startup</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Funding Goal</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPitches ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allPitches?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link href={`/pitches/${p.id}`} className="font-bold hover:underline text-primary">{p.startupName}</Link>
                        </TableCell>
                        <TableCell><Badge variant="outline" className="text-[10px]">{p.industry}</Badge></TableCell>
                        <TableCell className="font-mono text-emerald-600 font-bold">${p.fundingNeeded?.toLocaleString()}</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-red-50"
                            onClick={() => handleDeletePitch(p.id, p.startupName)}
                          >
                            <Trash2 className="w-4 h-4" />
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
                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">Pending Purge Queue</h3>
                {staleRequests.length > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    className="gap-2" 
                    onClick={handleProcessStaleRequests}
                    disabled={processingStale}
                  >
                    {processingStale ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                    Purge {staleRequests.length} Stale Requests (+24h)
                  </Button>
                )}
              </div>
              <Card className="border-none shadow-sm overflow-hidden bg-white">
                <CardHeader className="bg-muted/10 border-b">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Data Removal Requests</CardTitle>
                      <CardDescription>Review and process user requests to delete their data.</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Target ID / User</TableHead>
                        <TableHead>Requested On</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingDeleteRequests ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                      ) : allDeleteRequests?.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-10 text-muted-foreground italic">No pending deletion requests.</TableCell></TableRow>
                      ) : allDeleteRequests?.map((req) => {
                        const isStale = req.timestamp?.toDate && differenceInHours(new Date(), req.timestamp.toDate()) >= 24;
                        return (
                          <TableRow key={req.id} className={isStale ? "bg-red-50/30" : ""}>
                            <TableCell>
                              <Badge variant="outline" className="capitalize">{req.targetType}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-mono text-[10px] text-muted-foreground">{req.targetId}</span>
                                <span className="text-xs">User: {req.userId?.substring(0, 8)}...</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">
                              {req.timestamp?.toDate ? format(req.timestamp.toDate(), 'MMM d, HH:mm') : 'Recently'}
                            </TableCell>
                            <TableCell>
                              {isStale ? (
                                <Badge variant="destructive" className="animate-pulse flex items-center gap-1 w-fit">
                                  <Clock className="w-3 h-3" /> Stale (24h+)
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="flex items-center gap-1 w-fit text-[10px]">
                                  <Clock className="w-3 h-3" /> Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right flex items-center justify-end gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="bg-red-50 text-red-600 hover:bg-red-100 border-red-200 h-8"
                                onClick={() => req.targetType === 'account' ? handleDeleteUser(req.targetId, 'Approved Account Deletion', req.id) : handleDeletePitch(req.targetId, 'Approved Pitch Deletion', req.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-1" /> Approve & Delete
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="text-muted-foreground h-8"
                                onClick={() => handleResolveDeleteRequest(req.id, 'rejected')}
                              >
                                <XCircle className="w-4 h-4 mr-1" /> Dismiss
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="requests">
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle>Platform Connections</CardTitle>
                <CardDescription>Oversight of networking activity.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Parties</TableHead>
                      <TableHead>Target Startup</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRequests ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allRequests?.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">Inv: {r.investorEmail}</span>
                            <span className="text-muted-foreground text-[10px]">Founder UID: {r.receiverId?.substring(0, 8)}...</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium text-sm">{r.startupName}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'accepted' ? 'default' : r.status === 'pending' ? 'secondary' : 'destructive'} className="capitalize text-[10px]">
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {r.timestamp?.toDate ? format(r.timestamp.toDate(), 'MMM d, HH:mm') : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="logs">
            <Card className="border-none shadow-sm overflow-hidden bg-white">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle>My Administrative Activity</CardTitle>
                <CardDescription>Review your personal system interactions and security actions.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLogs ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allLogs?.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-10 text-muted-foreground italic">No recent activity logs found.</TableCell></TableRow>
                    ) : allLogs?.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="text-xs whitespace-nowrap font-mono text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, HH:mm:ss') : 'Just now'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase font-bold bg-primary/5 text-primary border-primary/10">
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                          {log.details}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
