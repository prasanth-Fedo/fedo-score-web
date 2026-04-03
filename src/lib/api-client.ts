/**
 * API client for FedoScore backend.
 *
 * Handles JWT authentication (httpOnly cookies), HMAC request signing,
 * automatic token refresh on 401, and rate limit handling.
 *
 * The browser never processes vitals — it just sends RGB samples
 * and renders the results from the server.
 */

import type {
  RGBSample,
  SnapshotData,
  RecordingMetadata,
  UnifiedResult,
  VitalsOnlyResult,
} from "./types";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// HMAC app secret — in production, this would be injected at build time
// and rotated. For the MVP, it's a shared secret with the backend.
const HMAC_APP_SECRET = process.env.NEXT_PUBLIC_HMAC_SECRET || "dev-hmac-secret-change-in-production";

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

let accessToken: string | null = null;

export async function register(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include", // receive httpOnly cookies
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Registration failed" }));
    throw new Error(err.detail || "Registration failed");
  }
  const data = await res.json();
  accessToken = data.access_token;
}

export async function login(email: string, password: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Login failed" }));
    throw new Error(err.detail || "Invalid credentials");
  }
  const data = await res.json();
  accessToken = data.access_token;
}

export async function refreshToken(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = await res.json();
    accessToken = data.access_token;
    return true;
  } catch {
    return false;
  }
}

export function isAuthenticated(): boolean {
  return accessToken !== null;
}

export function logout(): void {
  accessToken = null;
}

// ---------------------------------------------------------------------------
// HMAC Request Signing
// ---------------------------------------------------------------------------

async function signRequest(body: string): Promise<{ signature: string; timestamp: string }> {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const token = accessToken || "";

  // Derive per-session signing key: HMAC-SHA256(app_secret, access_token)
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw", encoder.encode(HMAC_APP_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );
  const signingKeyBuffer = await crypto.subtle.sign("HMAC", keyMaterial, encoder.encode(token));

  // Import derived key
  const signingKey = await crypto.subtle.importKey(
    "raw", signingKeyBuffer, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]
  );

  // Hash the body
  const bodyHash = await crypto.subtle.digest("SHA-256", encoder.encode(body));
  const bodyHashHex = Array.from(new Uint8Array(bodyHash)).map(b => b.toString(16).padStart(2, "0")).join("");

  // Sign: HMAC-SHA256(signing_key, timestamp + body_hash)
  const message = encoder.encode(timestamp + bodyHashHex);
  const signatureBuffer = await crypto.subtle.sign("HMAC", signingKey, message);
  const signature = Array.from(new Uint8Array(signatureBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");

  return { signature, timestamp };
}

// ---------------------------------------------------------------------------
// API Calls
// ---------------------------------------------------------------------------

async function apiCall<T>(
  path: string,
  body: object,
  options: { signed?: boolean; retried?: boolean } = {}
): Promise<T> {
  const bodyStr = JSON.stringify(body);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  if (options.signed) {
    const { signature, timestamp } = await signRequest(bodyStr);
    headers["X-Request-Signature"] = signature;
    headers["X-Request-Timestamp"] = timestamp;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    credentials: "include",
    body: bodyStr,
  });

  // Handle 401 — try refresh once
  if (res.status === 401 && !options.retried) {
    const refreshed = await refreshToken();
    if (refreshed) {
      return apiCall<T>(path, body, { ...options, retried: true });
    }
    throw new Error("Session expired — please log in again");
  }

  // Handle 429 — rate limited
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After") || "60";
    throw new Error(`Rate limited — try again in ${retryAfter} seconds`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(err.detail || `API error (${res.status})`);
  }

  return res.json();
}

// ---------------------------------------------------------------------------
// Vitals Processing
// ---------------------------------------------------------------------------

/**
 * Convert a canvas snapshot to base64 JPEG for the API.
 */
function snapshotToBase64(snapshot: SnapshotData): string {
  const canvas = document.createElement("canvas");
  canvas.width = snapshot.imageData.width;
  canvas.height = snapshot.imageData.height;
  const ctx = canvas.getContext("2d")!;
  ctx.putImageData(snapshot.imageData, 0, 0);
  // Remove the data:image/jpeg;base64, prefix
  return canvas.toDataURL("image/jpeg", 0.85).split(",")[1];
}

/**
 * Send RGB samples + snapshot to the server for vitals processing only
 * (no Fedo Score calculation).
 */
export async function processVitals(
  samples: RGBSample[],
  fps: number,
  durationSeconds: number,
  snapshot: SnapshotData | null,
  metadata: RecordingMetadata
): Promise<VitalsOnlyResult> {
  const body: any = {
    rgb_samples: samples.map(s => ({ r: s.r, g: s.g, b: s.b, timestamp: s.timestamp })),
    fps,
    duration_seconds: durationSeconds,
    metadata: {
      recording_quality: metadata.recordingQuality,
      motion_score_mean: metadata.motionScoreMean,
      frames_accepted: metadata.framesAccepted,
      frames_rejected: metadata.framesRejected,
    },
  };

  if (snapshot && snapshot.landmarks.length >= 468) {
    body.snapshot = {
      image_base64: snapshotToBase64(snapshot),
      width: snapshot.imageData.width,
      height: snapshot.imageData.height,
      landmarks: snapshot.landmarks.map(lm => ({ x: lm.x, y: lm.y })),
    };
  }

  return apiCall<VitalsOnlyResult>("/api/v1/vitals/process", body, { signed: true });
}

/**
 * Send lifestyle inputs + RGB samples to the server for unified
 * Fedo Score + vitals assessment.
 */
export async function scoreWithVitals(
  lifestyle: {
    age: number; gender: number; height: number; weight: number;
    smoker: number; exercise: number; drink: number; sleep_hours: number;
    family_history: number[]; conditions: number[];
  },
  samples: RGBSample[],
  fps: number,
  durationSeconds: number,
  snapshot: SnapshotData | null,
  metadata: RecordingMetadata
): Promise<UnifiedResult> {
  const rppg: any = {
    rgb_samples: samples.map(s => ({ r: s.r, g: s.g, b: s.b, timestamp: s.timestamp })),
    fps,
    duration_seconds: durationSeconds,
    metadata: {
      recording_quality: metadata.recordingQuality,
      motion_score_mean: metadata.motionScoreMean,
      frames_accepted: metadata.framesAccepted,
      frames_rejected: metadata.framesRejected,
    },
  };

  if (snapshot && snapshot.landmarks.length >= 468) {
    rppg.snapshot = {
      image_base64: snapshotToBase64(snapshot),
      width: snapshot.imageData.width,
      height: snapshot.imageData.height,
      landmarks: snapshot.landmarks.map(lm => ({ x: lm.x, y: lm.y })),
    };
  }

  return apiCall<UnifiedResult>("/api/v1/score/with-vitals", { lifestyle, rppg }, { signed: true });
}

/**
 * Get Fedo Score from lifestyle inputs only (no camera).
 */
export async function scoreLifestyleOnly(lifestyle: {
  age: number; gender: number; height: number; weight: number;
  smoker: number; exercise: number; drink: number; sleep_hours: number;
  family_history: number[]; conditions: number[];
}): Promise<any> {
  return apiCall("/score", lifestyle);
}
