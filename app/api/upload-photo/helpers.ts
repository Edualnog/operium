export function resolveBucketName(
  colaboradorId: string | null,
  productId: string | null,
  bucketNameParam: string | null
): string {
  // Allowlist de buckets permitidos
  const ALLOWED_BUCKETS = ["colaboradores-fotos", "produtos-fotos"]

  // Se o bucketNameParam for fornecido, verificar se é permitido
  if (bucketNameParam) {
    if (ALLOWED_BUCKETS.includes(bucketNameParam)) {
      return bucketNameParam
    }
    throw new Error("Bucket não permitido")
  }

  // Lógica de fallback baseada nos IDs
  if (colaboradorId) {
    return "colaboradores-fotos"
  } else if (productId) {
    return "produtos-fotos"
  } else {
    // Default ou erro
    // Se não tiver ID, assumimos produtos-fotos como default seguro ou lançamos erro
    // Neste caso, vamos assumir produtos-fotos se não especificado, mas idealmente deveria ser explícito
    return "produtos-fotos"
  }
}

export function validateFile(file: File | null) {
  if (!file) {
    return { valid: false, error: "fileMissing" }
  }

  if (!file.type.startsWith("image/")) {
    return { valid: false, error: "typeError" }
  }

  if (file.size > 5 * 1024 * 1024) {
    return { valid: false, error: "sizeError" }
  }

  return { valid: true }
}
