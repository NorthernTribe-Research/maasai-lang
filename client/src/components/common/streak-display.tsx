import { format } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function StreakDisplay() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const updateStreakMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/streak/update");
      return await res.json();
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(["/api/user"], updatedUser);
      toast({
        title: "Streak updated!",
        description: `You're on a ${updatedUser.streak} day streak! Keep it up!`,
      });
    },
  });
  
  if (!user) return null;
  
  const streak = user.streak || 0;
  const today = new Date();
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Get the current day of the week (0 = Sunday, 1 = Monday, etc.)
  const currentDayIndex = today.getDay();
  
  // Adjust to make Monday the first day (0 = Monday, 1 = Tuesday, etc.)
  const adjustedDayIndex = currentDayIndex === 0 ? 6 : currentDayIndex - 1;
  
  // Create an array of days for the last week, ending with today
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push({
      name: days[i],
      isToday: i === adjustedDayIndex,
      isCompleted: i < adjustedDayIndex || (i === adjustedDayIndex && streak > 0),
    });
  }

  return (
    <div className="bg-background dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-200 dark:border-neutral-800 p-4 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Your Streak</h3>
        <span className="text-neutral-500 dark:text-neutral-400 text-sm">
          Day {streak} of 30
        </span>
      </div>

      <div className="flex justify-between mb-2">
        {weekDays.map((day, index) => (
          <div key={index} className="flex flex-1 items-center justify-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-white ${
                  day.isToday
                    ? "bg-accent"
                    : day.isCompleted
                    ? "bg-primary"
                    : "bg-neutral-200 dark:bg-neutral-700"
                }`}
              >
                {day.isToday ? (
                  <i className="bx bx-flame text-xl"></i>
                ) : day.isCompleted ? (
                  <i className="bx bx-check text-xl"></i>
                ) : (
                  <span className="text-neutral-400 dark:text-neutral-600">
                    {index + 1}
                  </span>
                )}
              </div>
              <span
                className={`text-xs mt-1 ${
                  day.isToday
                    ? "font-semibold"
                    : "text-neutral-600 dark:text-neutral-400"
                }`}
              >
                {day.name}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-3">
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Complete today's lesson to continue your streak!
        </p>
      </div>
    </div>
  );
}
