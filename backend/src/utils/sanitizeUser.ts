import type { User } from "@prisma/client";

type SanitizedUser = Omit<
  User,
  "password" | "resetToken" | "resetTokenExpiry" | "verifyToken" | "verifyTokenExpiry"
>;

export function sanitizeUser(user: User): SanitizedUser {
  const {
    password: _p,
    resetToken: _rt,
    resetTokenExpiry: _rte,
    verifyToken: _vt,
    verifyTokenExpiry: _vte,
    ...safe
  } = user;
  return safe;
}
