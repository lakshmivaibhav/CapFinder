
"use client";

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/components/auth-provider';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { auth as firebaseAuth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where } from 'firebase/firestore';
import { TrendingUp, LayoutDashboard, Search, User, LogOut, PlusCircle, Loader2, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export function Navbar() {
  const { user, profile, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const db = useFirestore();

  const handleLogout = async () => {
    await signOut(firebaseAuth);
    router.push('/');
  };

  // Fetch unread messages count
  const unreadMessagesQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(
      collection(db, 'messages'),
      where('receiverId', '==', user.uid),
      where('read', '==', false)
    );
  }, [db, user]);

  const { data: unreadMessages } = useCollection(unreadMessagesQuery);
  const unreadCount = unreadMessages?.length || 0;

  if (!user) return null;

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: pathname === '/pitches' ? 'Marketplace' : 'Browse', href: '/pitches', icon: Search },
    { label: 'Messages', href: '/messages', icon: MessageSquare, badge: unreadCount },
    { label: 'Profile', href: '/profile', icon: User },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/80 backdrop-blur-md px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <TrendingUp className="text-white w-5 h-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-primary">CapFinder</span>
        </Link>

        <div className="hidden md:flex items-center gap-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant="ghost"
                className={cn(
                  "gap-2 px-4 h-10 transition-all relative",
                  pathname === item.href ? "bg-primary/10 text-primary hover:bg-primary/20" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.badge && item.badge > 0 && (
                  <Badge 
                    className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-red-500 text-white border-white border-2"
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : (
          <>
            {profile?.role === 'startup' && (
              <Link href="/pitches/new" className="hidden sm:block">
                <Button size="sm" className="gap-2 bg-primary">
                  <PlusCircle className="w-4 h-4" />
                  New Pitch
                </Button>
              </Link>
            )}
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Logout" className="text-muted-foreground hover:text-destructive">
              <LogOut className="w-5 h-5" />
            </Button>
          </>
        )}
      </div>
    </nav>
  );
}
