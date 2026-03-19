"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, useAuth as useFirebaseAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where } from 'firebase/firestore';
import { TrendingUp, LayoutDashboard, Search, User, LogOut, PlusCircle, Loader2, MessageSquare, Inbox, ShieldAlert, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { user, profile, loading } = useAuth();
  const firebaseAuth = useFirebaseAuth();
  const pathname = usePathname();
  const router = useRouter();
  const db = useFirestore();

  const handleLogout = async () => {
    await signOut(firebaseAuth);
    router.push('/');
  };

  const unreadMessagesQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile?.role || profile.disabled === true) return null;
    return query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );
  }, [db, user, profile]);

  const { data: unreadMessages } = useCollection(unreadMessagesQuery);
  const unreadCount = unreadMessages?.length || 0;

  const pendingRequestsQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile?.role || profile.disabled === true) return null;
    return query(
      collection(db, 'contactRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [db, user, profile]);

  const { data: pendingRequests } = useCollection(pendingRequestsQuery);
  const requestCount = pendingRequests?.length || 0;

  if (!user) return null;

  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { label: 'Console', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Market Feed', href: '/pitches', icon: Search },
    { 
      label: 'Inquiries', 
      href: '/requests', 
      icon: Inbox, 
      badge: pathname === '/requests' ? 0 : requestCount, 
      show: profile?.role === 'startup' 
    },
    { 
      label: 'Secure Chat', 
      href: '/messages', 
      icon: MessageSquare, 
      badge: pathname === '/messages' ? 0 : unreadCount 
    },
    { 
      label: 'Admin', 
      href: '/admin', 
      icon: ShieldAlert, 
      show: isAdmin 
    },
    { label: 'Account', href: '/profile', icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/70 backdrop-blur-xl px-8 h-20 flex items-center justify-between">
      <div className="flex items-center gap-12">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
            <Zap className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-foreground group-hover:text-primary transition-colors">CapFinder</span>
        </Link>

        <div className="hidden lg:flex items-center gap-2">
          {navItems.filter(item => item.show !== false).map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "gap-2.5 px-6 h-12 rounded-xl transition-all relative font-black uppercase tracking-widest text-[10px]",
                  pathname === item.href 
                    ? "bg-primary/10 text-primary shadow-inner" 
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-4 h-4", pathname === item.href ? "text-primary" : "text-muted-foreground")} />
                {item.label}
                {item.badge && item.badge > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 min-w-5 p-1 flex items-center justify-center bg-accent text-white border-2 border-white shadow-lg animate-bounce"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-5">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground opacity-20" />
        ) : (
          <>
            {profile?.role === 'startup' && (
              <Link href="/pitches/new" className="hidden sm:block">
                <Button className="gap-2.5 h-11 px-6 rounded-xl bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-black uppercase tracking-widest text-[10px]">
                  <PlusCircle className="w-4 h-4" />
                  New Venture
                </Button>
              </Link>
            )}
            <div className="h-8 w-[1px] bg-muted mx-2 hidden lg:block" />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="h-11 w-11 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all">
              <LogOut className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
