import { z } from 'zod'

export const evidenceLevelSchema = z.enum([
  'AUTODECLARED',
  'EVIDENCED',
  'DOCUMENT_VERIFIED',
  'VALIDATED',
  'RECONCILED',
  'TRACEABILITY_PROVEN',
  'AUDITED',
])

export const evidenceDocumentTypeSchema = z.string().trim().min(1).max(80)

export type EvidenceLevel = z.infer<typeof evidenceLevelSchema>
export type EvidenceDocumentType = z.infer<typeof evidenceDocumentTypeSchema>
