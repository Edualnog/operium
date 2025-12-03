// Validação e normalização de quantidade para movimentações
export function normalizeQuantity(value: unknown) {
  const qty = Number(value)

  if (!Number.isFinite(qty) || qty <= 0) {
    throw new Error("Quantidade deve ser um número maior que zero")
  }

  const normalized = Math.floor(qty)

  if (normalized <= 0) {
    throw new Error("Quantidade deve ser um número inteiro maior que zero")
  }

  return normalized
}
