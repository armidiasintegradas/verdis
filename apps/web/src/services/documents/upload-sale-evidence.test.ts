import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ActiveScope } from '@/domain/scope'

const events: string[] = []
const mocks = vi.hoisted(() => ({
  hashFileSha256: vi.fn(),
  getUser: vi.fn(),
  storageFrom: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
  rpc: vi.fn(),
}))

vi.mock('./hash-file', () => ({ hashFileSha256: mocks.hashFileSha256 }))
vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    storage: { from: mocks.storageFrom },
    rpc: mocks.rpc,
  },
}))

import { uploadSaleEvidence } from './upload-sale-evidence'

const scope: ActiveScope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  unitId: '30000000-0000-4000-8000-000000000001',
}
const movementId = '60000000-0000-4000-8000-000000000001'
const makeFile = () => new File(['sale'], 'Documento Venda 1279.pdf', { type: 'application/pdf' })

beforeEach(() => {
  vi.clearAllMocks()
  events.length = 0
  mocks.hashFileSha256.mockImplementation(async () => { events.push('hash'); return 'a'.repeat(64) })
  mocks.getUser.mockImplementation(async () => { events.push('user'); return { data: { user: { id: 'user-id' } }, error: null } })
  mocks.storageFrom.mockReturnValue({ upload: mocks.upload, remove: mocks.remove })
  mocks.upload.mockImplementation(async () => { events.push('upload'); return { data: { path: 'stored' }, error: null } })
  mocks.remove.mockResolvedValue({ data: [], error: null })
  mocks.rpc.mockImplementation(async () => {
    events.push('rpc')
    return { data: [{ document_id: 'document-id', evidence_id: 'evidence-id' }], error: null }
  })
})

describe('uploadSaleEvidence', () => {
  it('hashes, uploads and registers claimed quantity and unit price', async () => {
    const file = makeFile()
    await expect(uploadSaleEvidence({ scope, movementId, file, claimedQuantityKg: 1000, claimedUnitPrice: 3.1 })).resolves.toEqual({
      documentId: 'document-id', evidenceId: 'evidence-id', originalFilename: file.name,
    })
    expect(events).toEqual(['hash', 'user', 'upload', 'rpc'])
    const [path] = mocks.upload.mock.calls[0]
    expect(path).toContain(`${scope.tenantId}/${scope.organizationId}/${movementId}/`)
    expect(mocks.rpc).toHaveBeenCalledWith('register_sale_evidence_document', {
      p_movement_id: movementId,
      p_original_filename: file.name,
      p_mime_type: 'application/pdf',
      p_sha256: 'a'.repeat(64),
      p_storage_path: path,
      p_claimed_quantity_kg: 1000,
      p_claimed_unit_price: 3.1,
    })
  })

  it('never registers when storage upload fails', async () => {
    mocks.upload.mockResolvedValue({ data: null, error: new Error('upload failed') })
    await expect(uploadSaleEvidence({ scope, movementId, file: makeFile(), claimedQuantityKg: 1000, claimedUnitPrice: 3.1 })).rejects.toThrow('upload failed')
    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('rolls back the uploaded object when durable registration fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('registration failed') })
    await expect(uploadSaleEvidence({ scope, movementId, file: makeFile(), claimedQuantityKg: 1000, claimedUnitPrice: 3.1 })).rejects.toThrow('registration failed')
    const [path] = mocks.upload.mock.calls[0]
    expect(mocks.remove).toHaveBeenCalledWith([path])
  })
})
