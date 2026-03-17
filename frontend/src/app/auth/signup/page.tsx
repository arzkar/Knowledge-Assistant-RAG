"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import {
  MessageSquare,
  Rocket,
  Database,
  ArrowRight,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof signupSchema>>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof signupSchema>) {
    setError(null);
    const { data, error } = await authClient.signUp.email({
      email: values.email,
      password: values.password,
      name: values.name,
    });

    if (error) {
      setError(error.message || "Signup failed. Please try again.");
      return;
    }

    if (data?.user) {
      router.push("/auth/login");
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Brand Section - Hidden on Mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-primary items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary/90 to-slate-900" />
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 px-12 text-primary-foreground max-w-xl">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-primary-foreground/10 rounded-xl backdrop-blur-sm border border-primary-foreground/20">
              <MessageSquare className="h-8 w-8" />
            </div>
            <span className="text-3xl font-bold tracking-tight">
              Knowledge Assistant AI
            </span>
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight mb-6 leading-tight">
            Start Your Journey <br />
            <span className="text-primary-foreground/70">Into Advanced AI</span>
          </h1>

          <p className="text-xl text-primary-foreground/80 mb-10 leading-relaxed">
            Join thousands of researchers and developers building the future of
            document intelligence.
          </p>

          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
                <Rocket className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Quick Onboarding</h3>
                <p className="text-primary-foreground/60 text-sm">
                  Get up and running in less than 2 minutes.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Centralized Knowledge</h3>
                <p className="text-primary-foreground/60 text-sm">
                  Organize all your documents in one secure place.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/10 flex items-center justify-center border border-primary-foreground/20">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Ready for Production</h3>
                <p className="text-primary-foreground/60 text-sm">
                  Saga-based pipelines for reliable ingestion.
                </p>
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
            <span className="text-2xl font-bold tracking-tight">
              Knowledge Assistant AI
            </span>
          </div>

          <div className="text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight">
              Create an account
            </h2>
            <p className="text-muted-foreground mt-2">
              Join Knowledge Assistant AI and start managing your knowledge base
              today.
            </p>
          </div>

          <form
            method="POST"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-6"
          >
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className={cn(
                    "h-11 transition-all hover:border-primary/50 focus:border-primary",
                    form.formState.errors.name && "border-destructive",
                  )}
                  {...form.register("name")}
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive font-medium">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className={cn(
                    "h-11 transition-all hover:border-primary/50 focus:border-primary",
                    form.formState.errors.email && "border-destructive",
                  )}
                  {...form.register("email")}
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-destructive font-medium">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className={cn(
                    "h-11 transition-all hover:border-primary/50 focus:border-primary",
                    form.formState.errors.password && "border-destructive",
                  )}
                  {...form.register("password")}
                />
                {form.formState.errors.password && (
                  <p className="text-sm text-destructive font-medium">
                    {form.formState.errors.password.message}
                  </p>
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
                  Creating account...
                </>
              ) : (
                <>
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/auth/login"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              Sign in instead
            </Link>
          </p>
        </div>

        {/* Footer info */}
        <div className="absolute bottom-8 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Knowledge Assistant AI. All rights
          reserved.
        </div>
      </div>
    </div>
  );
}
