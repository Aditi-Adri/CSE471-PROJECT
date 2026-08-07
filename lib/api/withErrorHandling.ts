/**
 * Wraps a Route Handler so any unexpected server-side exception always
 * turns into a clean JSON 500 response.
 *
 * Without this, an unhandled throw (a Prisma error when the shared dev
 * database drifts from what the client expects, a bug, anything) can
 * leave the response body empty. The client-side `res.json()` call then
 * fails with "Unexpected end of JSON input" — a confusing error that
 * points nowhere near the actual problem. This turns that into an
 * actual JSON error response so the UI can show something sensible
 * instead of crashing on the parse.
 */
export function withErrorHandling<Args extends unknown[]>(
  handler: (...args: Args) => Promise<Response>
): (...args: Args) => Promise<Response> {
  return async (...args: Args) => {
    try {
      return await handler(...args);
    } catch (err) {
      console.error("Unhandled API error:", err);
      return Response.json(
        { error: "Something went wrong on our end. Please try again in a moment." },
        { status: 500 }
      );
    }
  };
}
