import { beforeEach, describe, expect, it, vi } from 'vitest'
import { openDocumentFile } from './open-document-file'

const createSignedUrl = vi.fn()
vi.mock('@/lib/supabase/client', () => ({
  supabase: { storage: { from: vi.fn(() => ({ createSignedUrl })) } },
}))

describe('openDocumentFile', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal('open', vi.fn()) })

  it('creates a short-lived signed URL from the private evidence bucket', async () => {
    createSignedUrl.mockResolvedValue({ data: { signedUrl: 'https://signed.example/file' }, error: null })
    await openDocumentFile('tenant/doc.pdf')
    expect(createSignedUrl).toHaveBeenCalledWith('tenant/doc.pdf', 60)
    expect(window.open).toHaveBeenCalledWith('https://signed.example/file', '_blank', 'noopener,noreferrer')
  })

  it('fails without opening a window when signing fails', async () => {
    createSignedUrl.mockResolvedValue({ data: null, error: new Error('denied') })
    await expect(openDocumentFile('tenant/doc.pdf')).rejects.toThrow('denied')
    expect(window.open).not.toHaveBeenCalled()
  })
})
