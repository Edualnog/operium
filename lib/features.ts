export const FEATURES = {
    // Toggle to show internal Observer System metrics (Memory, Trust Scores, Maturity)
    // Default to false to preserve data equity and informational asymmetry.
    OBSERVER_INTERNAL_VIEW: process.env.NEXT_PUBLIC_ENABLE_OBSERVER_INTERNAL_VIEW === 'true'
}
