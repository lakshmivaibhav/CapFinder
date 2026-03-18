"use client";

import { useState, useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, where, orderBy, limit, doc } from 'firebase/firestore';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, CheckCircle2, MessageSquare, Briefcase, TrendingUp, Sparkles, Trash2, Loader2, ShieldAlert, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

export function NotificationCenter() {
  const { user, profile } = useAuth();
  const db = useFirestore();
  const [open, setOpen] = useState(false);

  // Load all notifications for this user, strictly filtered by userId and deferred until panel open.
  // reinforced guard: ensure user and authorized profile exist before querying
  const notificationsQuery = useMemoFirebase(() => {
    if (!open || !user?.uid || !profile) return null;
    
    return query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [db, user?.uid, profile, open]);

  const { data: notifications, isLoading } = useCollection(notificationsQuery);
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  useEffect(() => {
    if (open && unreadCount > 0 && notifications) {
      notifications.forEach(n => {
        if (!n.read) {
          updateDocumentNonBlocking(doc(db, 'notifications', n.id), { read: true });
        }
      });
    }
  }, [open, unreadCount, notifications, db]);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDocumentNonBlocking(doc(db, 'notifications', id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'interest': return <TrendingUp className="w-4 h-4 text-emerald-500" />;
      case 'contact_request': return <Briefcase className="w-4 h-4 text-primary" />;
      case 'contact_accepted': return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'message': return <MessageSquare className="w-4 h-4 text-accent" />;
      case 'system': return <ShieldAlert className="w-4 h-4 text-destructive" />;
      case 'delete_blocked': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      default: return <Sparkles className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white border-white border-2 animate-in zoom-in duration-300">
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b bg-muted/10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <SheetTitle className="text-xl font-bold">Activity Notifications</SheetTitle>
          </div>
          <SheetDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
            Stay updated with your latest platform connections
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 bg-white">
          {isLoading ? (
            <div className="p-10 text-center flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Loading alerts...</p>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((n) => (
                <div 
                  key={n.id} 
                  className={cn(
                    "p-5 group hover:bg-muted/30 transition-all flex gap-4 items-start relative",
                    !n.read && "bg-primary/5 border-l-4 border-primary"
                  )}
                >
                  <div className="w-9 h-9 rounded-xl bg-white border shadow-sm flex items-center justify-center shrink-0">
                    {getIcon(n.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className={cn("text-sm leading-relaxed", !n.read ? "font-bold text-foreground" : "text-muted-foreground")}>
                      {n.text}
                    </p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                      <Clock className="w-3 h-3" />
                      {n.timestamp?.toDate ? formatDistanceToNow(n.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                    </div>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                    onClick={(e) => handleDelete(n.id, e)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-20 text-center space-y-4">
              <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto opacity-40">
                <Bell className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">No notifications yet.</p>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}