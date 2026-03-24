import type { User } from "@shared/schema";

export type SafeUser = Omit<User, "password">;

export function toSafeUser(user: User): SafeUser {
  const { password: _password, ...safe } = user;
  return safe;
}
