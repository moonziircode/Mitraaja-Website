import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    
    if (isEmulator) {
      initializeApp({
        projectId: 'demo-mitraaja',
      });
      console.log('Firebase Admin Initialized for EMULATOR.');
    } else if (serviceAccountJson && process.env.FIREBASE_FIRESTORE_URL) {
      const serviceAccount = JSON.parse(serviceAccountJson);
      initializeApp({
        credential: cert(serviceAccount),
        databaseURL: process.env.FIREBASE_FIRESTORE_URL,
      });
      console.log('Firebase Admin Initialized successfully.');
    } else {
      console.warn('Firebase Admin Initialization Warning: Missing credentials and not in emulator mode.');
    }
  } catch (error) {
    console.error('Firebase Admin Initialization Error:', error);
  }
}

export const firestore = getApps().length > 0 ? getFirestore() : null;

