"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { useAuth as useFirebaseAuth, useFirestore, errorEmitter, FirestorePermissionError } from '@/firebase';
import { LayoutDashboard, Search, User, LogOut, PlusCircle, Loader2, Inbox, Zap, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { collection, query, where, onSnapshot, getDocs, writeBatch, doc } from 'firebase/firestore';

export function Navbar() {
  const { user, profile, loading, emailVerified } = useAuth();
  const firebaseAuth = useFirebaseAuth();
  const db = useFirestore();
  const pathname = usePathname();
  const router = useRouter();
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);

  // Clear unread indicator and mark messages as read when user navigates to the messages page
  useEffect(() => {
    if (pathname === '/messages' && user?.uid) {
      setHasUnreadMessages(false);
      
      // Batch update unread messages to read status in the database
      const markMessagesAsRead = async () => {
        try {
          const q = query(
            collection(db, 'messages'),
            where('receiverId', '==', user.uid),
            where('read', '==', false)
          );
          const snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const batch = writeBatch(db);
            snapshot.docs.forEach((d) => {
              batch.update(doc(db, 'messages', d.id), { read: true });
            });
            await batch.commit();
          }
        } catch (error) {
          console.error("Failed to sync message read status:", error);
        }
      };
      markMessagesAsRead();
    }
  }, [pathname, user, db]);

  // Real-time listener for incoming unread communications
  useEffect(() => {
    if (!user?.uid || pathname === '/messages') {
      if (pathname === '/messages') setHasUnreadMessages(false);
      return;
    }

    const q = query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        // Update presence indicator if not currently in the inbox
        if (pathname !== '/messages') {
          setHasUnreadMessages(snapshot.size > 0);
        }
      },
      async (error) => {
        const permissionError = new FirestorePermissionError({
          path: 'messages',
          operation: 'list',
        });
        errorEmitter.emit('permission-error', permissionError);
      }
    );

    return () => unsubscribe();
  }, [user, db, pathname]);

  const handleLogout = async () => {
    await firebaseAuth.signOut();
    router.push('/');
  };

  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Explore', href: '/pitches', icon: Search },
    { 
      label: 'Messages', 
      href: '/messages', 
      icon: MessageSquare
    },
    { 
      label: 'Requests', 
      href: '/requests', 
      icon: Inbox, 
      show: profile?.role === 'startup' 
    },
    { label: 'Profile', href: '/profile', icon: User },
  ].filter(item => {
    if (item.show === false) return false;
    if (!emailVerified && item.href !== '/profile' && item.href !== '/dashboard') return false;
    return true;
  });

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/70 backdrop-blur-xl px-4 md:px-8 h-20 flex items-center justify-between">
      <div className="flex items-center gap-4 md:gap-12 overflow-hidden">
        <Link href="/dashboard" className="flex items-center gap-2 md:gap-3 group shrink-0">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            <Zap className="text-white w-5 h-5 md:w-6 md:h-6" />
          </div>
          <span className="text-xl md:text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors hidden sm:block">CapFinder</span>
        </Link>

        <div className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "gap-2.5 px-4 md:px-6 h-12 rounded-xl transition-all relative font-black uppercase tracking-widest text-[10px]",
                  pathname === item.href 
                    ? "bg-primary/10 text-primary shadow-inner" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <div className="relative">
                  <item.icon className={cn("w-4 h-4", pathname === item.href ? "text-primary" : "text-muted-foreground")} />
                  {hasUnreadMessages && item.href === '/messages' && (
                    <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive border-2 border-white shadow-sm animate-in zoom-in duration-300" />
                  )}
                </div>
                <span className="hidden xl:inline">{item.label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-5">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground opacity-20" />
        ) : (
          <>
            {profile?.role === 'startup' && emailVerified && (
              <Link href="/pitches/new" className="hidden sm:block">
                <Button className="gap-2.5 h-11 px-4 md:px-6 rounded-xl bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-black uppercase tracking-widest text-[10px]">
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden md:inline">New Pitch</span>
                </Button>
              </Link>
            )}
            <div className="h-8 w-[1px] bg-muted mx-1 md:mx-2 hidden lg:block" />
            
            <div className="flex lg:hidden gap-1">
               {navItems.slice(0, 3).map((item) => (
                 <Link key={item.href} href={item.href}>
                   <Button variant="ghost" size="icon" className={cn("h-11 w-11 rounded-xl relative", pathname === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
                     <div className="relative">
                       <item.icon className="w-5 h-5" />
                       {hasUnreadMessages && item.href === '/messages' && (
                         <div className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-destructive border-2 border-white shadow-sm animate-in zoom-in duration-300" />
                       )}
                     </div>
                   </Button>
                 </Link>
               ))}
               <Link href="/profile">
                 <Button variant="ghost" size="icon" className={cn("h-11 w-11 rounded-xl", pathname === '/profile' ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
                   <User className="w-5 h-5" />
                 </Button>
               </Link>
            </div>

            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
              <LogOut className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
