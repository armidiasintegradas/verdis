import { describe, expect, it } from 'vitest'
import {
  calculateQuantityDifference,
  deriveConferenceState,
  deriveReceiptResumeStep,
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

  it('prioritizes posted over every editable state during resume', () => {
    expect(deriveReceiptResumeStep({
      movementStatus: 'posted',
      hasDocument: true,
      extractionFinished: true,
      hasDivergence: true,
      decision: null,
      justificationRequired: false,
      justificationPresent: false,
    })).toBe('concluir')
  })

  it('resumes unresolved divergence at conference', () => {
    expect(deriveReceiptResumeStep({
      movementStatus: 'draft',
      hasDocument: true,
      extractionFinished: true,
      hasDivergence: true,
      decision: null,
      justificationRequired: false,
      justificationPresent: false,
    })).toBe('conferencia')
  })
})
