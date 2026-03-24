import { Link, useLocation } from "wouter";
import { Home, Dumbbell, Trophy, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  icon: React.ReactNode;
  label: string;
  href: string;
}

export function BottomNav() {
  const [location] = useLocation();

  const navItems: NavItem[] = [
    { icon: <Home className="h-6 w-6" />, label: "Learn", href: "/" },
    { icon: <Dumbbell className="h-6 w-6" />, label: "Practice", href: "/practice" },
    { icon: <Trophy className="h-6 w-6" />, label: "Leaderboard", href: "/leaderboard" },
    { icon: <User className="h-6 w-6" />, label: "Profile", href: "/profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 z-50 safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16 max-w-2xl mx-auto">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-4 py-2 rounded-lg transition-colors min-w-[70px]",
                isActive
                  ? "text-primary"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              )}
            >
              <div className={cn(isActive && "scale-110 transition-transform")}>
                {item.icon}
              </div>
              <span className="text-xs font-bold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
