import "server-only";
import type { User } from "@/types";
import { ApiError, delay } from "./utils";

// Mock login. The real backend authenticates with username/password and
// returns a token (dev default: admin / admin-dev-only, see its docs/API.md).

const users: (User & { password: string })[] = [
  {
    id: "u_admin",
    username: "admin",
    password: "admin-dev-only",
    display_name: "Programme admin",
    role: "admin",
    caseworker_id: null,
  },
  {
    id: "u_cw1",
    username: "juwase",
    password: "caseworker-dev-only",
    display_name: "J. Uwase",
    role: "caseworker",
    caseworker_id: 1,
  },
];

export async function login(credentials: { username: string; password: string }): Promise<User> {
  await delay(300);
  const user = users.find((u) => u.username === credentials.username.trim().toLowerCase());
  if (!user || user.password !== credentials.password) {
    throw new ApiError("Incorrect username or password.");
  }
  return toUser(user);
}

export async function getUserById(id: string): Promise<User | undefined> {
  const user = users.find((u) => u.id === id);
  return user ? toUser(user) : undefined;
}

/** Never hand the password field to callers. */
function toUser(u: User & { password: string }): User {
  return {
    id: u.id,
    username: u.username,
    display_name: u.display_name,
    role: u.role,
    caseworker_id: u.caseworker_id,
  };
}
