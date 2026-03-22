"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase, useAuth as useFirebaseAuth } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { LayoutDashboard, Search, User, LogOut, PlusCircle, Loader2, Inbox, ShieldAlert, Zap, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { user, profile, loading, emailVerified } = useAuth();
  const firebaseAuth = useFirebaseAuth();
  const pathname = usePathname();
  const router = useRouter();
  const db = useFirestore();

  const handleLogout = async () => {
    await firebaseAuth.signOut();
    router.push('/');
  };

  const pendingRequestsQuery = useMemoFirebase(() => {
    if (!user?.uid || !profile?.role || profile.disabled === true || !emailVerified) return null;
    return query(
      collection(db, 'contactRequests'),
      where('receiverId', '==', user.uid),
      where('status', '==', 'pending')
    );
  }, [db, user, profile, emailVerified]);

  const { data: pendingRequests } = useCollection(pendingRequestsQuery);
  const requestCount = pendingRequests?.length || 0;

  if (!user) return null;

  const isAdmin = profile?.role === 'admin';

  const navItems = [
    { label: 'Console', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Market', href: '/pitches', icon: Search },
    { 
      label: 'Hub', 
      href: '/messages', 
      icon: MessageSquare
    },
    { 
      label: 'Inquiries', 
      href: '/requests', 
      icon: Inbox, 
      badge: pathname === '/requests' ? 0 : requestCount, 
      show: profile?.role === 'startup' 
    },
    { 
      label: 'Admin', 
      href: '/admin', 
      icon: ShieldAlert, 
      show: isAdmin 
    },
    { label: 'Account', href: '/profile', icon: User },
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
                <item.icon className={cn("w-4 h-4", pathname === item.href ? "text-primary" : "text-muted-foreground")} />
                <span className="hidden xl:inline">{item.label}</span>
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

      <div className="flex items-center gap-2 md:gap-5">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground opacity-20" />
        ) : (
          <>
            {profile?.role === 'startup' && emailVerified && (
              <Link href="/pitches/new" className="hidden sm:block">
                <Button className="gap-2.5 h-11 px-4 md:px-6 rounded-xl bg-primary shadow-xl shadow-primary/20 hover:shadow-primary/30 transition-all font-black uppercase tracking-widest text-[10px]">
                  <PlusCircle className="w-4 h-4" />
                  <span className="hidden md:inline">New Venture</span>
                </Button>
              </Link>
            )}
            <div className="h-8 w-[1px] bg-muted mx-1 md:mx-2 hidden lg:block" />
            
            <div className="flex lg:hidden gap-1">
               {navItems.slice(0, 3).map((item) => (
                 <Link key={item.href} href={item.href}>
                   <Button variant="ghost" size="icon" className={cn("h-11 w-11 rounded-xl", pathname === item.href ? "bg-primary/10 text-primary" : "text-muted-foreground")}>
                     <item.icon className="w-5 h-5" />
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
