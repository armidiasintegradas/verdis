export type ReceiptDecision = 'registered_only' | 'use_document' | 'keep_registered'
export type ReceiptConferenceState = 'processing' | 'match' | 'divergence'
export type ReceiptResumeStep = 'dados' | 'comprovacao' | 'conferencia' | 'concluir'

export function calculateQuantityDifference(registeredKg: number, documentKg: number) {
  const absoluteKg = documentKg - registeredKg
  const percent = registeredKg === 0 ? 0 : (absoluteKg / registeredKg) * 100
  return { absoluteKg, percent }
}

export function deriveConferenceState(input: {
  extractionFinished: boolean
  registeredKg: number
  documentKg: number | null
}): ReceiptConferenceState {
  if (!input.extractionFinished || input.documentKg === null) return 'processing'
  return input.documentKg === input.registeredKg ? 'match' : 'divergence'
}

export function requiresReceiptJustification(
  decision: ReceiptDecision,
  hasDivergence: boolean,
) {
  return hasDivergence && decision === 'keep_registered'
}

export function allowedReceiptStep(input: {
  requestedStep: ReceiptResumeStep
  movementStatus: 'draft' | 'posted' | 'voided' | null
  hasDocument: boolean
  extractionFinished: boolean
  hasDivergence: boolean
}): ReceiptResumeStep {
  if (input.movementStatus === 'posted' || input.movementStatus === 'voided') return 'concluir'
  if (input.movementStatus === null) return 'dados'
  if (input.requestedStep === 'concluir') return 'conferencia'
  return input.requestedStep
}

export function deriveReceiptResumeStep(input: {
  movementStatus: 'draft' | 'posted' | 'voided'
  hasDocument: boolean
  extractionFinished: boolean
  hasDivergence: boolean
  decision: ReceiptDecision | null
  justificationRequired: boolean
  justificationPresent: boolean
}): ReceiptResumeStep {
  if (input.movementStatus === 'posted' || input.movementStatus === 'voided') return 'concluir'
  if (input.extractionFinished && input.hasDivergence && !input.decision) return 'conferencia'
  if (input.decision === 'keep_registered' && input.justificationRequired && !input.justificationPresent) {
    return 'conferencia'
  }
  if (input.hasDocument) return input.extractionFinished ? 'conferencia' : 'comprovacao'
  return 'dados'
}
