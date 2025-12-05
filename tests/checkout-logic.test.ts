import assert from "node:assert/strict"
import { test } from "node:test"
import { validateCheckoutBody, getPriceId } from "../app/api/create-checkout/helpers"

test("validateCheckoutBody aceita dados válidos", () => {
    const result = validateCheckoutBody({ plan: "mensal", locale: "pt" })
    assert.equal(result.success, true)
})

test("validateCheckoutBody rejeita plano inválido", () => {
    const result = validateCheckoutBody({ plan: "vitalicio", locale: "pt" })
    assert.equal(result.success, false)
})

test("validateCheckoutBody aceita locale opcional", () => {
    const result = validateCheckoutBody({ plan: "anual" })
    assert.equal(result.success, true)
})

test("getPriceId retorna ID correto para cada plano", () => {
    const env = {
        STRIPE_PRICE_MONTHLY: "price_monthly_123",
        STRIPE_PRICE_QUARTERLY: "price_quarterly_456",
        STRIPE_PRICE_YEARLY: "price_yearly_789",
    }

    assert.equal(getPriceId("mensal", env), "price_monthly_123")
    assert.equal(getPriceId("trimestral", env), "price_quarterly_456")
    assert.equal(getPriceId("anual", env), "price_yearly_789")
})

test("getPriceId retorna string vazia se variável não definida", () => {
    const env = {}
    assert.equal(getPriceId("mensal", env), "")
})
