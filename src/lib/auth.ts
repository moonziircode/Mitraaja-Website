import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  isLoggedIn: boolean;
  nia: string;
  name: string;
  storeName?: string;
  token?: string; // Simpan token JWT dari Anteraja jika ada
}

export const sessionOptions = {
  password: process.env.COOKIE_SECRET as string,
  cookieName: process.env.COOKIE_NAME as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
