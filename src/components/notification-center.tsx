"use client";

import { useState } from 'react';
import { useAuth } from '@/components/auth-provider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, Sparkles, Clock, Circle } from 'lucide-react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';

export function NotificationCenter() {
  const { user, profile } = useAuth();
  const db = useFirestore();
  const [open, setOpen] = useState(false);

  // Notifications system enabled with strict identity filtering to resolve permission errors
  const notificationsQuery = useMemoFirebase(() => {
    // Only query if the sheet is open AND we have a valid user identity
    if (!open || !user?.uid) return null;
    return query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc'),
      limit(50)
    );
  }, [db, user, open]);

  const { data: notifications, isLoading } = useCollection(notificationsQuery);
  
  // Count unread for the badge (requires a separate background count or just using the loaded list)
  const unreadCount = notifications?.filter(n => !n.read).length || 0;

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-[10px] text-white items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            </span>
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
            <div className="p-20 text-center">
              <Circle className="w-8 h-8 text-primary animate-pulse mx-auto" />
              <p className="mt-4 text-sm text-muted-foreground">Syncing alerts...</p>
            </div>
          ) : notifications && notifications.length > 0 ? (
            <div className="divide-y">
              {notifications.map((notif) => (
                <div key={notif.id} className={`p-6 hover:bg-muted/30 transition-colors relative ${!notif.read ? 'bg-primary/5' : ''}`}>
                  {!notif.read && <div className="absolute left-2 top-1/2 -translate-y-1/2 w-1 h-1 bg-primary rounded-full" />}
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-relaxed">{notif.text}</p>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {notif.timestamp?.toDate ? formatDistanceToNow(notif.timestamp.toDate(), { addSuffix: true }) : 'Just now'}
                      <Badge variant="outline" className="text-[9px] uppercase h-4 px-1">{notif.type}</Badge>
                    </div>
                  </div>
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