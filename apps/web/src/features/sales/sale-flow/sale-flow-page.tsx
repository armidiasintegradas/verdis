import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from '@/app/router'
import { allowedSaleStep, projectSaleStock, requiresSaleJustification, type SaleDecision, type SaleResumeStep } from '@/domain/sale-flow'
import { useScope } from '@/features/scope/scope-provider'
import { uploadSaleEvidence } from '@/services/documents/upload-sale-evidence'
import { confirmSale, type ConfirmSaleResult } from '@/services/sales/confirm-sale-service'
import { loadSaleCompletion, type SaleCompletionViewModel } from '@/services/sales/sale-completion-service'
import { loadSaleConference, type SaleConferenceViewModel } from '@/services/sales/sale-conference-service'
import { createSaleDraft, getSaleDraft, updateSaleDraft, type SaleDraftInput, type SaleDraftRecord } from '@/services/sales/sale-draft-service'
import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Button } from '@/ui/components/button'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'
import './sale-flow.css'

type SaleFlowPageProps = { movementId: string | null }
type UploadUiState =
  | { kind: 'none' }
  | { kind: 'selected'; file: File }
  | { kind: 'uploading'; file: File }
  | { kind: 'uploaded'; filename: string; documentId: string }
  | { kind: 'failed'; file: File; message: string }
type FormState = { buyer: string; material: string; quantityKg: string; unitPrice: string; soldAtLocal: string }

const EMPTY_FORM: FormState = { buyer: '', material: '', quantityKg: '', unitPrice: '', soldAtLocal: '' }
const STEPS: Array<{ key: SaleResumeStep; label: string }> = [
  { key: 'dados', label: 'Dados' }, { key: 'comprovacao', label: 'Comprovação' },
  { key: 'conferencia', label: 'Conferência' }, { key: 'concluir', label: 'Concluir' },
]

function stepFromSearch(search: string): SaleResumeStep {
  const value = new URLSearchParams(search).get('step')
  return value === 'comprovacao' || value === 'conferencia' || value === 'concluir' ? value : 'dados'
}
function toLocalDatetime(iso: string) {
  const date = new Date(iso); if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}
