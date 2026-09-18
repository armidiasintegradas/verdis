import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  movementSingle: vi.fn(),
  evidenceMaybeSingle: vi.fn(),
  documentSingle: vi.fn(),
  extractionMaybeSingle: vi.fn(),
}))

function chain(finalMethod: 'single' | 'maybeSingle', finalFn: ReturnType<typeof vi.fn>) {
  const builder: Record<string, unknown> = {}
  builder.select = vi.fn(() => builder)
  builder.eq = vi.fn(() => builder)
  builder.is = vi.fn(() => builder)
  builder.order = vi.fn(() => builder)
  builder.limit = vi.fn(() => builder)
  builder[finalMethod] = finalFn
  return builder
}

const movementBuilder = chain('single', mocks.movementSingle)
const evidenceBuilder = chain('maybeSingle', mocks.evidenceMaybeSingle)
const documentBuilder = chain('single', mocks.documentSingle)
const extractionBuilder = chain('maybeSingle', mocks.extractionMaybeSingle)

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: mocks.from },
}))

import { loadReceiptConference } from './receipt-conference-service'

const scope: ActiveScope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  unitId: '30000000-0000-4000-8000-000000000001',
}

const movementId = '60000000-0000-4000-8000-000000000001'
const documentId = '70000000-0000-4000-8000-000000000001'
const evidenceId = '80000000-0000-4000-8000-000000000001'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.from.mockImplementation((table: string) => {
    if (table === 'movements') return movementBuilder
    if (table === 'evidences') return evidenceBuilder
    if (table === 'documents') return documentBuilder
    if (table === 'document_extractions') return extractionBuilder
    throw new Error(`Unexpected table: ${table}`)
  })
  mocks.movementSingle.mockResolvedValue({
    data: { id: movementId, quantity_kg: 480 },
    error: null,
  })
  mocks.evidenceMaybeSingle.mockResolvedValue({
    data: { id: evidenceId, document_id: documentId, extracted_fields: {} },
    error: null,
  })
  mocks.documentSingle.mockResolvedValue({
    data: {
      id: documentId,
      original_filename: 'Ticket_009182.jpg',
      extraction_status: 'pending',
    },
    error: null,
  })
  mocks.extractionMaybeSingle.mockResolvedValue({ data: null, error: null })
})

describe('loadReceiptConference', () => {
  it('returns processing while a linked document has no extraction result', async () => {
    await expect(loadReceiptConference(movementId, scope)).resolves.toEqual({
      movementId,
      registeredQuantityKg: 480,
      documentQuantityKg: null,
      state: 'processing',
      differenceKg: null,
      differencePercent: null,
      evidenceId,
      document: {
        id: documentId,
        filename: 'Ticket_009182.jpg',
        extractionStatus: 'pending',
      },
    })
  })

  it('returns match from reconciled evidence fields when extraction finished', async () => {
    mocks.evidenceMaybeSingle.mockResolvedValue({
      data: {
        id: evidenceId,
        document_id: documentId,
        extracted_fields: { quantity_kg: 480 },
      },
      error: null,
    })
    mocks.extractionMaybeSingle.mockResolvedValue({ data: { id: 'extraction-id' }, error: null })

    await expect(loadReceiptConference(movementId, scope)).resolves.toMatchObject({
      registeredQuantityKg: 480,
      documentQuantityKg: 480,
      state: 'match',
      differenceKg: 0,
      differencePercent: 0,
    })
  })

  it('returns divergence and exact difference from reconciled evidence fields', async () => {
    mocks.evidenceMaybeSingle.mockResolvedValue({
      data: {
        id: evidenceId,
        document_id: documentId,
        extracted_fields: { quantity_kg: 482 },
      },
      error: null,
    })
    mocks.extractionMaybeSingle.mockResolvedValue({ data: { id: 'extraction-id' }, error: null })

    const result = await loadReceiptConference(movementId, scope)

    expect(result.state).toBe('divergence')
    expect(result.documentQuantityKg).toBe(482)
    expect(result.differenceKg).toBe(2)
    expect(result.differencePercent).toBeCloseTo(0.4166666667)
  })

  it('does not fabricate document data when the receipt has no evidence', async () => {
    mocks.evidenceMaybeSingle.mockResolvedValue({ data: null, error: null })

    await expect(loadReceiptConference(movementId, scope)).resolves.toEqual({
      movementId,
      registeredQuantityKg: 480,
      documentQuantityKg: null,
      state: 'processing',
      differenceKg: null,
      differencePercent: null,
      evidenceId: null,
      document: null,
    })

    expect(mocks.from).not.toHaveBeenCalledWith('documents')
    expect(mocks.from).not.toHaveBeenCalledWith('document_extractions')
  })
})
