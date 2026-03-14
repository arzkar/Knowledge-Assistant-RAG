'use client';

import { Inter } from 'next/font/google';
import './globals.css';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { Library, MessageSquare, LogOut } from 'lucide-react';

const inter = Inter({ subsets: ['latin'] });

import { Toaster } from '@/components/ui/sonner';

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
...
        )}
        <main className="min-h-[calc(100vh-64px)]">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
