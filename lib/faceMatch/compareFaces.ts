import * as faceapi from "@vladmandic/face-api";
import { AUTO_APPROVE_DISTANCE_THRESHOLD } from "./threshold";

/**
 * Client-side (in-browser) face comparison for Tier 1 — "does this
 * selfie match this NID photo?" — using @vladmandic/face-api
 * (TensorFlow.js under the hood). Runs entirely in the browser: no
 * external API, no signup, no per-request cost, and the photos never
 * leave the device for this step (they're only uploaded afterward,
 * alongside the already-computed result).
 *
 * Model weights are bundled with the npm package and copied into
 * public/models/ (see package README note) rather than fetched from a
 * CDN, so this has no runtime dependency on a third-party host either.
 */

let modelsLoadedPromise: Promise<void> | null = null;

/** Loads the three models this feature needs, once per page session. */
export function loadFaceMatchModels(): Promise<void> {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
      faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
    ]).then(() => undefined);
  }
  return modelsLoadedPromise;
}

export type FaceCompareResult =
  | { ok: true; distance: number; autoApproved: boolean }
  | { ok: false; reason: "NO_FACE_IN_SELFIE" | "NO_FACE_IN_NID" };

export async function compareFaces(
  selfieImg: HTMLImageElement,
  nidImg: HTMLImageElement
): Promise<FaceCompareResult> {
  await loadFaceMatchModels();

  const options = new faceapi.TinyFaceDetectorOptions();
  const [selfieResult, nidResult] = await Promise.all([
    faceapi.detectSingleFace(selfieImg, options).withFaceLandmarks().withFaceDescriptor(),
    faceapi.detectSingleFace(nidImg, options).withFaceLandmarks().withFaceDescriptor(),
  ]);

  if (!selfieResult) return { ok: false, reason: "NO_FACE_IN_SELFIE" };
  if (!nidResult) return { ok: false, reason: "NO_FACE_IN_NID" };

  const distance = faceapi.euclideanDistance(selfieResult.descriptor, nidResult.descriptor);
  return { ok: true, distance, autoApproved: distance < AUTO_APPROVE_DISTANCE_THRESHOLD };
}
