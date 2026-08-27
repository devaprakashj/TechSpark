import { createRequire } from "module";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load .env manually (read from TechSpark root)
function loadEnv() {
    try {
        const envPath = resolve(__dirname, "..", ".env");
        const content = readFileSync(envPath, "utf-8");
        const vars = {};
        content.split("\n").forEach(line => {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith("#")) {
                const [key, ...rest] = trimmed.split("=");
                vars[key.trim()] = rest.join("=").trim();
            }
        });
        return vars;
    } catch (err) {
        console.error("Failed to load .env file:", err.message);
        return {};
    }
}

const env = loadEnv();

// Use dynamic import for firebase
const { initializeApp } = await import("firebase/app");
const { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc: firestoreDoc, query, where, getDocs, serverTimestamp } = await import("firebase/firestore");

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
};

console.log(`🔥 [Firebase] Initializing with project: ${firebaseConfig.projectId}`);
const app = initializeApp(firebaseConfig, "backend-scheduler");
const db = getFirestore(app);
console.log(`✅ [Firebase] Connected to Firestore successfully.`);

export { db, collection, addDoc, updateDoc, deleteDoc, firestoreDoc as doc, query, where, getDocs, serverTimestamp };
