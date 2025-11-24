/**
 * Utilitários para gerenciamento de Storage do Supabase
 */

import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Verifica se um bucket existe no Supabase Storage
 * 
 * Estratégia:
 * 1. Tenta listar buckets (pode falhar por permissão)
 * 2. Tenta acessar o bucket diretamente (mais confiável)
 * 3. Se conseguir listar arquivos (mesmo vazio), o bucket existe
 */
export async function checkBucketExists(
  supabase: SupabaseClient,
  bucketName: string
): Promise<boolean> {
  try {
    // Método 1: Tentar listar todos os buckets
    // Isso pode falhar se o usuário não tiver permissão de admin
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (!listError && buckets && Array.isArray(buckets)) {
      const bucketExists = buckets.some(bucket => bucket.name === bucketName)
      if (bucketExists) {
        console.log(`✅ Bucket "${bucketName}" encontrado via listBuckets()`)
        return true
      }
    }
    
    // Método 2: Tentar acessar o bucket diretamente
    // Tentamos listar arquivos na raiz do bucket
    // Se o bucket existir, mesmo que vazio, não dará erro de "bucket not found"
    const { data: files, error: accessError } = await supabase.storage
      .from(bucketName)
      .list("", {
        limit: 1,
        sortBy: { column: "name", order: "asc" }
      })
    
    if (accessError) {
      const errorMessage = (accessError.message || "").toLowerCase()
      const errorCode = accessError.statusCode || ""
      
      // Erros que indicam que o bucket não existe
      if (
        errorMessage.includes("bucket not found") ||
        errorMessage.includes("not found") ||
        errorMessage.includes("does not exist") ||
        errorMessage.includes("bucket") && errorMessage.includes("not") ||
        errorCode === "404" ||
        errorCode === "400"
      ) {
        console.warn(`❌ Bucket "${bucketName}" não encontrado:`, accessError.message)
        return false
      }
      
      // Outros erros podem ser de permissão, mas assumimos que não existe
      console.warn(`⚠️ Erro ao acessar bucket "${bucketName}":`, accessError.message)
      return false
    }
    
    // Se não houve erro, o bucket existe (mesmo que vazio)
    console.log(`✅ Bucket "${bucketName}" encontrado via acesso direto`)
    return true
    
  } catch (error: any) {
    console.error(`❌ Erro inesperado ao verificar bucket "${bucketName}":`, error)
    return false
  }
}

/**
 * Obtém informações sobre um bucket
 */
export async function getBucketInfo(
  supabase: SupabaseClient,
  bucketName: string
) {
  try {
    const { data, error } = await supabase.storage.listBuckets()
    
    if (error) {
      return null
    }
    
    return data?.find((bucket) => bucket.name === bucketName) || null
  } catch (error) {
    return null
  }
}

