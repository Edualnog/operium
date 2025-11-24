/**
 * Utilitários para gerenciamento de Storage do Supabase
 */

import { SupabaseClient } from "@supabase/supabase-js"

/**
 * Verifica se um bucket existe no Supabase Storage
 */
export async function checkBucketExists(
  supabase: SupabaseClient,
  bucketName: string
): Promise<boolean> {
  try {
    // Primeiro tenta listar os buckets disponíveis
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      // Se não conseguir listar, tenta acessar diretamente
      const { error: accessError } = await supabase.storage.from(bucketName).list("", {
        limit: 1,
      })
      return !accessError
    }
    
    // Verifica se o bucket está na lista
    return buckets?.some(bucket => bucket.name === bucketName) ?? false
  } catch (error) {
    // Em caso de erro, tenta acesso direto como fallback
    try {
      const { error: accessError } = await supabase.storage.from(bucketName).list("", {
        limit: 1,
      })
      return !accessError
    } catch {
      return false
    }
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

