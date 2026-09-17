import { supabase } from '@/lib/supabase/client'

const SIGNED_URL_TTL_SECONDS = 60

export async function openDocumentFile(storagePath: string): Promise<void> {
  const { data, error } = await supabase.storage
    .from('evidence-documents')
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS)

  if (error) throw error
  if (!data?.signedUrl) throw new Error('Signed document URL was not returned.')

  const opened = window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  if (opened) opened.opener = null
}
