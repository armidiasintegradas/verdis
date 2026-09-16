import { describe, expect, it } from 'vitest'
import {
  allowedReceiptStep,
  calculateQuantityDifference,
  deriveConferenceState,
  requiresReceiptJustification,
} from './receipt-flow'

describe('receipt flow domain', () => {
  it('calculates the homologated 480kg x 482kg divergence', () => {
    expect(calculateQuantityDifference(480, 482)).toEqual({
      absoluteKg: 2,
      percent: 0.4166666666666667,
    })
  })

  it('does not invent extracted data while processing', () => {
    expect(deriveConferenceState({ extractionFinished: false, registeredKg: 480, documentKg: null }))
      .toBe('processing')
  })

  it('derives divergence only when processed values differ', () => {
    expect(deriveConferenceState({ extractionFinished: true, registeredKg: 480, documentKg: 482 }))
      .toBe('divergence')
  })

  it('requires justification only when keeping the registered value in divergence', () => {
    expect(requiresReceiptJustification('keep_registered', true)).toBe(true)
    expect(requiresReceiptJustification('use_document', true)).toBe(false)
    expect(requiresReceiptJustification('registered_only', false)).toBe(false)
  })

  it('forces posted movements to concluir regardless of requested query step', () => {
    expect(allowedReceiptStep({
      requestedStep: 'dados',
      movementStatus: 'posted',
      hasDocument: true,
      extractionFinished: true,
      hasDivergence: true,
    })).toBe('concluir')
  })

  it('allows conferencia for a draft without document when URL already records that choice', () => {
    expect(allowedReceiptStep({
      requestedStep: 'conferencia',
      movementStatus: 'draft',
      hasDocument: false,
      extractionFinished: false,
      hasDivergence: false,
    })).toBe('conferencia')
  })

  it('does not allow concluir for an unposted draft', () => {
    expect(allowedReceiptStep({
      requestedStep: 'concluir',
      movementStatus: 'draft',
      hasDocument: false,
      extractionFinished: false,
      hasDivergence: false,
    })).toBe('conferencia')
  })
})
