import admin from "firebase-admin";

let firebaseApp = null;

function initializeFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase credentials missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY."
    );
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId.trim(),
      clientEmail: clientEmail.trim(),
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
    storageBucket:
      process.env.FIREBASE_STORAGE_BUCKET ||
      `${projectId.trim()}.appspot.com`,
  });

  return firebaseApp;
}

export function getFirebaseAdmin() {
  return initializeFirebaseApp();
}

export function getFirestore() {
  return initializeFirebaseApp().firestore();
}

export function getFirebaseStorage() {
  return initializeFirebaseApp().storage();
}


