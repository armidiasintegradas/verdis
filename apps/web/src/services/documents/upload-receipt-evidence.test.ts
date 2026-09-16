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

vi.mock('./hash-file', () => ({
  hashFileSha256: mocks.hashFileSha256,
}))

vi.mock('@/lib/supabase/client', () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    storage: { from: mocks.storageFrom },
    rpc: mocks.rpc,
  },
}))

import { uploadReceiptEvidence } from './upload-receipt-evidence'

const scope: ActiveScope = {
  tenantId: '10000000-0000-4000-8000-000000000001',
  organizationId: '20000000-0000-4000-8000-000000000001',
  unitId: '30000000-0000-4000-8000-000000000001',
}

const movementId = '60000000-0000-4000-8000-000000000001'

function makeFile() {
  return new File(['ticket'], 'Ticket 009182!!.JPG', { type: 'image/jpeg' })
}

beforeEach(() => {
  vi.clearAllMocks()
  events.length = 0

  mocks.hashFileSha256.mockImplementation(async () => {
    events.push('hash')
    return 'abc123'
  })
  mocks.getUser.mockImplementation(async () => {
    events.push('user')
    return { data: { user: { id: 'authenticated-user-id' } }, error: null }
  })
  mocks.storageFrom.mockReturnValue({ upload: mocks.upload, remove: mocks.remove })
  mocks.upload.mockImplementation(async () => {
    events.push('upload')
    return { data: { path: 'stored' }, error: null }
  })
  mocks.remove.mockResolvedValue({ data: [], error: null })
  mocks.rpc.mockImplementation(async () => {
    events.push('rpc')
    return {
      data: [{ document_id: 'document-id', evidence_id: 'evidence-id' }],
      error: null,
    }
  })
})

describe('uploadReceiptEvidence', () => {
  it('hashes, authenticates, uploads safely and registers the durable evidence', async () => {
    const file = makeFile()

    await expect(
      uploadReceiptEvidence({
        scope,
        movementId,
        file,
        claimedQuantityKg: 480,
      }),
    ).resolves.toEqual({
      documentId: 'document-id',
      evidenceId: 'evidence-id',
      originalFilename: file.name,
    })

    expect(events).toEqual(['hash', 'user', 'upload', 'rpc'])
    expect(mocks.storageFrom).toHaveBeenCalledWith('evidence-documents')

    const [path, uploadedFile, options] = mocks.upload.mock.calls[0]
    expect(path).toMatch(
      /^10000000-0000-4000-8000-000000000001\/20000000-0000-4000-8000-000000000001\/60000000-0000-4000-8000-000000000001\/[0-9a-f-]+-Ticket_009182__\.JPG$/,
    )
    expect(uploadedFile).toBe(file)
    expect(options).toEqual({ upsert: false })

    expect(mocks.rpc).toHaveBeenCalledWith('register_receipt_evidence_document', {
      p_movement_id: movementId,
      p_original_filename: file.name,
      p_mime_type: 'image/jpeg',
      p_sha256: 'abc123',
      p_storage_path: path,
      p_claimed_quantity_kg: 480,
    })
  })

  it('does not register evidence when storage upload fails', async () => {
    mocks.upload.mockResolvedValue({ data: null, error: new Error('upload failed') })

    await expect(
      uploadReceiptEvidence({
        scope,
        movementId,
        file: makeFile(),
        claimedQuantityKg: 480,
      }),
    ).rejects.toThrow('upload failed')

    expect(mocks.rpc).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('removes the uploaded object exactly once when durable registration fails', async () => {
    mocks.rpc.mockResolvedValue({ data: null, error: new Error('registration failed') })

    await expect(
      uploadReceiptEvidence({
        scope,
        movementId,
        file: makeFile(),
        claimedQuantityKg: 480,
      }),
    ).rejects.toThrow('registration failed')

    const [path] = mocks.upload.mock.calls[0]
    expect(mocks.remove).toHaveBeenCalledTimes(1)
    expect(mocks.remove).toHaveBeenCalledWith([path])
  })

  it('requires an authenticated user before touching storage', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null })

    await expect(
      uploadReceiptEvidence({
        scope,
        movementId,
        file: makeFile(),
        claimedQuantityKg: 480,
      }),
    ).rejects.toThrow('Authenticated user is required')

    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.rpc).not.toHaveBeenCalled()
  })
})
