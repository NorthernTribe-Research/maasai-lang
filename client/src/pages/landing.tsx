import { Link } from "wouter";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Sparkles, Globe2, Trophy, Brain, Mic, Flame,
  Star, ChevronRight, BookOpen, Zap, Users
} from "lucide-react";

const LANGUAGES = [
  { name: "Spanish", flag: "🇪🇸", learners: "500M+" },
  { name: "Mandarin", flag: "🇨🇳", learners: "1.1B+" },
  { name: "English", flag: "🇬🇧", learners: "1.5B+" },
  { name: "Hindi", flag: "🇮🇳", learners: "600M+" },
  { name: "Arabic", flag: "🇸🇦", learners: "400M+" },
];

const FEATURES = [
  {
    icon: Brain,
    title: "AI-Powered Lessons",
    desc: "Gemini AI adapts every lesson to your pace, style, and goals in real time.",
    color: "text-purple-500",
    bg: "bg-purple-50 dark:bg-purple-900/20",
  },
  {
    icon: Mic,
    title: "Voice & Pronunciation",
    desc: "Speak with an AI teacher and get instant pronunciation coaching.",
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-900/20",
  },
  {
    icon: Trophy,
    title: "Gamified Progress",
    desc: "Earn XP, maintain streaks, unlock achievements, and climb leaderboards.",
    color: "text-yellow-500",
    bg: "bg-yellow-50 dark:bg-yellow-900/20",
  },
  {
    icon: Globe2,
    title: "Cultural Immersion",
    desc: "Learn real-world context, customs, and cultural nuances alongside language.",
    color: "text-emerald-500",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
  },
];

