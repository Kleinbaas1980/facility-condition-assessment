import { http } from "./http";
import type { User } from "@/types/project";
export type Session = {
  id: string;
  createdAt: string;
  expiresAt: string;
  userAgent: string;
  current: boolean;
};

export const authApi = {
  me: async () => (await http.get<{ user: User }>("/auth/me")).data.user,
  login: async (email: string, password: string) =>
    (await http.post<{ user: User }>("/auth/login", { email, password })).data
      .user,
  register: async (name: string, email: string, password: string) =>
    (
      await http.post<{ message: string }>("/auth/register", {
        name,
        email,
        password,
      })
    ).data,
  logout: async () => {
    await http.post("/auth/logout");
  },
  logoutAll: async () => {
    await http.post("/auth/logout-all");
  },

  forgot: async (email: string) =>
    (await http.post<{ message: string }>("/auth/forgot-password", { email }))
      .data,

  resend: async (email: string) =>
    (
      await http.post<{ message: string }>("/auth/resend-verification", {
        email,
      })
    ).data,
  verify: async (token: string) =>
    (await http.post<{ message: string }>("/auth/verify-email", { token }))
      .data,
  reset: async (token: string, password: string) => {
    const result = (
      await http.post<{ message: string }>("/auth/reset-password", {
        token,
        password,
      })
    ).data;
    if (typeof window !== "undefined")
      window.dispatchEvent(new Event("fca:unauthenticated"));
    return result;
  },
  profile: async (name: string) =>
    (await http.patch<{ user: User }>("/auth/me", { name })).data.user,
  password: async (currentPassword: string, password: string) =>
    (
      await http.patch<{ message: string }>("/auth/password", {
        currentPassword,
        password,
      })
    ).data,
  sessions: async () =>
    (await http.get<{ sessions: Session[] }>("/auth/sessions")).data.sessions,
  revoke: async (id: string) => {
    await http.delete("/auth/sessions/" + encodeURIComponent(id));
  },
};
