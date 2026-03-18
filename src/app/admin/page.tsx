
"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { collection, query, limit, doc, getDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, ShieldAlert, UserX, UserCheck, ShieldCheck, UserCog, Megaphone, Inbox, ClipboardList, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
        
        if (userDoc.exists() && userData?.role === 'admin') {
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
        router.push('/dashboard');
      } finally {
        setVerifying(false);
      }
    }

    verifyAdminStatus();
  }, [user, authLoading, db, router, toast]);

  const usersQuery = useMemoFirebase(() => 
    isVerifiedAdmin ? query(collection(db, 'users'), limit(100)) : null, 
    [db, isVerifiedAdmin]
  );
  const pitchesQuery = useMemoFirebase(() => 
    isVerifiedAdmin ? query(collection(db, 'pitches'), limit(100)) : null, 
    [db, isVerifiedAdmin]
  );
  const requestsQuery = useMemoFirebase(() => 
    isVerifiedAdmin ? query(collection(db, 'contactRequests'), limit(100)) : null, 
    [db, isVerifiedAdmin]
  );
  const logsQuery = useMemoFirebase(() => 
    isVerifiedAdmin ? query(collection(db, 'logs'), orderBy('timestamp', 'desc'), limit(100)) : null, 
    [db, isVerifiedAdmin]
  );

  const { data: allUsers, isLoading: loadingUsers } = useCollection(usersQuery);
  const { data: allPitches, isLoading: loadingPitches } = useCollection(pitchesQuery);
  const { data: allRequests, isLoading: loadingRequests } = useCollection(requestsQuery);
  const { data: allLogs, isLoading: loadingLogs } = useCollection(logsQuery);

  const handleDeletePitch = (pitchId: string, name: string) => {
    if (confirm(`Are you sure you want to delete the pitch for "${name}"?`)) {
      deleteDocumentNonBlocking(doc(db, 'pitches', pitchId));
      
      addDocumentNonBlocking(collection(db, 'logs'), {
        userId: user?.uid,
        action: 'pitch_deleted',
        targetId: pitchId,
        details: `Admin deleted pitch for ${name}`,
        timestamp: serverTimestamp()
      });

      toast({ title: "Pitch Deleted", description: `The pitch for ${name} has been removed.` });
    }
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (confirm(`Are you sure you want to delete the profile for "${email}"?`)) {
      deleteDocumentNonBlocking(doc(db, 'users', userId));

      addDocumentNonBlocking(collection(db, 'logs'), {
        userId: user?.uid,
        action: 'user_deleted',
        targetId: userId,
        details: `Admin deleted user ${email}`,
        timestamp: serverTimestamp()
      });

      toast({ title: "User Profile Deleted", description: `The profile for ${email} has been removed.` });
    }
  };

  const toggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateDocumentNonBlocking(doc(db, 'users', userId), { disabled: !currentStatus });
    
    addDocumentNonBlocking(collection(db, 'logs'), {
      userId: user?.uid,
      action: 'user_status_toggled',
      targetId: userId,
      details: `Admin ${currentStatus ? 'enabled' : 'disabled'} user profile`,
      timestamp: serverTimestamp()
    });

    toast({ 
      title: currentStatus ? "User Enabled" : "User Disabled", 
      description: "The user account status has been updated." 
    });
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

  if (authLoading || verifying) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background space-y-4">
        <Loader2 className="animate-spin w-12 h-12 text-primary" />
        <p className="text-sm font-medium text-muted-foreground animate-pulse">Verifying Admin Access...</p>
      </div>
    );
  }

  if (!isVerifiedAdmin) return null;

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

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto h-auto p-1 bg-muted/50">
            <TabsTrigger value="users" className="gap-2 py-2">
              <UserCog className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="pitches" className="gap-2 py-2">
              <Megaphone className="w-4 h-4" /> Pitches
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 py-2">
              <Inbox className="w-4 h-4" /> Connections
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2 py-2">
              <ClipboardList className="w-4 h-4" /> Audit Logs
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
                            onClick={() => toggleUserStatus(u.id, !!u.disabled)}
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
                <CardTitle>System Audit Logs</CardTitle>
                <CardDescription>Track all major platform activities and security events.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLogs ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allLogs?.map((log) => (
                      <TableRow key={log.id} className="hover:bg-muted/5 transition-colors">
                        <TableCell className="text-xs whitespace-nowrap font-mono text-muted-foreground">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3" />
                            {log.timestamp?.toDate ? format(log.timestamp.toDate(), 'MMM d, HH:mm:ss') : 'Just now'}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {log.userId?.substring(0, 8)}...
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
