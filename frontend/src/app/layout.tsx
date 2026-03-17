'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { Library, MessageSquare, LogOut, Sun, Moon, Leaf } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';
import { ThemeProvider } from '@/components/theme-provider';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const inter = Inter({ subsets: ['latin'] });

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="rounded-full"
    >
      {theme === 'dark' ? <Sun className="h-[1.2rem] w-[1.2rem]" /> : <Moon className="h-[1.2rem] w-[1.2rem]" />}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}

function Navigation() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  if (!user) return null;

  return (
    <nav className="glass h-16 flex items-center px-8 justify-between sticky top-0 z-50">
      <div className="flex items-center gap-10">
        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => router.push('/')}>
          <div className="p-1.5 bg-primary rounded-lg">
            <Leaf className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-bold text-xl tracking-tight">EcoReady AI</span>
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant={pathname === '/documents' ? 'secondary' : 'ghost'} 
            onClick={() => router.push('/documents')}
            className="flex items-center gap-2 font-medium"
          >
            <Library className="h-4 w-4" />
            Documents
          </Button>
          <Button 
            variant={pathname === '/query' ? 'secondary' : 'ghost'} 
            onClick={() => router.push('/query')}
            className="flex items-center gap-2 font-medium"
          >
            <MessageSquare className="h-4 w-4" />
            Assistant
          </Button>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-end mr-2">
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Workspace</span>
          <span className="text-sm font-semibold">{user.email.split('@')[0]}</span>
        </div>
        <div className="h-8 w-[1px] bg-border mx-2" />
        <ThemeToggle />
        <Button variant="outline" size="icon" onClick={handleLogout} className="rounded-full hover:bg-destructive hover:text-destructive-foreground transition-colors">
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </nav>
  );
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const isAuthPage = pathname.startsWith('/auth');

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.className, "subtle-grid min-h-screen bg-background")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {!isAuthPage && <Navigation />}
          <main className={cn(
            "relative",
            !isAuthPage && user ? "min-h-[calc(100vh-64px)] container mx-auto p-8" : "min-h-screen"
          )}>
            {children}
          </main>
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
