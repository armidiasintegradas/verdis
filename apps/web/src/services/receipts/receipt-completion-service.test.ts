import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: { from: mocks.from },
}))

import { loadReceiptCompletion } from './receipt-completion-service'

const movementId = '60000000-0000-4000-8000-000000000001'
const scope: ActiveScope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  unitId: '30000000-0000-4000-8000-000000000001',
}

function builder(options: {
  single?: unknown
  maybeSingle?: unknown
  ordered?: unknown
}) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  chain.select = vi.fn(() => chain)
  chain.eq = vi.fn(() => chain)
  chain.is = vi.fn(() => chain)
  chain.lte = vi.fn(() => chain)
  chain.limit = vi.fn(() => chain)
  chain.single = vi.fn(async () => options.single)
  chain.maybeSingle = vi.fn(async () => options.maybeSingle)
  chain.order = vi.fn(() => options.ordered ?? chain)
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()

  let ledgerCalls = 0
  mocks.from.mockImplementation((table: string) => {
    if (table === 'movements') {
      return builder({
        single: {
          data: {
            id: movementId,
            material_id: 'material-id',
            quantity_kg: 480,
            status: 'posted',
          },
          error: null,
        },
      })
    }

    if (table === 'validations') {
      return builder({
        maybeSingle: {
          data: {
            rule_code: 'RECEIPT_KEEP_REGISTERED_QUANTITY',
            reason: 'Quantidade operacional confirmada.',
            evidence_id: 'evidence-id',
            document_id: 'document-id',
          },
          error: null,
        },
      })
    }

    if (table === 'evidences') {
      return builder({
        maybeSingle: {
          data: { id: 'evidence-id', document_id: 'document-id' },
          error: null,
        },
      })
    }

    if (table === 'documents') {
      return builder({
        single: {
          data: {
            id: 'document-id',
            original_filename: 'Ticket_009182.jpg',
            extraction_status: 'accepted',
          },
          error: null,
        },
      })
    }

    if (table === 'stock_ledger_entries') {
      ledgerCalls += 1
      if (ledgerCalls === 1) {
        return builder({
          single: {
            data: {
              id: 'ledger-target',
              delta_kg: 480,
              created_at: '2026-09-16T12:00:00.000Z',
            },
            error: null,
          },
        })
      }

      return builder({
        ordered: Promise.resolve({
          data: [
            { id: 'ledger-before', delta_kg: 7940, created_at: '2026-09-16T11:00:00.000Z' },
            { id: 'ledger-target', delta_kg: 480, created_at: '2026-09-16T12:00:00.000Z' },
          ],
          error: null,
        }),
      })
    }

    throw new Error(`Unexpected table ${table}`)
  })
})

describe('loadReceiptCompletion', () => {
  it('reconstructs posted receipt summary from durable movement, resolution, document and ledger facts', async () => {
    await expect(loadReceiptCompletion(movementId, scope)).resolves.toEqual({
      movementId,
      adoptedQuantityKg: 480,
      previousStockKg: 7940,
      newStockKg: 8420,
      decision: 'keep_registered',
      reason: 'Quantidade operacional confirmada.',
      document: {
        id: 'document-id',
        filename: 'Ticket_009182.jpg',
        extractionStatus: 'accepted',
      },
    })
  })
})
