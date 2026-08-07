/**
 * face-api.js's own documentation puts the same-person/different-person
 * boundary around a descriptor distance of 0.6. Auto-approval kicks in
 * only comfortably under that. Kept in its own file (no @vladmandic/face-api
 * import) so the server-side Tier 1 API route can import just this
 * constant — and independently recompute "did this pass?" from the raw
 * distance the client reported — without ever pulling a browser-only
 * ML library into a Node server context, and without trusting a
 * client-sent boolean for a security-relevant decision.
 */
export const AUTO_APPROVE_DISTANCE_THRESHOLD = 0.5;
