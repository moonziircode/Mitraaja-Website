import { getIronSession } from 'iron-session';
import { cookies } from 'next/headers';

export interface SessionData {
  isLoggedIn: boolean;
  nia: string;
  name: string;
  storeName?: string;
  token?: string; // Simpan token JWT dari Anteraja jika ada
  districtCode?: string;
  postalCode?: string;
}

export const sessionOptions = {
  password: (process.env.COOKIE_SECRET_V2 || 'z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4') as string,
  cookieName: (process.env.COOKIE_NAME ? `${process.env.COOKIE_NAME}_v2` : 'mitraaja_session_v2'),
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
