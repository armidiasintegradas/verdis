export type DocumentOrigin = 'receipt' | 'sale'
export type DocumentExtractionState = 'processing' | 'processed' | 'failed'
export type DocumentReviewState = 'none' | 'required' | 'resolved'

export type DocumentPresentationStateInput = {
  extractionExists: boolean
  extractionStatus: 'pending' | 'accepted' | 'rejected' | 'needs_review'
  hasActionableDivergence: boolean
  hasHumanResolution: boolean
}

export function deriveDocumentPresentationState(
  input: DocumentPresentationStateInput,
): { extractionState: DocumentExtractionState; reviewState: DocumentReviewState } {
  if (input.extractionStatus === 'rejected') {
    return { extractionState: 'failed', reviewState: 'none' }
  }

  if (!input.extractionExists || input.extractionStatus === 'pending') {
    return { extractionState: 'processing', reviewState: 'none' }
  }

  if (input.hasActionableDivergence) {
    return {
      extractionState: 'processed',
      reviewState: input.hasHumanResolution ? 'resolved' : 'required',
    }
  }

  return { extractionState: 'processed', reviewState: 'none' }
}

export type ReceiptDocumentComparison = {
  registeredQuantityKg: number
  documentQuantityKg: number | null
  differenceKg: number | null
  differencePercent: number | null
  hasDivergence: boolean
}

export function deriveReceiptDocumentComparison(
  registeredQuantityKg: number,
  documentQuantityKg: number | null,
): ReceiptDocumentComparison {
  if (!Number.isFinite(registeredQuantityKg) || documentQuantityKg === null || !Number.isFinite(documentQuantityKg)) {
    return {
      registeredQuantityKg,
      documentQuantityKg: null,
      differenceKg: null,
      differencePercent: null,
      hasDivergence: false,
    }
  }

  const differenceKg = documentQuantityKg - registeredQuantityKg
  const differencePercent = registeredQuantityKg === 0
    ? null
    : (differenceKg / registeredQuantityKg) * 100

  return {
    registeredQuantityKg,
    documentQuantityKg,
    differenceKg,
    differencePercent,
    hasDivergence: differenceKg !== 0,
  }
}

export type SaleDocumentValues = {
  quantityKg: number
  unitPrice: number
  totalAmount: number
}

export type SaleDocumentComparison = {
  registered: SaleDocumentValues
  documentary: SaleDocumentValues
  unitPriceDifference: number
  totalDifference: number
  percent: number | null
  hasDivergence: boolean
}

export function deriveSaleDocumentComparison(
  registered: SaleDocumentValues,
  documentary: SaleDocumentValues,
): SaleDocumentComparison {
  const unitPriceDifference = documentary.unitPrice - registered.unitPrice
  const totalDifference = documentary.totalAmount - registered.totalAmount
  const percent = registered.totalAmount === 0
    ? null
    : (totalDifference / registered.totalAmount) * 100

  return {
    registered,
    documentary,
    unitPriceDifference,
    totalDifference,
    percent,
    hasDivergence:
      documentary.quantityKg !== registered.quantityKg ||
      unitPriceDifference !== 0 ||
      totalDifference !== 0,
  }
}
