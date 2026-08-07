/**
 * Mock SMS sender. Logs to console during development.
 */
export async function sendSms(to: string, body: string): Promise<void> {
  console.log(`📱 [SMS Mock] To: ${to} | Message: ${body}`);
}