const STATS = [
  { value: "5", label: "Languages", icon: Globe2 },
  { value: "50K+", label: "Learners", icon: Users },
  { value: "10K+", label: "Lessons", icon: BookOpen },
  { value: "98%", label: "Satisfaction", icon: Star },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {/* ── NAV ── */}
      <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="LinguaMaster" className="h-10 w-10 object-contain drop-shadow" />
            <span className="text-xl font-black text-primary tracking-tight">LinguaMaster</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth">
              <Button variant="ghost" className="font-bold text-base hidden sm:inline-flex">Sign In</Button>
            </Link>
            <Link href="/auth">
              <Button className="font-bold text-base rounded-xl px-6 h-10 shadow-md border-b-4 border-primary/70 active:border-b-0 active:translate-y-0.5 transition-all">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-20 pb-24 flex flex-col lg:flex-row items-center gap-16">
          {/* Text */}
          <motion.div
            className="flex-1 text-center lg:text-left"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Language Learning
            </div>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black leading-[1.05] mb-6 tracking-tight">
              Speak the World's{" "}
              <span className="text-primary relative">
                Languages
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" fill="none">
                  <path d="M2 10 Q150 2 298 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary/40" />
                </svg>
              </span>
            </h1>
            <p className="text-xl text-muted-foreground font-medium leading-relaxed mb-10 max-w-xl mx-auto lg:mx-0">
              Master Mandarin, Spanish, English, Hindi, and Arabic with AI-personalized lessons, voice coaching, and gamified progress tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link href="/auth">
                <Button size="lg" className="w-full sm:w-auto h-14 px-10 text-lg font-black rounded-2xl shadow-xl border-b-4 border-primary/70 active:border-b-0 active:translate-y-1 transition-all">
                  Start for Free
                  <ChevronRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link href="/auth">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-10 text-lg font-bold rounded-2xl border-2 hover:bg-primary/5 transition-all">
                  Sign In
                </Button>
              </Link>
            </div>
            {/* Social proof */}
            <div className="mt-8 flex items-center gap-3 justify-center lg:justify-start">
              <div className="flex -space-x-2">
                {["🧑‍💻","👩‍🎓","🧑‍🏫","👨‍💼","👩‍🔬"].map((e, i) => (
                  <div key={i} className="w-9 h-9 rounded-full bg-primary/20 border-2 border-background flex items-center justify-center text-base">{e}</div>
                ))}
              </div>
              <p className="text-sm font-semibold text-muted-foreground">
                <span className="text-foreground font-black">50,000+</span> learners worldwide
              </p>
            </div>
          </motion.div>

          {/* Parrot Hero Card */}
          <motion.div
            className="flex-1 flex justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="relative">
              {/* Glow ring */}
              <div className="absolute inset-0 bg-primary/20 rounded-[3rem] blur-2xl scale-110" />
              <div className="relative bg-gradient-to-br from-primary to-primary/80 rounded-[3rem] p-10 shadow-2xl border border-primary/30">
                <img
                  src="/logo-icon.png"
                  alt="LinguaMaster Parrot"
                  className="w-56 h-56 object-contain drop-shadow-2xl"
                />
                {/* Floating badges */}
                <motion.div
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                  className="absolute -top-4 -right-4 bg-yellow-400 text-yellow-900 font-black text-sm px-4 py-2 rounded-2xl shadow-lg border-2 border-yellow-300 flex items-center gap-1"
                >
                  <Flame className="w-4 h-4" /> 7-day streak!
                </motion.div>
                <motion.div
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut", delay: 0.5 }}
                  className="absolute -bottom-4 -left-4 bg-emerald-400 text-emerald-900 font-black text-sm px-4 py-2 rounded-2xl shadow-lg border-2 border-emerald-300 flex items-center gap-1"
                >
                  <Zap className="w-4 h-4" /> +50 XP earned!
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-primary py-12">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="text-center text-primary-foreground"
            >
              <s.icon className="w-7 h-7 mx-auto mb-2 opacity-80" />
              <p className="text-4xl font-black">{s.value}</p>
              <p className="text-sm font-semibold opacity-80 uppercase tracking-wider">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── LANGUAGES ── */}
      <section className="py-20 bg-muted/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl font-black mb-3">Choose Your Language</h2>
          <p className="text-muted-foreground text-lg mb-12 font-medium">Five of the world's most spoken languages, taught by AI</p>
          <div className="flex flex-wrap justify-center gap-4">
            {LANGUAGES.map((lang, i) => (
              <motion.div
                key={i}
                whileHover={{ scale: 1.06, y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="bg-card border-2 border-border hover:border-primary/40 rounded-2xl px-8 py-6 shadow-sm cursor-pointer transition-all group"
              >
                <div className="text-5xl mb-3">{lang.flag}</div>
                <p className="font-black text-lg group-hover:text-primary transition-colors">{lang.name}</p>
                <p className="text-xs text-muted-foreground font-semibold mt-1">{lang.learners} speakers</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-black mb-3">Everything You Need to Succeed</h2>
            <p className="text-muted-foreground text-lg font-medium">Built with cutting-edge AI to make language learning actually stick</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-card border-2 border-border rounded-2xl p-8 hover:border-primary/30 hover:shadow-lg transition-all group"
              >
                <div className={`${f.bg} w-14 h-14 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                  <f.icon className={`w-7 h-7 ${f.color}`} />
                </div>
                <h3 className="text-xl font-black mb-2">{f.title}</h3>
                <p className="text-muted-foreground font-medium leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 bg-gradient-to-br from-primary to-primary/80 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary-foreground/10 to-transparent pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <img src="/logo-icon.png" alt="LinguaMaster" className="w-24 h-24 mx-auto mb-6 drop-shadow-2xl" />
          <h2 className="text-4xl sm:text-5xl font-black text-primary-foreground mb-4 leading-tight">
            Ready to Start Your Journey?
          </h2>
          <p className="text-primary-foreground/80 text-xl font-medium mb-10">
            Join thousands of learners mastering new languages with AI. Free to start, forever.
          </p>
          <Link href="/auth">
            <Button
              size="lg"
              className="h-16 px-14 text-xl font-black rounded-2xl bg-white text-primary hover:bg-white/90 shadow-2xl border-b-4 border-white/50 active:border-b-0 active:translate-y-1 transition-all"
            >
              Start Learning Free
              <ChevronRight className="ml-2 w-6 h-6" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="bg-background border-t border-border py-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src="/logo-icon.png" alt="LinguaMaster" className="h-8 w-8 object-contain" />
            <span className="font-black text-primary">LinguaMaster</span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">
            © {new Date().getFullYear()} NorthernTribe Research. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm font-semibold text-muted-foreground">
            <Link href="/auth"><span className="hover:text-primary cursor-pointer transition-colors">Sign In</span></Link>
            <Link href="/auth"><span className="hover:text-primary cursor-pointer transition-colors">Register</span></Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
