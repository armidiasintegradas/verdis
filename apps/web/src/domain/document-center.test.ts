import { describe, expect, it } from 'vitest'
import {
  deriveDocumentPresentationState,
  deriveReceiptDocumentComparison,
  deriveSaleDocumentComparison,
} from './document-center'

describe('document center domain', () => {
  it('treats missing extraction as healthy processing without review work', () => {
    expect(deriveDocumentPresentationState({
      extractionExists: false,
      extractionStatus: 'pending',
      hasActionableDivergence: false,
      hasHumanResolution: false,
    })).toEqual({ extractionState: 'processing', reviewState: 'none' })
  })

  it('marks actionable unresolved divergence as review required', () => {
    expect(deriveDocumentPresentationState({
      extractionExists: true,
      extractionStatus: 'accepted',
      hasActionableDivergence: true,
      hasHumanResolution: false,
    })).toEqual({ extractionState: 'processed', reviewState: 'required' })
  })

  it('marks resolved divergence as processed and resolved', () => {
    expect(deriveDocumentPresentationState({
      extractionExists: true,
      extractionStatus: 'accepted',
      hasActionableDivergence: true,
      hasHumanResolution: true,
    })).toEqual({ extractionState: 'processed', reviewState: 'resolved' })
  })

  it('maps rejected extraction to failed without inventing review work', () => {
    expect(deriveDocumentPresentationState({
      extractionExists: true,
      extractionStatus: 'rejected',
      hasActionableDivergence: false,
      hasHumanResolution: false,
    })).toEqual({ extractionState: 'failed', reviewState: 'none' })
  })

  it('derives canonical receipt 480 vs 482 comparison', () => {
    const result = deriveReceiptDocumentComparison(480, 482)
    expect(result.registeredQuantityKg).toBe(480)
    expect(result.documentQuantityKg).toBe(482)
    expect(result.differenceKg).toBe(2)
    expect(result.differencePercent).toBeCloseTo(0.4166666667, 6)
    expect(result.hasDivergence).toBe(true)
  })

  it('derives canonical sale 3.10 vs 3.20 comparison', () => {
    const result = deriveSaleDocumentComparison(
      { quantityKg: 1000, unitPrice: 3.1, totalAmount: 3100 },
      { quantityKg: 1000, unitPrice: 3.2, totalAmount: 3200 },
    )

    expect(result.unitPriceDifference).toBeCloseTo(0.1, 10)
    expect(result.totalDifference).toBe(100)
    expect(result.percent).toBeCloseTo(3.2258064516, 6)
    expect(result.hasDivergence).toBe(true)
  })
})
