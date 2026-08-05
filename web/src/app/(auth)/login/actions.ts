'use server';

import { AuthError } from 'next-auth';
import { signIn } from '@/server/auth';

export interface LoginState {
  error?: string;
}

export async function authenticate(_prev: LoginState, formData: FormData): Promise<LoginState> {
  try {
    await signIn('credentials', {
      email: formData.get('email'),
      password: formData.get('password'),
      redirectTo: '/',
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: 'Invalid email or password.' };
    }
    // Re-throw NEXT_REDIRECT (and anything else) so the redirect can happen.
    throw error;
  }
}
