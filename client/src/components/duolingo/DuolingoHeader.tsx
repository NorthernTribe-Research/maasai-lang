import { useAuth } from "@/hooks/use-auth";
import { Flame, Zap, Menu, Heart, Settings, Gem } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQuery } from "@tanstack/react-query";

interface UserStats {
  hearts: number;
  maxHearts: number;
  xp: number;
  streak: number;
  gems?: number;
  unlimitedHearts?: boolean;
}

export function DuolingoHeader() {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user stats
  const { data: stats } = useQuery<UserStats>({
    queryKey: ["/api/user-stats/stats", user?.id],
    queryFn: async () => {
      const res = await fetch("/api/user-stats/stats");
      if (!res.ok) throw new Error("Failed to fetch stats");
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
      <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <img src="/logo-icon.png" alt="LinguaMaster" className="h-10 w-10 object-contain drop-shadow" />
          <span className="font-black text-primary text-lg hidden sm:block">LinguaMaster</span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          {/* Streak */}
          <div className="flex items-center gap-1.5 bg-orange-100 dark:bg-orange-900/30 px-3 py-1.5 rounded-full">
            <Flame className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {stats?.streak || user.streak || 0}
            </span>
          </div>

          {/* Hearts */}
          <div className="flex items-center gap-1.5 bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-full">
            <Heart className="h-5 w-5 text-red-500 fill-red-500" />
            <span className="text-sm font-bold text-red-600 dark:text-red-400">
              {stats?.unlimitedHearts ? "∞" : stats?.hearts || 5}
            </span>
          </div>

          {/* XP */}
          <div className="flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/30 px-3 py-1.5 rounded-full">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
              {stats?.xp || user.xp || 0}
            </span>
          </div>

          {/* Gems */}
          <div className="hidden sm:flex items-center gap-1.5 bg-cyan-100 dark:bg-cyan-900/30 px-3 py-1.5 rounded-full">
            <Gem className="h-5 w-5 text-cyan-500" />
            <span className="text-sm font-bold text-cyan-600 dark:text-cyan-400">
              {stats?.gems ?? 0}
            </span>
          </div>

          {/* Settings Quick Access */}
          <Button variant="ghost" size="icon" className="rounded-full text-neutral-500 hover:text-primary hidden md:inline-flex" onClick={() => setLocation("/settings")}>
            <Settings className="h-5 w-5" />
          </Button>

          {/* Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full text-neutral-500 hover:text-primary">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-2xl border-2 p-2 shadow-lg">
              <DropdownMenuItem onClick={() => setLocation("/profile")} className="cursor-pointer rounded-xl font-bold p-3">
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLocation("/settings")} className="cursor-pointer rounded-xl font-bold p-3">
                Settings
              </DropdownMenuItem>
              {user.isAdmin && (
                <DropdownMenuItem onClick={() => setLocation("/admin")} className="cursor-pointer rounded-xl font-bold p-3">
                  Admin Dashboard
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={logout} className="text-red-600 focus:bg-red-50 focus:text-red-700 cursor-pointer rounded-xl font-bold p-3">
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
