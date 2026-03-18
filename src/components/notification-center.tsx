
"use client";

import { useAuth } from '@/components/auth-provider';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell } from 'lucide-react';

/**
 * DECOMMISSIONED: This component is no longer used for notifications.
 * It remains as a shell to prevent import errors but performs no queries.
 */
export function NotificationCenter() {
  const { user } = useAuth();

  if (!user) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-primary transition-colors">
          <Bell className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-6 border-b bg-muted/10">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            <SheetTitle className="text-xl font-bold">Activity</SheetTitle>
          </div>
          <SheetDescription className="text-xs uppercase tracking-widest font-bold text-muted-foreground">
            Platform activity updates
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-20 text-center space-y-4">
            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mx-auto opacity-40">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No activity yet.</p>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
