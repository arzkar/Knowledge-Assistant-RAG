'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { authClient } from '@/lib/auth-client';
import { useAuthStore } from '@/store/auth';
import { MessageSquare, ShieldCheck, Zap, ArrowRight, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: z.infer<typeof loginSchema>) {
    setError(null);
    const { data, error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      setError(error.message || 'Login failed. Please check your credentials.');
      return;
    }

    if (data?.user) {
      setUser({ id: data.user.id, email: data.user.email });
      router.push('/documents');
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand Section - Hidden on Mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-slate-900" />
        <div className="absolute inset-0 opacity-10" 
             style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }} />
        
        <div className="relative z-10 px-12 text-primary-foreground max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary-foreground/10 rounded-xl backdrop-blur-sm border border-primary-foreground/20">
              <MessageSquare className="h-8 w-8" />
            </div>
            <span className="text-3xl font-bold tracking-tight">EcoReady AI</span>
          </div>
          
          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Elevate Your Knowledge <br /> 
            <span className="text-primary-foreground/70">With Production-Style RAG</span>
          </h1>
          
          <p className="text-xl text-primary-foreground/80 mb-10 leading-relaxed">
            Experience the power of contextual chunking, hybrid retrieval, and streaming LLM responses in one seamless platform.
          </p>
          
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Secure & Private</h3>
                <p className="text-primary-foreground/60 text-sm">Your data stays local with Ollama support.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Lightning Fast</h3>
                <p className="text-primary-foreground/60 text-sm">Hybrid search with Qdrant and OpenSearch.</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -bottom-24 -left-24 h-96 w-96 rounded-full bg-primary-foreground/5 blur-3xl" />
        <div className="absolute -top-24 -right-24 h-96 w-96 rounded-full bg-primary-foreground/5 blur-3xl" />
      </div>

      {/* Form Section */}
      <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-8 bg-background relative">
        <div className="w-full max-w-md space-y-8">
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <MessageSquare className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold tracking-tight">EcoReady AI</span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">Welcome back</h2>
            <p className="text-muted-foreground mt-2">
              Enter your credentials to access your workspace.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative group">
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@example.com"
                    className={cn(
                      "h-11 transition-all group-hover:border-primary/50 focus:border-primary",
                      form.formState.errors.email && "border-destructive"
                    )}
                    {...form.register('email')} 
                  />
                </div>
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive font-medium">{form.formState.errors.email.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link href="#" className="text-sm font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  placeholder="••••••••"
                  className={cn(
                    "h-11 transition-all hover:border-primary/50 focus:border-primary",
                    form.formState.errors.password && "border-destructive"
                  )}
                  {...form.register('password')} 
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive font-medium">{form.formState.errors.password.message}</p>
                )}
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm font-medium">
                {error}
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-11 text-base font-semibold group" 
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link 
              href="/auth/signup" 
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Create an account
            </Link>
          </p>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} EcoReady AI. All rights reserved.
        </div>
      </div>
    </div>
  );
}