function toIso(local: string) { const date = new Date(local); return Number.isNaN(date.getTime()) ? local : date.toISOString() }
function formFromDraft(draft: SaleDraftRecord): FormState {
  return { buyer: draft.buyerCounterpartyId, material: draft.materialId, quantityKg: String(draft.quantityKg), unitPrice: String(draft.unitPrice), soldAtLocal: toLocalDatetime(draft.soldAt) }
}
function draftInput(form: FormState): SaleDraftInput {
  return { buyerCounterpartyId: form.buyer.trim(), materialId: form.material.trim(), quantityKg: Number(form.quantityKg), unitPrice: Number(form.unitPrice), soldAt: toIso(form.soldAtLocal) }
}
function formatKg(value: number) { return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} kg` }
function formatCurrency(value: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value) }
function formatUnitPrice(value: number) { return `${formatCurrency(value)}/kg` }
function formatPercent(value: number) { const sign = value > 0 ? '+' : ''; return `${sign}${new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)}%` }
function decisionLabel(decision: SaleDecision) {
  if (decision === 'use_document') return 'Valores do documento adotados'
  if (decision === 'keep_registered') return 'Mantidos valores registrados'
  return 'Confirmada com valores registrados'
}
function SaleStepper({ activeStep }: { activeStep: SaleResumeStep }) {
  const activeIndex = STEPS.findIndex((step) => step.key === activeStep)
  return <ol className="v-receipt-stepper" aria-label="Etapas da venda">{STEPS.map((step, index) => <li key={step.key} className={`v-receipt-stepper__item ${index <= activeIndex ? 'is-active' : ''}`} aria-current={step.key === activeStep ? 'step' : undefined}><span className="v-receipt-stepper__number">{index + 1}</span><span>{step.label}</span></li>)}</ol>
}

export function SaleFlowPage({ movementId }: SaleFlowPageProps) {
  const { search, navigate } = useRouter()
  const { activeScope, loading: scopeLoading, error: scopeError } = useScope()
  const requestedStep = stepFromSearch(search)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [draft, setDraft] = useState<SaleDraftRecord | null>(null)
  const [draftLoading, setDraftLoading] = useState(movementId !== null)
  const [conference, setConference] = useState<SaleConferenceViewModel | null>(null)
  const [conferenceLoading, setConferenceLoading] = useState(false)
  const [completion, setCompletion] = useState<SaleCompletionViewModel | null>(null)
  const [completionLoading, setCompletionLoading] = useState(false)
  const [uploadState, setUploadState] = useState<UploadUiState>({ kind: 'none' })
  const [decision, setDecision] = useState<SaleDecision | null>(null)
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmSaleResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const effectiveStep = allowedSaleStep({ requestedStep, movementStatus: draft?.status ?? (movementId ? 'draft' : null) })

  useEffect(() => {
    let cancelled = false
    if (!movementId || !activeScope) { setDraftLoading(false); if (!movementId) { setDraft(null); setForm(EMPTY_FORM) }; return () => { cancelled = true } }
    setDraftLoading(true); setErrorMessage(null)
    void getSaleDraft(movementId, activeScope).then((nextDraft) => { if (!cancelled) { setDraft(nextDraft); setForm(formFromDraft(nextDraft)) } }).catch((cause) => { if (!cancelled) setErrorMessage(cause instanceof Error ? cause.message : 'Não foi possível carregar a venda.') }).finally(() => { if (!cancelled) setDraftLoading(false) })
    return () => { cancelled = true }
  }, [movementId, activeScope])

  useEffect(() => {
    let cancelled = false
    if ((effectiveStep !== 'comprovacao' && effectiveStep !== 'conferencia') || !movementId || !activeScope) return () => { cancelled = true }
    setConferenceLoading(effectiveStep === 'conferencia')
    void loadSaleConference(movementId, activeScope).then((next) => { if (!cancelled) { setConference(next); if (effectiveStep === 'conferencia') { setDecision(null); setReason('') } } }).catch((cause) => { if (!cancelled) setErrorMessage(cause instanceof Error ? cause.message : 'Não foi possível conferir a venda.') }).finally(() => { if (!cancelled) setConferenceLoading(false) })
    return () => { cancelled = true }
  }, [effectiveStep, movementId, activeScope])

  useEffect(() => {
    let cancelled = false
    if (draft?.status !== 'posted' || !movementId || !activeScope) { setCompletion(null); setCompletionLoading(false); return () => { cancelled = true } }
    setCompletionLoading(true)
    void loadSaleCompletion(movementId, activeScope).then((value) => { if (!cancelled) setCompletion(value) }).catch((cause) => { if (!cancelled) setErrorMessage(cause instanceof Error ? cause.message : 'Não foi possível carregar o resumo da venda.') }).finally(() => { if (!cancelled) setCompletionLoading(false) })
    return () => { cancelled = true }
  }, [draft?.status, movementId, activeScope])

  const quantityKg = Number(form.quantityKg), unitPrice = Number(form.unitPrice)
  const totalAmount = Number.isFinite(quantityKg) && Number.isFinite(unitPrice) ? quantityKg * unitPrice : 0
  const stockProjection = draft ? projectSaleStock(draft.availableStockKg, quantityKg) : null
  const formValid = Boolean(form.buyer.trim() && form.material.trim() && Number.isFinite(quantityKg) && quantityKg > 0 && Number.isFinite(unitPrice) && unitPrice >= 0 && form.soldAtLocal && (stockProjection?.sufficient ?? true))
  const conferenceDecision = useMemo<SaleDecision | null>(() => !conference ? null : conference.state === 'divergence' ? decision : 'registered_only', [conference, decision])
  const confirmDisabled = submitting || conferenceDecision === null || (conferenceDecision !== null && requiresSaleJustification(conferenceDecision, conference?.state === 'divergence') && !reason.trim())
  const completionSummary: SaleCompletionViewModel | null = confirmation ? {
    movementId: confirmation.movementId, saleId: confirmation.saleId, buyerCounterpartyId: form.buyer, materialId: form.material,
    adoptedQuantityKg: confirmation.adoptedQuantityKg, adoptedUnitPrice: confirmation.adoptedUnitPrice, adoptedTotalAmount: confirmation.adoptedTotalAmount,
    previousStockKg: confirmation.previousStockKg, newStockKg: confirmation.newStockKg, decision: conferenceDecision ?? 'registered_only', reason: reason.trim() || null, document: conference?.document ?? null,
  } : completion

  function setField(field: keyof FormState, value: string) { setForm((current) => ({ ...current, [field]: value })) }
  async function handleDataContinue(event: FormEvent) {
    event.preventDefault(); if (!activeScope || !formValid || submitting) return; setSubmitting(true); setErrorMessage(null)
    try { const input = draftInput(form); let nextMovementId = movementId; if (!nextMovementId) nextMovementId = (await createSaleDraft(activeScope, input)).movementId; else await updateSaleDraft(nextMovementId, activeScope, input); navigate(`/vendas/nova/${nextMovementId}?step=comprovacao`) }
    catch (cause) { setErrorMessage(cause instanceof Error ? cause.message : 'Não foi possível salvar o rascunho da venda.') } finally { setSubmitting(false) }
  }
  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (file) { setUploadState({ kind: 'selected', file }); setErrorMessage(null) } }
  async function handleUpload() {
    if (!activeScope || !movementId || (uploadState.kind !== 'selected' && uploadState.kind !== 'failed')) return
    const file = uploadState.file; setUploadState({ kind: 'uploading', file })
    try { const result = await uploadSaleEvidence({ scope: activeScope, movementId, file, claimedQuantityKg: Number(form.quantityKg), claimedUnitPrice: Number(form.unitPrice) }); setUploadState({ kind: 'uploaded', filename: result.originalFilename, documentId: result.documentId }); setConference(await loadSaleConference(movementId, activeScope)) }
    catch (cause) { setUploadState({ kind: 'failed', file, message: cause instanceof Error ? cause.message : 'Falha no envio' }) }
  }
  async function handleConfirm() {
    if (!movementId || !conference || !conferenceDecision || confirmDisabled) return; setSubmitting(true); setErrorMessage(null)
    try { const result = await confirmSale({ movementId, decision: conferenceDecision, evidenceId: conferenceDecision === 'registered_only' ? null : conference.evidenceId, reason: requiresSaleJustification(conferenceDecision, conference.state === 'divergence') ? reason.trim() : null }); setConfirmation(result); navigate(`/vendas/nova/${movementId}?step=concluir`) }
    catch (cause) { const message = cause instanceof Error ? cause.message : 'Não foi possível confirmar a venda.'; setErrorMessage(message.includes('insufficient stock') ? 'O estoque disponível mudou desde o início da venda. Revise a quantidade antes de confirmar.' : message) } finally { setSubmitting(false) }
  }

  if (scopeLoading || draftLoading) return <div className="v-receipt-panel">Carregando venda...</div>
  if (scopeError) return <div className="v-receipt-panel">Não foi possível carregar o contexto operacional.</div>
  if (!activeScope) return <div className="v-receipt-panel">Selecione um contexto operacional para continuar.</div>
  const existingDocument = conference?.document ?? null
  const normalContinueAvailable = uploadState.kind === 'uploaded' || Boolean(existingDocument)

  return <div className="v-page-grid" data-testid="sale-flow-page">
    <div><Breadcrumb items={[{ label: 'Início', href: '/' }, { label: 'Vendas', href: '/vendas' }, { label: movementId ? 'Venda' : 'Nova venda' }]} /><PageHeader title={effectiveStep === 'concluir' ? 'Venda concluída' : 'Nova venda'} description="Registre a saída comercial e mantenha a comprovação vinculada à movimentação." /></div>
    <SaleStepper activeStep={effectiveStep} />
    {errorMessage ? <div className="v-receipt-alert v-receipt-alert--error">{errorMessage}</div> : null}

    {effectiveStep === 'dados' ? <form className="v-receipt-panel" onSubmit={handleDataContinue}>
      <div className="v-receipt-panel__heading"><div><span className="v-receipt-eyebrow">ETAPA 1 DE 4</span><h2>Dados da venda</h2></div><StatusBadge tone="neutral">Rascunho</StatusBadge></div>
      <div className="v-receipt-form-grid">
        <label className="v-field">Comprador<input className="v-control" value={form.buyer} onChange={(e) => setField('buyer', e.target.value)} /></label>
        <label className="v-field">Material<input className="v-control" value={form.material} onChange={(e) => setField('material', e.target.value)} /></label>
        <label className="v-field">Quantidade<input className="v-control" type="number" min="0" step="0.01" value={form.quantityKg} onChange={(e) => setField('quantityKg', e.target.value)} /></label>
        <label className="v-field">Preço unitário<input className="v-control" type="number" min="0" step="0.01" value={form.unitPrice} onChange={(e) => setField('unitPrice', e.target.value)} /></label>
        <label className="v-field">Data e hora<input className="v-control" type="datetime-local" value={form.soldAtLocal} onChange={(e) => setField('soldAtLocal', e.target.value)} /></label>
      </div>
      <div className="v-sale-calculation-grid"><div><span>Valor total</span><strong>{formatCurrency(totalAmount)}</strong></div>{draft ? <div><span>Saldo atual</span><strong>{formatKg(draft.availableStockKg)}</strong></div> : null}{draft ? <div><span>Saldo após venda</span><strong>{stockProjection?.sufficient ? formatKg(stockProjection.projectedKg ?? 0) : 'Indisponível'}</strong></div> : null}</div>
      <div className="v-receipt-actions"><Button type="submit" disabled={!formValid || submitting}>{submitting ? 'SALVANDO...' : 'CONTINUAR'}</Button></div>
    </form> : null}

    {effectiveStep === 'comprovacao' ? <section className="v-receipt-panel">
      <div className="v-receipt-panel__heading"><div><span className="v-receipt-eyebrow">ETAPA 2 DE 4</span><h2>Comprovação</h2><p>Associe um documento à venda ou prossiga com os valores registrados.</p></div></div>
      <div className="v-receipt-comparison"><div><span>Quantidade</span><strong>{formatKg(Number(form.quantityKg))}</strong></div><div><span>Preço registrado</span><strong>{formatUnitPrice(Number(form.unitPrice))}</strong></div><div><span>Total</span><strong>{formatCurrency(totalAmount)}</strong></div></div>
      <input ref={cameraInputRef} className="v-visually-hidden" aria-label="Tirar foto" type="file" accept="image/*" capture="environment" onChange={handleFileSelected} />
      {uploadState.kind === 'none' && !existingDocument ? <div className="v-receipt-upload"><label className="v-button v-button--secondary" htmlFor="sale-file-input">ENVIAR ARQUIVO</label><input id="sale-file-input" className="v-visually-hidden" aria-label="Enviar arquivo" type="file" accept="image/*,.pdf" onChange={handleFileSelected} /><Button variant="secondary" type="button" onClick={() => cameraInputRef.current?.click()}>TIRAR FOTO</Button></div> : null}
      {uploadState.kind === 'selected' ? <div className="v-receipt-document-card"><div><strong>{uploadState.file.name}</strong><span>Pronto para enviar · {uploadState.file.type || 'arquivo'}</span></div><Button type="button" onClick={() => void handleUpload()}>ENVIAR DOCUMENTO</Button></div> : null}
      {uploadState.kind === 'uploading' ? <div className="v-receipt-document-card"><div><strong>{uploadState.file.name}</strong><span>Enviando...</span></div><StatusBadge tone="processing">Enviando</StatusBadge></div> : null}
      {uploadState.kind === 'uploaded' ? <div className="v-receipt-document-card"><div><strong>{uploadState.filename}</strong><span>Documento enviado</span></div><div className="v-receipt-inline-actions"><StatusBadge tone="processing">Processando</StatusBadge><Button variant="secondary" type="button" onClick={() => navigate(`/documentos?document=${uploadState.documentId}`)}>VISUALIZAR DOCUMENTO</Button></div></div> : null}
      {uploadState.kind === 'none' && existingDocument ? <div className="v-receipt-document-card"><div><strong>{existingDocument.filename}</strong><span>Documento enviado</span></div><div className="v-receipt-inline-actions"><StatusBadge tone={existingDocument.extractionStatus === 'accepted' ? 'positive' : 'processing'}>{existingDocument.extractionStatus === 'accepted' ? 'Documento processado' : 'Processando'}</StatusBadge><Button variant="secondary" type="button" onClick={() => navigate(`/documentos?document=${existingDocument.id}`)}>VISUALIZAR DOCUMENTO</Button></div></div> : null}
      {uploadState.kind === 'failed' ? <div className="v-receipt-upload-failure"><div><strong>Falha no envio</strong><p>{uploadState.message}</p><span>{uploadState.file.name}</span></div><div className="v-receipt-inline-actions"><Button type="button" onClick={() => void handleUpload()}>TENTAR NOVAMENTE</Button><label className="v-button v-button--secondary" htmlFor="sale-file-replace">Trocar arquivo</label><input id="sale-file-replace" className="v-visually-hidden" aria-label="Trocar arquivo" type="file" accept="image/*,.pdf" onChange={handleFileSelected} /><Button variant="secondary" type="button" onClick={() => cameraInputRef.current?.click()}>Tirar outra foto</Button></div></div> : null}
      <div className="v-receipt-actions v-receipt-actions--spread"><Button variant="tertiary" type="button" onClick={() => movementId && navigate(`/vendas/nova/${movementId}?step=conferencia`)}>CONTINUAR SEM DOCUMENTO</Button><Button type="button" disabled={!normalContinueAvailable} onClick={() => movementId && navigate(`/vendas/nova/${movementId}?step=conferencia`)}>CONTINUAR</Button></div>
    </section> : null}

    {effectiveStep === 'conferencia' ? <section className="v-receipt-panel">
      <div className="v-receipt-panel__heading"><div><span className="v-receipt-eyebrow">ETAPA 3 DE 4</span><h2>Conferência</h2><p>Confira os valores antes de confirmar a saída de estoque.</p></div></div>
      {conferenceLoading || !conference ? <p>Carregando conferência...</p> : <><div className="v-receipt-comparison"><div><span>Registrado</span><strong>{formatUnitPrice(conference.registered.unitPrice)}</strong><small>{formatCurrency(conference.registered.totalAmount)}</small></div>{conference.documentary ? <div><span>Documento</span><strong>{formatUnitPrice(conference.documentary.unitPrice)}</strong><small>{formatCurrency(conference.documentary.totalAmount)}</small></div> : null}</div>
        {conference.state === 'registered_only' || conference.state === 'processing' ? <div className="v-receipt-alert"><strong>{conference.document ? 'Documento em processamento' : 'Sem documento vinculado'}</strong><p>A venda pode ser confirmada com os valores registrados.</p></div> : null}
        {conference.state === 'match' ? <div className="v-receipt-alert v-receipt-alert--positive"><strong>Dados coincidentes</strong><p>Preço e total do documento coincidem com os valores registrados.</p></div> : null}
        {conference.state === 'divergence' && conference.documentary && conference.differences ? <div className="v-receipt-divergence"><div className="v-receipt-alert"><strong>Divergência comercial</strong><p>{`+${formatCurrency(conference.differences.unitPriceDifference)}/kg · +${formatCurrency(conference.differences.totalDifference)} · ${formatPercent(conference.differences.percent)}`}</p></div><fieldset className="v-receipt-decisions"><legend>Quais valores devem ser adotados?</legend><label><input type="radio" name="sale-decision" checked={decision === 'use_document'} onChange={() => { setDecision('use_document'); setReason('') }} />USAR VALORES DO DOCUMENTO</label><label><input type="radio" name="sale-decision" checked={decision === 'keep_registered'} onChange={() => setDecision('keep_registered')} />MANTER VALORES REGISTRADOS</label></fieldset>{decision === 'keep_registered' ? <label className="v-field">Justificativa<textarea className="v-control v-receipt-textarea" value={reason} onChange={(e) => setReason(e.target.value)} /></label> : null}</div> : null}
        <div className="v-receipt-actions"><Button type="button" disabled={confirmDisabled} onClick={() => void handleConfirm()}>{submitting ? 'CONFIRMANDO...' : 'CONFIRMAR VENDA'}</Button></div></>}
    </section> : null}

    {effectiveStep === 'concluir' ? <section className="v-receipt-panel v-receipt-complete"><div className="v-receipt-panel__heading"><div><span className="v-receipt-eyebrow">ETAPA 4 DE 4</span><h2>Resumo da venda</h2><p>A saída foi registrada e o estoque foi recalculado pelo ledger de movimentações.</p></div><StatusBadge tone="positive">Concluída</StatusBadge></div>{completionLoading && !completionSummary ? <p>Carregando resumo...</p> : null}{completionSummary ? <><div className="v-receipt-stock-equation"><div><span>Saldo anterior</span><strong>{formatKg(completionSummary.previousStockKg)}</strong></div><span className="v-receipt-equation-symbol">−</span><div><span>Saída confirmada</span><strong>{formatKg(-completionSummary.adoptedQuantityKg)}</strong></div><span className="v-receipt-equation-symbol">=</span><div><span>Novo saldo</span><strong>{formatKg(completionSummary.newStockKg)}</strong></div></div><div className="v-receipt-comparison"><div><span>Material</span><strong>{completionSummary.materialId}</strong><small>{formatKg(completionSummary.adoptedQuantityKg)}</small></div><div><span>Comprador</span><strong>{completionSummary.buyerCounterpartyId}</strong></div><div><span>Preço final</span><strong>{formatUnitPrice(completionSummary.adoptedUnitPrice)}</strong><small>{formatCurrency(completionSummary.adoptedTotalAmount)}</small></div><div><span>Decisão</span><strong>{decisionLabel(completionSummary.decision)}</strong></div></div>{completionSummary.document ? <div className="v-receipt-document-card"><div><span>Documento vinculado</span><strong>{completionSummary.document.filename}</strong></div><StatusBadge tone={completionSummary.document.extractionStatus === 'accepted' ? 'positive' : 'processing'}>{completionSummary.document.extractionStatus === 'accepted' ? 'Documento processado' : 'Processando'}</StatusBadge></div> : null}{completionSummary.reason ? <div className="v-receipt-alert"><strong>Justificativa registrada</strong><p>{completionSummary.reason}</p></div> : null}</> : null}<div className="v-receipt-actions v-receipt-actions--spread"><Button variant="secondary" type="button" onClick={() => navigate('/vendas')}>VER MOVIMENTAÇÃO</Button><Button type="button" onClick={() => navigate('/vendas/nova?step=dados')}>REGISTRAR OUTRA VENDA</Button></div></section> : null}
  </div>
}
