import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & NonNullable<import("next-auth").DefaultSession["user"]>;
  }
}
