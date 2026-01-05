/**
 * Check if an email belongs to an admin user.
 * Admin emails are defined in the ADMIN_EMAILS environment variable.
 * Admins get free access to the platform without needing to purchase a license.
 */
export function isAdminEmail(email: string): boolean {
  const adminEmails = process.env.ADMIN_EMAILS?.split(',').map(e => e.trim().toLowerCase()) || []
  return adminEmails.includes(email.toLowerCase())
}
