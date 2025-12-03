const ALLOWED_BUCKETS = ["colaboradores-fotos", "produtos-fotos"] as const

export function resolveBucketName(
  colaboradorId: string | null,
  productId: string | null,
  bucketNameParam: string | null
) {
  const trimmedBucket = bucketNameParam?.trim()

  if (trimmedBucket) {
    if (!ALLOWED_BUCKETS.includes(trimmedBucket as (typeof ALLOWED_BUCKETS)[number])) {
      throw new Error("Bucket não permitido")
    }
    return trimmedBucket
  }

  if (colaboradorId) return "colaboradores-fotos"
  return "produtos-fotos"
}
