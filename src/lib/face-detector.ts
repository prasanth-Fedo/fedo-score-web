/**
 * Face detection and ROI extraction using MediaPipe FaceMesh.
 *
 * We load the FaceMesh WASM/model from the CDN so there's nothing heavy
 * to bundle.  The detector returns a bounding box and the mean RGB
 * values of the forehead + cheeks skin region for each frame.
 */

import type { RGBSample } from "./types";

// ---------------------------------------------------------------------------
// FaceMesh landmark indices for skin ROI (forehead + both cheeks)
// ---------------------------------------------------------------------------
const FOREHEAD = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109];
const LEFT_CHEEK = [50, 101, 36, 205, 206, 207, 187, 123, 116, 117, 118, 119];
const RIGHT_CHEEK = [280, 330, 266, 425, 426, 427, 411, 352, 345, 346, 347, 348];
const SKIN_LANDMARKS = [...FOREHEAD, ...LEFT_CHEEK, ...RIGHT_CHEEK];

// Face outline for bounding box
const FACE_OVAL = [10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21];

export interface FaceROI {
  /** Bounding box [x, y, w, h] in pixel coordinates */
  bbox: [number, number, number, number];
  /** Mean RGB in the skin region */
  rgb: RGBSample;
  /** Normalized landmarks for drawing the mesh */
  landmarks: Array<{ x: number; y: number }>;
  /** Face detection confidence 0-1 (ratio of valid landmarks found) */
  faceConfidence: number;
}

export interface FaceDetector {
  detect(
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    timestamp: number
  ): FaceROI | null;
  destroy(): void;
}

/**
 * Create a lightweight face detector that uses a hidden canvas to
 * read pixels.  MediaPipe FaceMesh is loaded lazily on first call.
 */
// BBox EMA smoothing factor (0.9 = fast tracking, matches Python backend config)
const BBOX_SMOOTH_ALPHA = 0.9;

export function createCanvasDetector(): FaceDetector {
  let faceMesh: any = null;
  let latestResults: any = null;
  let ready = false;
  let prevBbox: [number, number, number, number] | null = null;

  // Lazy init MediaPipe FaceMesh
  async function init() {
    if (faceMesh) return;
    // @ts-ignore — loaded from CDN at runtime
    const FaceMesh = (window as any).FaceMesh;
    if (!FaceMesh) {
      console.warn("FaceMesh not loaded yet");
      return;
    }
    faceMesh = new FaceMesh({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });
    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    faceMesh.onResults((results: any) => {
      latestResults = results;
      ready = true;
    });
    await faceMesh.initialize();
  }

  const initPromise = init();

  return {
    detect(
      video: HTMLVideoElement,
      canvas: HTMLCanvasElement,
      timestamp: number
    ): FaceROI | null {
      if (!ready || !faceMesh) {
        // Trigger async init but return null for this frame
        initPromise.catch(() => {});
        return fallbackDetect(video, canvas, timestamp);
      }

      // Send frame to MediaPipe (async, results arrive in callback)
      faceMesh.send({ image: video }).catch(() => {});

      if (!latestResults?.multiFaceLandmarks?.length) {
        return fallbackDetect(video, canvas, timestamp);
      }

      const landmarks = latestResults.multiFaceLandmarks[0];
      const w = video.videoWidth;
      const h = video.videoHeight;

      // Bounding box from face oval
      let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
      for (const idx of FACE_OVAL) {
        const lm = landmarks[idx];
        if (!lm) continue;
        const px = lm.x * w;
        const py = lm.y * h;
        if (px < xMin) xMin = px;
        if (px > xMax) xMax = px;
        if (py < yMin) yMin = py;
        if (py > yMax) yMax = py;
      }

      // EMA-smooth the bounding box to reduce ROI jitter between frames
      let rawBbox: [number, number, number, number] = [xMin, yMin, xMax - xMin, yMax - yMin];
      if (prevBbox) {
        const a = BBOX_SMOOTH_ALPHA;
        rawBbox = [
          a * rawBbox[0] + (1 - a) * prevBbox[0],
          a * rawBbox[1] + (1 - a) * prevBbox[1],
          a * rawBbox[2] + (1 - a) * prevBbox[2],
          a * rawBbox[3] + (1 - a) * prevBbox[3],
        ];
      }
      prevBbox = rawBbox;

      // Face confidence: ratio of valid in-bounds landmarks
      let validCount = 0;
      for (let i = 0; i < landmarks.length; i++) {
        const lm = landmarks[i];
        if (lm && lm.x >= 0 && lm.x <= 1 && lm.y >= 0 && lm.y <= 1) validCount++;
      }
      const faceConfidence = validCount / 468;

      // Extract mean RGB from skin landmarks
      const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(video, 0, 0, w, h);
      const imageData = ctx.getImageData(0, 0, w, h);

      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (const idx of SKIN_LANDMARKS) {
        const lm = landmarks[idx];
        if (!lm) continue;
        const px = Math.round(lm.x * w);
        const py = Math.round(lm.y * h);
        if (px < 0 || px >= w || py < 0 || py >= h) continue;

        // Sample a 5x5 patch around each landmark (reduces noise ~1.6x vs 3x3)
        for (let dy = -2; dy <= 2; dy++) {
          for (let dx = -2; dx <= 2; dx++) {
            const sx = Math.min(Math.max(px + dx, 0), w - 1);
            const sy = Math.min(Math.max(py + dy, 0), h - 1);
            const off = (sy * w + sx) * 4;
            rSum += imageData.data[off];
            gSum += imageData.data[off + 1];
            bSum += imageData.data[off + 2];
            count++;
          }
        }
      }

      if (count === 0) return fallbackDetect(video, canvas, timestamp);

      return {
        bbox: rawBbox,
        rgb: { r: rSum / count, g: gSum / count, b: bSum / count, timestamp },
        landmarks: landmarks.map((lm: any) => ({ x: lm.x, y: lm.y })),
        faceConfidence,
      };
    },

    destroy() {
      if (faceMesh) {
        faceMesh.close();
        faceMesh = null;
      }
    },
  };
}

/**
 * Fallback: extract mean RGB from the center region of the frame
 * (works when MediaPipe hasn't loaded yet or loses the face).
 */
function fallbackDetect(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  timestamp: number
): FaceROI | null {
  const w = video.videoWidth;
  const h = video.videoHeight;
  if (w === 0 || h === 0) return null;

  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  canvas.width = w;
  canvas.height = h;
  ctx.drawImage(video, 0, 0, w, h);

  // Sample center 40% of frame
  const cx = Math.round(w * 0.3);
  const cy = Math.round(h * 0.2);
  const cw = Math.round(w * 0.4);
  const ch = Math.round(h * 0.5);
  const imageData = ctx.getImageData(cx, cy, cw, ch);

  let rSum = 0, gSum = 0, bSum = 0;
  const total = cw * ch;
  // Sample every 4th pixel for speed
  for (let i = 0; i < imageData.data.length; i += 16) {
    rSum += imageData.data[i];
    gSum += imageData.data[i + 1];
    bSum += imageData.data[i + 2];
  }
  const sampled = Math.ceil(total / 4);

  return {
    bbox: [cx, cy, cw, ch],
    rgb: { r: rSum / sampled, g: gSum / sampled, b: bSum / sampled, timestamp },
    landmarks: [],
    faceConfidence: 0,
  };
}
