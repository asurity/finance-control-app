/**
 * Firebase Cloud Functions
 * Main entry point for all functions
 */

import {setGlobalOptions} from "firebase-functions/v2";

// Global options for all functions
setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

// Export all functions
export {voiceSession} from "./voice-session";
