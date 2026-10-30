import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, initializeFirestore, Firestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

function shouldForceLongPolling(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua);
  const isWebView = /FBAN|FBAV|Instagram|WhatsApp|Line|wv/i.test(ua);
  return isIOS || isSafari || isWebView;
}

function createFirestoreInstance(): Firestore {
  try {
    const forceLongPolling = shouldForceLongPolling();
    const settings = forceLongPolling
      ? { experimentalForceLongPolling: true }
      : { experimentalAutoDetectLongPolling: true };

    return firebaseConfig.firestoreDatabaseId
      ? initializeFirestore(app, settings, firebaseConfig.firestoreDatabaseId)
      : initializeFirestore(app, settings);
  } catch {
    return firebaseConfig.firestoreDatabaseId
      ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
      : getFirestore(app);
  }
}

export const db = createFirestoreInstance();

export default app;


