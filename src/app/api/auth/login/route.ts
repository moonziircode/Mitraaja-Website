import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getSession();
  const { nia, password } = await request.json();

  // Validasi Input
  if (!nia || !password) {
    return NextResponse.json({ message: 'NIA dan password harus diisi' }, { status: 400 });
  }

  // === SIMULASI LOGIKA CAS ANTERAJA ===
  // Dalam aplikasi nyata, ini akan menjadi panggilan ke API CAS Anteraja
  // Untuk tujuan pengujian, kita hardcode kredensial yang berhasil.
  if (nia === '50004786' && password === 'aa12345') {
    // Login berhasil, set data sesi
    session.isLoggedIn = true;
    session.nia = nia;
    session.name = 'Agent Budi Santoso'; // Contoh data profil
    await session.save();

    return NextResponse.json({ message: 'Login berhasil' }, { status: 200 });
  } else {
    // Login gagal
    return NextResponse.json({ message: 'NIA atau password salah.' }, { status: 401 });
  }
}
