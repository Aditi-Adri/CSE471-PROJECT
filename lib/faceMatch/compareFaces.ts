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
 *
 * The library is imported dynamically, not at the top of this file —
 * @vladmandic/face-api runs its own Node-vs-browser environment
 * detection as soon as its module body executes, and doing that at
 * static-import time means it runs the instant this file is first
 * evaluated, before there's any guarantee of a stable, fully-hydrated
 * browser tab. Deferring the import into the function that's only
 * ever called from a real user action (selecting both photos) keeps
 * that detection code from running any earlier than it has to.
 */
type FaceApiModule = typeof import("@vladmandic/face-api");

let faceApiModulePromise: Promise<FaceApiModule> | null = null;
let modelsLoadedPromise: Promise<FaceApiModule> | null = null;

/** Loads the library and its three models, once per page session. */
function loadFaceMatchModels(): Promise<FaceApiModule> {
  if (!modelsLoadedPromise) {
    modelsLoadedPromise = (async () => {
      if (!faceApiModulePromise) {
        faceApiModulePromise = import("@vladmandic/face-api");
      }
      const faceapi = await faceApiModulePromise;
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
        faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        faceapi.nets.faceRecognitionNet.loadFromUri("/models"),
      ]);
      return faceapi;
    })();
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
  const faceapi = await loadFaceMatchModels();

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
