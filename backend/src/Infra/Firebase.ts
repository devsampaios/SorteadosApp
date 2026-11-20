import admin from "firebase-admin";
import { config } from "../config";
import { Unauthorized } from "../Helper/AppError";

export interface FirebaseToken {
  uid: string;
  email: string;
  name: string | null;
}

let app: admin.app.App | null = null;

function getApp(): admin.app.App {
  if (app) return app;
  app = admin.apps.length
    ? admin.app()
    : admin.initializeApp({
        credential: admin.credential.cert({
          projectId: config.firebase.projectId,
          clientEmail: config.firebase.clientEmail,
          privateKey: config.firebase.privateKey.replace(/\\n/g, "\n"),
        }),
      });
  return app;
}

export async function verifyIdToken(idToken: string): Promise<FirebaseToken> {
  try {
    const decoded = await getApp().auth().verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email ?? "", name: decoded.name ?? null };
  } catch {
    throw new Unauthorized("Token do Firebase inválido");
  }
}
