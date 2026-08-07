/**
 * Every API route returns `{ error: "<generic message>", issues: z.treeifyError(...) }`
 * on a 400. Showing only the generic message ("Invalid registration
 * details.") left the actual problem invisible — e.g. a phone number
 * with dashes in it read as "registration is broken" instead of
 * "that phone number format isn't accepted". This pulls out the
 * first specific field error so the form can show that instead.
 */
export function firstIssueMessage(issues: unknown, fallback: string): string {
  if (!issues || typeof issues !== "object") return fallback;

  const properties = (issues as { properties?: Record<string, { errors?: string[] }> }).properties;
  if (properties) {
    for (const key of Object.keys(properties)) {
      const message = properties[key]?.errors?.[0];
      if (message) return message;
    }
  }

  const topLevelErrors = (issues as { errors?: string[] }).errors;
  if (topLevelErrors?.[0]) return topLevelErrors[0];

  return fallback;
}
