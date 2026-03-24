import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";

export default function MobileNav() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", label: "Home", icon: "bx-dashboard" },
    { path: "/lessons", label: "Lessons", icon: "bx-book-open" },
    { path: "/practice", label: "Practice", icon: "bx-cycling" },
    { path: "/progress", label: "Progress", icon: "bx-line-chart" },
    { path: "/profile", label: "Profile", icon: "bx-user" },
  ];

  return (
    <nav className="md:hidden bg-background dark:bg-neutral-800 border-t border-neutral-200 dark:border-neutral-700 fixed bottom-0 left-0 right-0 z-20">
      <div className="flex justify-around">
        {navItems.map((item) => (
          <Link key={item.path} href={item.path}>
            <a
              className={cn("flex flex-col items-center py-2 px-4", {
                "text-primary": location === item.path,
                "text-neutral-500 dark:text-neutral-400": location !== item.path,
              })}
            >
              <i className={`bx ${item.icon} text-xl`}></i>
              <span className="text-xs mt-1">{item.label}</span>
            </a>
          </Link>
        ))}
      </div>
    </nav>
  );
}
