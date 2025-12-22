// 🛡️ Security Guard

// 1. Hardcoded Allowlist (Ideally this moves to a DB table 'admin_users' later)
const ADMIN_EMAILS = [
    "erisson.eduardo@gmail.com",
]

export function isUserAdmin(email: string | undefined | null): boolean {
    if (!email) return false
    return ADMIN_EMAILS.includes(email)
}

export function checkBlackboxAccess(user: { email?: string } | null) {
    // A. Feature Flag Check
    if (process.env.ENABLE_BLACKBOX_CONSOLE !== 'true') {
        return { allowed: false, reason: 'Console is disabled (Feature Flag)' }
    }

    // B. User Existence
    if (!user || !user.email) {
        return { allowed: false, reason: 'No active session' }
    }

    // C. Admin Allowlist
    if (!isUserAdmin(user.email)) {
        return { allowed: false, reason: 'User not in allowlist' }
    }

    return { allowed: true }
}
