import * as admin from 'firebase-admin';

admin.initializeApp();

export const db = admin.firestore();
export const FieldValue = admin.firestore.FieldValue;
export const Timestamp = admin.firestore.Timestamp;
export type DocumentSnapshot = admin.firestore.DocumentSnapshot;
export type QueryDocumentSnapshot = admin.firestore.QueryDocumentSnapshot;
