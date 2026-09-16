import { describe, expect, it } from 'vitest'
import {
  allowedSaleStep,
  calculateSaleCommercialDifference,
  projectSaleStock,
  requiresSaleJustification,
} from './sale-flow'

describe('sale flow domain', () => {
  it('projects canonical sufficient stock', () => {
    expect(projectSaleStock(3200, 1000)).toEqual({
      availableKg: 3200,
      quantityKg: 1000,
      projectedKg: 2200,
      sufficient: true,
    })
  })

  it('marks 320/400 stock as unavailable', () => {
    expect(projectSaleStock(320, 400)).toEqual({
      availableKg: 320,
      quantityKg: 400,
      projectedKg: null,
      sufficient: false,
    })
  })

  it('calculates 3.10 vs 3.20 commercial divergence', () => {
    const result = calculateSaleCommercialDifference({
      quantityKg: 1000,
      registeredUnitPrice: 3.1,
      documentUnitPrice: 3.2,
    })

    expect(result.unitPriceDifference).toBeCloseTo(0.1, 10)
    expect(result.registeredTotal).toBeCloseTo(3100, 10)
    expect(result.documentTotal).toBeCloseTo(3200, 10)
    expect(result.totalDifference).toBeCloseTo(100, 10)
    expect(result.percent).toBeCloseTo(3.2258064516, 8)
  })

  it('requires a reason only when keeping registered values across a divergence', () => {
    expect(requiresSaleJustification('keep_registered', true)).toBe(true)
    expect(requiresSaleJustification('use_document', true)).toBe(false)
    expect(requiresSaleJustification('registered_only', true)).toBe(false)
    expect(requiresSaleJustification('keep_registered', false)).toBe(false)
  })

  it('forces posted and voided sales to concluir', () => {
    expect(allowedSaleStep({ requestedStep: 'dados', movementStatus: 'posted' })).toBe('concluir')
    expect(allowedSaleStep({ requestedStep: 'comprovacao', movementStatus: 'voided' })).toBe('concluir')
  })

  it('keeps a draft on the requested editable step but never lets query intent jump directly to concluir', () => {
    expect(allowedSaleStep({ requestedStep: 'comprovacao', movementStatus: 'draft' })).toBe('comprovacao')
    expect(allowedSaleStep({ requestedStep: 'concluir', movementStatus: 'draft' })).toBe('conferencia')
  })

  it('starts a bootstrap flow at dados', () => {
    expect(allowedSaleStep({ requestedStep: 'conferencia', movementStatus: null })).toBe('dados')
  })
})
