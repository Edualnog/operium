import assert from "node:assert/strict"
import { test } from "node:test"

import { normalizeQuantity } from "../app/api/movimentacoes/validation"
import { resolveBucketName } from "../app/api/upload-photo/helpers"

test("normalizeQuantity aceita números positivos e arredonda para baixo", () => {
  assert.equal(normalizeQuantity(3.8), 3)
  assert.equal(normalizeQuantity("2"), 2)
})

test("normalizeQuantity rejeita valores inválidos ou não positivos", () => {
  assert.throws(() => normalizeQuantity(0))
  assert.throws(() => normalizeQuantity(-5))
  assert.throws(() => normalizeQuantity("abc"))
  assert.throws(() => normalizeQuantity(undefined as unknown as number))
})

test("resolveBucketName aplica allowlist e padrões seguros", () => {
  assert.equal(resolveBucketName("colab-id", null, null), "colaboradores-fotos")
  assert.equal(resolveBucketName(null, "prod-id", null), "produtos-fotos")
  assert.equal(resolveBucketName(null, null, "produtos-fotos"), "produtos-fotos")
  assert.throws(() => resolveBucketName(null, null, "bucket-nao-permitido"))
})
