import { z } from "zod"

export const checkoutSchema = z.object({
    plan: z.enum(["mensal", "trimestral", "anual"]),
    locale: z.string().optional().default("pt"),
})

export type CheckoutBody = z.infer<typeof checkoutSchema>

export function validateCheckoutBody(body: any) {
    return checkoutSchema.safeParse(body)
}

export function getPriceId(plan: "mensal" | "trimestral" | "anual", env: Record<string, string | undefined>) {
    if (plan === "anual") {
        return env.STRIPE_PRICE_YEARLY || ""
    } else if (plan === "trimestral") {
        return env.STRIPE_PRICE_QUARTERLY || ""
    } else if (plan === "mensal") {
        return env.STRIPE_PRICE_MONTHLY || ""
    }
    return ""
}
