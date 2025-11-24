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
    const { data, error } = await supabase.storage.from(bucketName).list("", {
      limit: 1,
    })
    
    // Se não houver erro, o bucket existe
    return !error
  } catch (error) {
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

