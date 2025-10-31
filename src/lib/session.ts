import type { IronSessionOptions } from 'iron-session';
import type { SessionData } from 'iron-session';

export const sessionOptions: IronSessionOptions = {
  password: process.env.SECRET_COOKIE_PASSWORD as string || 'complex_password_at_least_32_characters_long_for_dev',
  cookieName: 'mt5-license-manager-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export const defaultSession: SessionData = {
  email: '',
  isLoggedIn: false,
};

declare module 'iron-session' {
  interface IronSessionData {
    email: string;
    isLoggedIn: boolean;
  }
}
