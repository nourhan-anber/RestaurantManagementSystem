import type { DefaultSession } from 'next-auth';
import type { SessionMembership } from '@/server/auth-helpers';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      isPlatformAdmin: boolean;
      memberships: SessionMembership[];
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    isPlatformAdmin?: boolean;
    memberships?: SessionMembership[];
  }
}
