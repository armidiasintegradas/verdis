export type SaleDecision = 'registered_only' | 'use_document' | 'keep_registered'
export type SaleConferenceState = 'registered_only' | 'processing' | 'match' | 'divergence'
export type SaleResumeStep = 'dados' | 'comprovacao' | 'conferencia' | 'concluir'

export function projectSaleStock(availableKg: number, quantityKg: number) {
  const sufficient = quantityKg > 0 && quantityKg <= availableKg
  return {
    availableKg,
    quantityKg,
    projectedKg: sufficient ? availableKg - quantityKg : null,
    sufficient,
  }
}

export function calculateSaleCommercialDifference(input: {
  quantityKg: number
  registeredUnitPrice: number
  documentUnitPrice: number
}) {
  const unitPriceDifference = input.documentUnitPrice - input.registeredUnitPrice
  const registeredTotal = input.quantityKg * input.registeredUnitPrice
  const documentTotal = input.quantityKg * input.documentUnitPrice
  const totalDifference = documentTotal - registeredTotal
  const percent = registeredTotal === 0 ? 0 : (totalDifference / registeredTotal) * 100

  return {
    unitPriceDifference,
    registeredTotal,
    documentTotal,
    totalDifference,
    percent,
  }
}

export function requiresSaleJustification(
  decision: SaleDecision,
  hasDivergence: boolean,
) {
  return hasDivergence && decision === 'keep_registered'
}

export function allowedSaleStep(input: {
  requestedStep: SaleResumeStep
  movementStatus: 'draft' | 'posted' | 'voided' | null
}): SaleResumeStep {
  if (input.movementStatus === 'posted' || input.movementStatus === 'voided') return 'concluir'
  if (input.movementStatus === null) return 'dados'
  if (input.requestedStep === 'concluir') return 'conferencia'
  return input.requestedStep
}
