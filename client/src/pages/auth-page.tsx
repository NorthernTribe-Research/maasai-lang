import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertUserSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Loader2, Globe2, BookOpen, Trophy, Sparkles, Flame, ChevronLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const registerSchema = insertUserSchema.extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  displayName: z.string().optional().or(z.literal("")),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const inputCls =
  "h-14 px-4 text-base border-2 rounded-xl bg-neutral-50 dark:bg-neutral-900 focus-visible:ring-0 focus-visible:border-primary transition-colors placeholder:text-muted-foreground/60";
const btnCls =
  "w-full h-14 text-base font-black uppercase tracking-wide rounded-xl shadow-lg border-b-4 border-primary/70 active:border-b-0 active:translate-y-1 transition-all";

export default function AuthPage() {
  const { user, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState<"login" | "register">("register");
  const [, navigate] = useLocation();

  const loginForm = useForm<z.infer<typeof loginSchema>>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: "", password: "" },
  });

  const registerForm = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", password: "", confirmPassword: "", email: "", displayName: "" },
  });

  useEffect(() => {
    if (user) navigate("/");
  }, [user, navigate]);

  const onLoginSubmit = (values: z.infer<typeof loginSchema>) => {
    loginMutation.mutate(values);
  };

  const onRegisterSubmit = (values: z.infer<typeof registerSchema>) => {
    const { confirmPassword, ...userValues } = values;
    registerMutation.mutate(userValues);
  };

  return (
    <div className="min-h-screen flex w-full bg-background overflow-hidden">
      {/* ── FORM SIDE ── */}
      <div className="w-full lg:w-[48%] flex flex-col justify-center items-center p-6 sm:p-12 relative z-10">
        <div className="absolute top-6 left-6">
          <Link href="/landing">
            <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground font-semibold rounded-xl">
              <ChevronLeft className="w-4 h-4" /> Back
            </Button>
          </Link>
        </div>

        <div className="w-full max-w-sm">
          <div className="flex items-center justify-center lg:justify-start gap-3 mb-10">
            <img src="/logo-icon.png" alt="LinguaMaster" className="h-14 w-14 object-contain drop-shadow-md" />
            <h1 className="text-3xl font-black tracking-tight text-foreground">LinguaMaster</h1>
          </div>

          <div className="mb-8">
            <h2 className="text-3xl font-extrabold mb-2">
              {activeTab === "login" ? "Welcome back!" : "Join for free"}
            </h2>
            <p className="text-muted-foreground font-medium">
              {activeTab === "login"
                ? "Continue your language learning journey."
                : "Start mastering a new language today."}
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "login" | "register")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-8 bg-neutral-100 dark:bg-neutral-800 rounded-xl p-1">
              <TabsTrigger value="login" className="rounded-lg font-bold text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="rounded-lg font-bold text-sm data-[state=active]:bg-white dark:data-[state=active]:bg-neutral-900 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all">Create Account</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <AnimatePresence mode="wait">
                <motion.div key="login" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }} transition={{ duration: 0.25 }}>
                  <Form {...loginForm}>
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <FormField control={loginForm.control} name="username" render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="Username" className={inputCls} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={loginForm.control} name="password" render={({ field }) => (
                        <FormItem><FormControl><Input type="password" placeholder="Password" className={inputCls} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <Button type="submit" className={btnCls} disabled={loginMutation.isPending}>
                        {loginMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              </AnimatePresence>
            </TabsContent>

            <TabsContent value="register">
              <AnimatePresence mode="wait">
                <motion.div key="register" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.25 }}>
                  <Form {...registerForm}>
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-3">
                      <FormField control={registerForm.control} name="username" render={({ field }) => (
                        <FormItem><FormControl><Input placeholder="Username" className={inputCls} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={registerForm.control} name="email" render={({ field }) => (
                        <FormItem><FormControl><Input type="email" placeholder="Email (optional)" className={inputCls} {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={registerForm.control} name="password" render={({ field }) => (
                        <FormItem><FormControl><Input type="password" placeholder="Password" className={inputCls} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <FormField control={registerForm.control} name="confirmPassword" render={({ field }) => (
                        <FormItem><FormControl><Input type="password" placeholder="Confirm Password" className={inputCls} {...field} /></FormControl><FormMessage /></FormItem>
                      )} />
                      <Button type="submit" className={btnCls} disabled={registerMutation.isPending}>
                        {registerMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Create Account"}
                      </Button>
                    </form>
                  </Form>
                </motion.div>
              </AnimatePresence>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── HERO SIDE ── */}
      <div className="hidden lg:flex flex-1 relative bg-gradient-to-br from-primary via-primary to-primary/80 items-center justify-center p-12 overflow-hidden">
        <div className="absolute top-16 left-16 w-40 h-40 bg-white/10 rounded-3xl rotate-12 blur-sm" />
        <div className="absolute bottom-24 right-16 w-56 h-56 bg-white/10 rounded-full blur-md" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_60%_40%,_rgba(255,255,255,0.08)_0%,_transparent_70%)]" />

        <div className="relative z-10 w-full max-w-md text-primary-foreground">
          <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8 }} className="flex justify-center mb-10">
            <div className="relative">
              <div className="absolute inset-0 bg-white/20 rounded-full blur-2xl scale-125" />
              <img src="/logo-icon.png" alt="LinguaMaster" className="relative w-40 h-40 object-contain drop-shadow-2xl" />
              <motion.div animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 3 }} className="absolute -top-3 -right-3 bg-yellow-400 text-yellow-900 font-black text-xs px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" /> 7-day streak!
              </motion.div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.7 }}>
            <div className="inline-flex items-center gap-2 bg-white/20 px-4 py-2 rounded-full font-bold uppercase tracking-widest text-xs mb-5 border border-white/30">
              <Sparkles className="w-3.5 h-3.5" /> The ultimate learning adventure
            </div>
            <h2 className="text-4xl lg:text-5xl font-black leading-[1.1] mb-5 drop-shadow">
              Master Languages with <span className="text-emerald-300">LinguaMaster</span>
            </h2>
            <p className="text-lg font-medium text-primary-foreground/85 leading-relaxed mb-8">
              AI-personalized lessons, voice coaching, gamified streaks, and cultural immersion — all in one place.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5, duration: 0.7 }} className="grid gap-4">
            {[
              { icon: BookOpen, title: "AI Personalization", desc: "Adapts to your pace and style", color: "text-blue-400" },
              { icon: Trophy, title: "Gamified Progress", desc: "XP, streaks, and achievements", color: "text-yellow-400" },
              { icon: Globe2, title: "5 Top Languages", desc: "Mandarin, Spanish, English, Hindi, Arabic", color: "text-emerald-400" },
            ].map((f, i) => (
              <motion.div key={i} whileHover={{ x: 8 }} className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-sm cursor-default">
                <div className="bg-white/20 p-2.5 rounded-xl shrink-0">
                  <f.icon className={`w-5 h-5 ${f.color}`} />
                </div>
                <div>
                  <p className="font-bold text-sm">{f.title}</p>
                  <p className="text-primary-foreground/70 text-xs font-medium">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
