import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/server/db';
import { loginSchema } from '@/lib/validation/auth';
import { toSessionMemberships, verifyPassword, type SessionMembership } from '@/server/auth-helpers';

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const user = await db.user.findUnique({ where: { email } });
        if (!user || !(await verifyPassword(password, user.passwordHash))) {
          return null;
        }
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    // On sign-in, stamp the platform-admin flag and memberships into the JWT so
    // downstream authz reads them without a DB round-trip.
    jwt: async ({ token, user }) => {
      if (user?.id) {
        const dbUser = await db.user.findUnique({
          where: { id: user.id },
          include: { memberships: { include: { restaurant: { select: { slug: true } } } } },
        });
        if (dbUser) {
          token.isPlatformAdmin = dbUser.isPlatformAdmin;
          token.memberships = toSessionMemberships(dbUser.memberships);
        }
      }
      return token;
    },
    session: ({ session, token }) => {
      if (session.user) {
        session.user.id = token.sub ?? '';
        session.user.isPlatformAdmin = Boolean(token.isPlatformAdmin);
        session.user.memberships = (token.memberships as SessionMembership[] | undefined) ?? [];
      }
      return session;
    },
  },
});
