import { initializeFirebase } from '@/firebase';

/**
 * Centrally initialized Firebase services to prevent multiple app instances.
 * This ensures auth persistence works correctly across the entire application.
 */
const { auth, firestore: db } = initializeFirebase();

export { auth, db };
