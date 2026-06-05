import { supabase } from '../lib/supabase'

export async function getSetting(userId: string, key: string): Promise<string | null> {
  const { data } = await supabase
    .from('user_settings')
    .select('value')
    .eq('user_id', userId)
    .eq('key', key)
    .maybeSingle()
  return data?.value ?? null
}

export async function setSetting(userId: string, key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('user_settings')
    .upsert({ user_id: userId, key, value }, { onConflict: 'user_id,key' })
  if (error) throw error
}
