import admin from "firebase-admin";

let firebaseApp = null;

function initializeFirebaseApp() {
  if (firebaseApp) {
    return firebaseApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY ||
    process.env.FIREBASE_PRIVATE_KEY_BASE64;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase credentials missing. Please set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY (or FIREBASE_PRIVATE_KEY_BASE64)."
    );
  }

  firebaseApp = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: projectId.trim(),
      clientEmail: clientEmail.trim(),
      privateKey: privateKey.includes("BEGIN PRIVATE KEY")
        ? privateKey.replace(/\\n/g, "\n")
        : Buffer.from(privateKey, "base64").toString("utf8"),
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


