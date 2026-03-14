'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { Library, MessageSquare, LogOut } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const isAuthPage = pathname.startsWith('/auth');

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        {!isAuthPage && user && (
          <nav className="border-b bg-background h-16 flex items-center px-8 justify-between sticky top-0 z-50">
            <div className="flex items-center gap-8">
              <span className="font-bold text-xl tracking-tight">EcoReady AI</span>
              <div className="flex items-center gap-4">
                <Button 
                  variant={pathname === '/documents' ? 'default' : 'ghost'} 
                  onClick={() => router.push('/documents')}
                  className="flex items-center gap-2"
                >
                  <Library className="h-4 w-4" />
                  Documents
                </Button>
                <Button 
                  variant={pathname === '/query' ? 'default' : 'ghost'} 
                  onClick={() => router.push('/query')}
                  className="flex items-center gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  Assistant
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground">{user.email}</span>
              <Button variant="outline" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </nav>
        )}
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>
      </body>
    </html>
  );
}
