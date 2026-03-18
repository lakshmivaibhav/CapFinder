"use client";

import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, limit, doc } from 'firebase/firestore';
import { Navbar } from '@/components/navbar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Trash2, User, Megaphone, Inbox, MessageSquare, ShieldAlert, AlertTriangle, UserX, UserCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import Link from 'next/link';

export default function AdminDashboardPage() {
  const { user, profile, loading: authLoading } = useAuth();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!authLoading && (!user || profile?.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, profile, authLoading, router]);

  const usersQuery = useMemoFirebase(() => query(collection(db, 'users'), limit(100)), [db]);
  const pitchesQuery = useMemoFirebase(() => query(collection(db, 'pitches'), limit(100)), [db]);
  const requestsQuery = useMemoFirebase(() => query(collection(db, 'contactRequests'), limit(100)), [db]);
  const messagesQuery = useMemoFirebase(() => query(collection(db, 'messages'), limit(100)), [db]);

  const { data: allUsers, isLoading: loadingUsers } = useCollection(usersQuery);
  const { data: allPitches, isLoading: loadingPitches } = useCollection(pitchesQuery);
  const { data: allRequests, isLoading: loadingRequests } = useCollection(requestsQuery);
  const { data: allMessages, isLoading: loadingMessages } = useCollection(messagesQuery);

  const handleDeletePitch = (pitchId: string, name: string) => {
    if (confirm(`Are you sure you want to delete the pitch for "${name}"?`)) {
      deleteDocumentNonBlocking(doc(db, 'pitches', pitchId));
      toast({ title: "Pitch Deleted", description: `The pitch for ${name} has been removed.` });
    }
  };

  const handleDeleteUser = (userId: string, email: string) => {
    if (confirm(`Are you sure you want to delete the profile for "${email}"? This will not delete their Auth account.`)) {
      deleteDocumentNonBlocking(doc(db, 'users', userId));
      toast({ title: "User Profile Deleted", description: `The Firestore profile for ${email} has been removed.` });
    }
  };

  const toggleUserStatus = (userId: string, currentStatus: boolean) => {
    updateDocumentNonBlocking(doc(db, 'users', userId), { disabled: !currentStatus });
    toast({ 
      title: currentStatus ? "User Enabled" : "User Disabled", 
      description: "The user account status has been updated." 
    });
  };

  if (authLoading || (user && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="animate-spin w-12 h-12 text-primary" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <main className="flex-1 p-6 md:p-10 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <ShieldAlert className="w-8 h-8 text-destructive" />
              System Administration
            </h1>
            <p className="text-muted-foreground">Global oversight and platform management.</p>
          </div>
          <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-lg border border-destructive/20 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" /> High Privilege Access
          </div>
        </div>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-auto h-auto p-1 bg-muted/50">
            <TabsTrigger value="users" className="gap-2 py-2">
              <User className="w-4 h-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="pitches" className="gap-2 py-2">
              <Megaphone className="w-4 h-4" /> Pitches
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2 py-2">
              <Inbox className="w-4 h-4" /> Requests
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 py-2">
              <MessageSquare className="w-4 h-4" /> Messages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle>Global User Directory</CardTitle>
                <CardDescription>View and manage all registered accounts.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>User / Organization</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Active</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingUsers ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allUsers?.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <Link href={`/profile/${u.id}`} className="font-bold hover:underline">{u.name || 'Anonymous'}</Link>
                            <span className="text-xs text-muted-foreground">{u.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">{u.role}</Badge>
                        </TableCell>
                        <TableCell>
                          {u.disabled ? (
                            <Badge variant="destructive">Disabled</Badge>
                          ) : (
                            <Badge variant="secondary" className="bg-green-50 text-green-700">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {u.lastActive?.toDate ? format(u.lastActive.toDate(), 'MMM d, p') : 'Never'}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-1">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className={u.disabled ? "text-green-600 hover:bg-green-100" : "text-amber-600 hover:bg-amber-100"}
                            onClick={() => toggleUserStatus(u.id, !!u.disabled)}
                            title={u.disabled ? "Enable User" : "Disable User"}
                          >
                            {u.disabled ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            title="Delete Profile"
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
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle>Investment Marketplace Pitches</CardTitle>
                <CardDescription>Monitor all active startup proposals.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Startup Name</TableHead>
                      <TableHead>Industry</TableHead>
                      <TableHead>Goal</TableHead>
                      <TableHead>Posted By</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPitches ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allPitches?.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <Link href={`/pitches/${p.id}`} className="font-bold hover:underline">{p.startupName}</Link>
                        </TableCell>
                        <TableCell><Badge variant="secondary">{p.industry}</Badge></TableCell>
                        <TableCell className="font-mono text-primary font-bold">${p.fundingNeeded?.toLocaleString()}</TableCell>
                        <TableCell className="text-xs italic">UID: {p.ownerId?.substring(0, 8)}...</TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:bg-destructive/10"
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
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle>Contact Requests Log</CardTitle>
                <CardDescription>Oversight of platform connections and networking activity.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Entities</TableHead>
                      <TableHead>Target Startup</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRequests ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allRequests?.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs">
                          <div className="flex flex-col">
                            <span>From: {r.investorEmail}</span>
                            <span className="text-muted-foreground">To: {r.receiverId?.substring(0, 8)}...</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{r.startupName}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === 'accepted' ? 'default' : r.status === 'pending' ? 'secondary' : 'destructive'} className="capitalize">
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

          <TabsContent value="messages">
            <Card className="border-none shadow-sm overflow-hidden">
              <CardHeader className="bg-muted/10 border-b">
                <CardTitle>System Messages Log</CardTitle>
                <CardDescription>Compliance oversight of private platform communications.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-muted/30">
                    <TableRow>
                      <TableHead>Communication</TableHead>
                      <TableHead>Message Preview</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingMessages ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-10"><Loader2 className="animate-spin mx-auto" /></TableCell></TableRow>
                    ) : allMessages?.map((m) => (
                      <TableRow key={m.id}>
                        <TableCell className="text-[10px] leading-tight">
                          <div className="flex flex-col">
                            <span>S: {m.senderId?.substring(0, 8)}...</span>
                            <span>R: {m.receiverId?.substring(0, 8)}...</span>
                          </div>
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm italic">"{m.text}"</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] uppercase">{m.read ? 'Read' : 'Unread'}</Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {m.timestamp?.toDate ? format(m.timestamp.toDate(), 'HH:mm:ss') : 'N/A'}
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