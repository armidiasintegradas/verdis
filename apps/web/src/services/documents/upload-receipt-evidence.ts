import type { ActiveScope } from '@/domain/scope'
import { supabase } from '@/lib/supabase/client'
import { hashFileSha256 } from './hash-file'

export type UploadReceiptEvidenceInput = {
  scope: ActiveScope
  movementId: string
  file: File
  claimedQuantityKg: number
}

export type UploadReceiptEvidenceResult = {
  documentId: string
  evidenceId: string
  originalFilename: string
}

function sanitizeFilename(filename: string): string {
  const safe = filename.replace(/[^A-Za-z0-9._-]/g, '_')
  return safe.length > 0 ? safe : 'document'
}

export async function uploadReceiptEvidence(
  input: UploadReceiptEvidenceInput,
): Promise<UploadReceiptEvidenceResult> {
  const sha256 = await hashFileSha256(input.file)

  const { data: authData, error: authError } = await supabase.auth.getUser()
  if (authError) {
    throw authError
  }
  if (!authData.user) {
    throw new Error('Authenticated user is required')
  }

  const safeFilename = sanitizeFilename(input.file.name)
  const path = `${input.scope.tenantId}/${input.scope.organizationId}/${input.movementId}/${crypto.randomUUID()}-${safeFilename}`
  const bucket = supabase.storage.from('evidence-documents')

  const { error: uploadError } = await bucket.upload(path, input.file, { upsert: false })
  if (uploadError) {
    throw uploadError
  }

  const { data, error: registrationError } = await supabase.rpc(
    'register_receipt_evidence_document',
    {
      p_movement_id: input.movementId,
      p_original_filename: input.file.name,
      p_mime_type: input.file.type || 'application/octet-stream',
      p_sha256: sha256,
      p_storage_path: path,
      p_claimed_quantity_kg: input.claimedQuantityKg,
    },
  )

  const row = data?.[0]
  if (registrationError || !row) {
    await bucket.remove([path])
    throw registrationError ?? new Error('Evidence registration failed')
  }

  return {
    documentId: row.document_id,
    evidenceId: row.evidence_id,
    originalFilename: input.file.name,
  }
}
