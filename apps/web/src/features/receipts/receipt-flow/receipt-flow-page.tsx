import { useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from '@/app/router'
import type { ReceiptDecision, ReceiptResumeStep } from '@/domain/receipt-flow'
import { requiresReceiptJustification } from '@/domain/receipt-flow'
import { useScope } from '@/features/scope/scope-provider'
import { uploadReceiptEvidence } from '@/services/documents/upload-receipt-evidence'
import { confirmReceipt, type ConfirmReceiptResult } from '@/services/receipts/confirm-receipt-service'
import { loadReceiptCompletion, type ReceiptCompletionViewModel } from '@/services/receipts/receipt-completion-service'
import { loadReceiptConference, type ReceiptConferenceViewModel } from '@/services/receipts/receipt-conference-service'
import { createReceiptDraft, getReceiptDraft, updateReceiptDraft, type ReceiptDraftInput, type ReceiptDraftRecord } from '@/services/receipts/receipt-draft-service'
import { Breadcrumb } from '@/ui/components/breadcrumb'
import { Button } from '@/ui/components/button'
import { PageHeader } from '@/ui/components/page-header'
import { StatusBadge } from '@/ui/components/status-badge'
import './receipt-flow.css'

type ReceiptFlowPageProps = { movementId: string | null }
type UploadUiState =
  | { kind: 'none' }
  | { kind: 'selected'; file: File }
  | { kind: 'uploading'; file: File }
  | { kind: 'uploaded'; filename: string; documentId: string }
  | { kind: 'failed'; file: File; message: string }
type FormState = { origin: string; material: string; quantityKg: string; occurredAtLocal: string }

const EMPTY_FORM: FormState = { origin: '', material: '', quantityKg: '', occurredAtLocal: '' }
const STEPS: Array<{ key: ReceiptResumeStep; label: string }> = [
  { key: 'dados', label: 'Dados' },
  { key: 'comprovacao', label: 'Comprovação' },
  { key: 'conferencia', label: 'Conferência' },
  { key: 'concluir', label: 'Concluir' },
]

function stepFromSearch(search: string): ReceiptResumeStep {
  const value = new URLSearchParams(search).get('step')
  return value === 'comprovacao' || value === 'conferencia' || value === 'concluir' ? value : 'dados'
}

function toLocalDatetime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toIso(local: string): string {
  const date = new Date(local)
  return Number.isNaN(date.getTime()) ? local : date.toISOString()
}

function formFromDraft(draft: ReceiptDraftRecord): FormState {
  return {
    origin: draft.sourceCounterpartyId ?? '',
    material: draft.materialId,
    quantityKg: String(draft.quantityKg),
    occurredAtLocal: toLocalDatetime(draft.occurredAt),
  }
}

function draftInput(form: FormState): ReceiptDraftInput {
  return {
    sourceCounterpartyId: form.origin.trim() || null,
    materialId: form.material.trim(),
    quantityKg: Number(form.quantityKg),
    occurredAt: toIso(form.occurredAtLocal),
  }
}

function formatKg(value: number, sign = false) {
  const prefix = sign && value >= 0 ? '+' : ''
  return `${prefix}${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 }).format(value)} kg`
}

function decisionLabel(decision: ReceiptDecision) {
  if (decision === 'use_document') return 'Valor do documento adotado'
  if (decision === 'keep_registered') return 'Mantidos valores registrados'
  return 'Confirmado com valores registrados'
}

function ReceiptStepper({ activeStep }: { activeStep: ReceiptResumeStep }) {
  const activeIndex = STEPS.findIndex((step) => step.key === activeStep)
  return (
    <ol className="v-receipt-stepper" aria-label="Etapas do recebimento">
      {STEPS.map((step, index) => (
        <li
          key={step.key}
          className={`v-receipt-stepper__item ${index <= activeIndex ? 'is-active' : ''}`}
          aria-current={step.key === activeStep ? 'step' : undefined}
        >
          <span className="v-receipt-stepper__number">{index + 1}</span>
          <span>{step.label}</span>
        </li>
      ))}
    </ol>
  )
}

export function ReceiptFlowPage({ movementId }: ReceiptFlowPageProps) {
  const { search, navigate } = useRouter()
  const { activeScope, loading: scopeLoading, error: scopeError } = useScope()
  const requestedStep = stepFromSearch(search)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [draft, setDraft] = useState<ReceiptDraftRecord | null>(null)
  const [draftLoading, setDraftLoading] = useState(movementId !== null)
  const [conference, setConference] = useState<ReceiptConferenceViewModel | null>(null)
  const [conferenceLoading, setConferenceLoading] = useState(false)
  const [completion, setCompletion] = useState<ReceiptCompletionViewModel | null>(null)
  const [completionLoading, setCompletionLoading] = useState(false)
  const [uploadState, setUploadState] = useState<UploadUiState>({ kind: 'none' })
  const [decision, setDecision] = useState<ReceiptDecision | null>(null)
  const [reason, setReason] = useState('')
  const [confirmation, setConfirmation] = useState<ConfirmReceiptResult | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const cameraInputRef = useRef<HTMLInputElement | null>(null)
  const effectiveStep: ReceiptResumeStep = draft?.status === 'posted' ? 'concluir' : requestedStep

  useEffect(() => {
    let cancelled = false
    if (!movementId || !activeScope) {
      setDraftLoading(false)
      if (!movementId) {
        setDraft(null)
        setForm(EMPTY_FORM)
      }
      return () => { cancelled = true }
    }
    setDraftLoading(true)
    setErrorMessage(null)
    void getReceiptDraft(movementId, activeScope)
      .then((nextDraft) => {
        if (!cancelled) {
          setDraft(nextDraft)
          setForm(formFromDraft(nextDraft))
        }
      })
      .catch((cause) => {
        if (!cancelled) setErrorMessage(cause instanceof Error ? cause.message : 'Não foi possível carregar o recebimento.')
      })
      .finally(() => {
        if (!cancelled) setDraftLoading(false)
      })
    return () => { cancelled = true }
  }, [movementId, activeScope])

  useEffect(() => {
    let cancelled = false
    if (effectiveStep !== 'conferencia' || !movementId || !activeScope) return () => { cancelled = true }
    setConferenceLoading(true)
    setErrorMessage(null)
    void loadReceiptConference(movementId, activeScope)
      .then((nextConference) => {
        if (!cancelled) {
          setConference(nextConference)
          setDecision(null)
          setReason('')
        }
      })
      .catch((cause) => {
        if (!cancelled) setErrorMessage(cause instanceof Error ? cause.message : 'Não foi possível conferir o recebimento.')
      })
      .finally(() => {
        if (!cancelled) setConferenceLoading(false)
      })
    return () => { cancelled = true }
  }, [effectiveStep, movementId, activeScope])

  useEffect(() => {
    let cancelled = false
    if (draft?.status !== 'posted' || !movementId || !activeScope) {
      setCompletion(null)
      setCompletionLoading(false)
      return () => { cancelled = true }
    }

    setCompletionLoading(true)
    setErrorMessage(null)
    void loadReceiptCompletion(movementId, activeScope)
      .then((nextCompletion) => {
        if (!cancelled) setCompletion(nextCompletion)
      })
      .catch((cause) => {
        if (!cancelled) setErrorMessage(cause instanceof Error ? cause.message : 'Não foi possível carregar o resumo do recebimento.')
      })
      .finally(() => {
        if (!cancelled) setCompletionLoading(false)
      })

    return () => { cancelled = true }
  }, [draft?.status, movementId, activeScope])

  const quantityKg = Number(form.quantityKg)
  const formValid = Boolean(
    form.origin.trim() &&
      form.material.trim() &&
      Number.isFinite(quantityKg) &&
      quantityKg > 0 &&
      form.occurredAtLocal,
  )

  const conferenceDecision = useMemo<ReceiptDecision | null>(() => {
    if (!conference) return null
    return conference.state === 'divergence' ? decision : 'registered_only'
  }, [conference, decision])

  const hasDivergence = conference?.state === 'divergence'
  const confirmDisabled =
    submitting ||
    conferenceDecision === null ||
    (conferenceDecision !== null &&
      requiresReceiptJustification(conferenceDecision, hasDivergence) &&
      !reason.trim())

  const completionSummary: ReceiptCompletionViewModel | null = confirmation
    ? {
        movementId: confirmation.movementId,
        adoptedQuantityKg: confirmation.adoptedQuantityKg,
        previousStockKg: confirmation.previousStockKg,
        newStockKg: confirmation.newStockKg,
        decision: conferenceDecision ?? 'registered_only',
        reason: reason.trim() || null,
        document: conference?.document ?? null,
      }
    : completion

  function setField(field: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  async function handleDataContinue(event: FormEvent) {
    event.preventDefault()
    if (!activeScope || !formValid || submitting) return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const input = draftInput(form)
      let nextMovementId = movementId
      if (!nextMovementId) nextMovementId = (await createReceiptDraft(activeScope, input)).id
      else await updateReceiptDraft(nextMovementId, activeScope, input)
      navigate(`/recebimentos/novo/${nextMovementId}?step=comprovacao`)
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : 'Não foi possível salvar o rascunho.')
    } finally {
      setSubmitting(false)
    }
  }

  function handleFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      setUploadState({ kind: 'selected', file })
      setErrorMessage(null)
    }
  }

  async function handleUpload() {
    if (!activeScope || !movementId || (uploadState.kind !== 'selected' && uploadState.kind !== 'failed')) return
    const file = uploadState.file
    setUploadState({ kind: 'uploading', file })
    try {
      const result = await uploadReceiptEvidence({
        scope: activeScope,
        movementId,
        file,
        claimedQuantityKg: Number(form.quantityKg),
      })
      setUploadState({
        kind: 'uploaded',
        filename: result.originalFilename,
        documentId: result.documentId,
      })
      setConference(await loadReceiptConference(movementId, activeScope))
    } catch (cause) {
      setUploadState({
        kind: 'failed',
        file,
        message: cause instanceof Error ? cause.message : 'Falha no envio',
      })
    }
  }

  async function handleConfirm() {
    if (!movementId || !conference || !conferenceDecision || confirmDisabled) return
    setSubmitting(true)
    setErrorMessage(null)
    try {
      const result = await confirmReceipt({
        movementId,
        decision: conferenceDecision,
        evidenceId: conference.evidenceId,
        reason: requiresReceiptJustification(
          conferenceDecision,
          conference.state === 'divergence',
        )
          ? reason.trim()
          : null,
      })
      setConfirmation(result)
      navigate(`/recebimentos/novo/${movementId}?step=concluir`)
    } catch (cause) {
      setErrorMessage(cause instanceof Error ? cause.message : 'Não foi possível confirmar o recebimento.')
    } finally {
      setSubmitting(false)
    }
  }

  if (scopeLoading || draftLoading) return <div className="v-receipt-panel">Carregando recebimento...</div>
  if (scopeError) return <div className="v-receipt-panel">Não foi possível carregar o contexto operacional.</div>
  if (!activeScope) return <div className="v-receipt-panel">Selecione um contexto operacional para continuar.</div>

  return (
    <div className="v-page-grid" data-testid="receipt-flow-page">
      <div>
        <Breadcrumb
          items={[
            { label: 'Início', href: '/' },
            { label: 'Recebimentos', href: '/recebimentos' },
            { label: movementId ? 'Recebimento' : 'Novo recebimento' },
          ]}
        />
        <PageHeader
          title={effectiveStep === 'concluir' ? 'Recebimento concluído' : 'Novo recebimento'}
          description="Registre a entrada e mantenha a comprovação vinculada à movimentação."
        />
      </div>

      <ReceiptStepper activeStep={effectiveStep} />
      {errorMessage ? <div className="v-receipt-alert v-receipt-alert--error">{errorMessage}</div> : null}

      {effectiveStep === 'dados' ? (
        <form className="v-receipt-panel" onSubmit={handleDataContinue}>
          <div className="v-receipt-panel__heading">
            <div>
              <span className="v-receipt-eyebrow">ETAPA 1 DE 4</span>
              <h2>Dados do recebimento</h2>
            </div>
            <StatusBadge tone="neutral">Rascunho</StatusBadge>
          </div>
          <div className="v-receipt-form-grid">
            <label className="v-field">Origem<input className="v-control" value={form.origin} onChange={(event) => setField('origin', event.target.value)} placeholder="Empresa, cooperativa ou fornecedor" /></label>
            <label className="v-field">Material<input className="v-control" value={form.material} onChange={(event) => setField('material', event.target.value)} placeholder="Material recebido" /></label>
            <label className="v-field">Peso/quantidade<input className="v-control" inputMode="decimal" type="number" min="0" step="0.01" value={form.quantityKg} onChange={(event) => setField('quantityKg', event.target.value)} /></label>
            <label className="v-field">Data e hora<input className="v-control" type="datetime-local" value={form.occurredAtLocal} onChange={(event) => setField('occurredAtLocal', event.target.value)} /></label>
          </div>
          <div className="v-receipt-actions">
            <Button type="submit" disabled={!formValid || submitting}>{submitting ? 'SALVANDO...' : 'CONTINUAR'}</Button>
          </div>
        </form>
      ) : null}

      {effectiveStep === 'comprovacao' ? (
        <section className="v-receipt-panel">
          <div className="v-receipt-panel__heading">
            <div>
              <span className="v-receipt-eyebrow">ETAPA 2 DE 4</span>
              <h2>Comprovação</h2>
              <p>Associe uma evidência ao recebimento ou prossiga sem documento.</p>
            </div>
          </div>
          <div className="v-receipt-summary">
            <span>Quantidade registrada</span>
            <strong>{formatKg(Number(form.quantityKg) || draft?.quantityKg || 0)}</strong>
          </div>
          <input ref={cameraInputRef} className="v-visually-hidden" aria-label="Tirar foto" type="file" accept="image/*" capture="environment" onChange={handleFileSelected} />
          {uploadState.kind === 'none' ? (
            <div className="v-receipt-upload">
              <label className="v-button v-button--secondary" htmlFor="receipt-file-input">ENVIAR ARQUIVO</label>
              <input id="receipt-file-input" className="v-visually-hidden" aria-label="Enviar arquivo" type="file" accept="image/*,.pdf" onChange={handleFileSelected} />
              <Button variant="secondary" type="button" onClick={() => cameraInputRef.current?.click()}>TIRAR FOTO</Button>
            </div>
          ) : null}
          {uploadState.kind === 'selected' ? (
            <div className="v-receipt-document-card">
              <div><strong>{uploadState.file.name}</strong><span>Pronto para enviar · {uploadState.file.type || 'arquivo'}</span></div>
              <Button type="button" onClick={() => void handleUpload()}>ENVIAR DOCUMENTO</Button>
            </div>
          ) : null}
          {uploadState.kind === 'uploading' ? (
            <div className="v-receipt-document-card">
              <div><strong>{uploadState.file.name}</strong><span>Enviando...</span></div>
              <StatusBadge tone="processing">Enviando</StatusBadge>
            </div>
          ) : null}
          {uploadState.kind === 'uploaded' ? (
            <div className="v-receipt-document-card">
              <div><strong>{uploadState.filename}</strong><span>Documento enviado</span></div>
              <div className="v-receipt-inline-actions">
                <StatusBadge tone="processing">Processando</StatusBadge>
                <Button variant="secondary" type="button" onClick={() => navigate(`/documentos?document=${uploadState.documentId}`)}>VISUALIZAR DOCUMENTO</Button>
              </div>
            </div>
          ) : null}
          {uploadState.kind === 'failed' ? (
            <div className="v-receipt-upload-failure">
              <div><strong>Falha no envio</strong><p>{uploadState.message}</p><span>{uploadState.file.name}</span></div>
              <div className="v-receipt-inline-actions">
                <Button type="button" onClick={() => void handleUpload()}>TENTAR NOVAMENTE</Button>
                <label className="v-button v-button--secondary" htmlFor="receipt-file-replace">Trocar arquivo</label>
                <input id="receipt-file-replace" className="v-visually-hidden" aria-label="Trocar arquivo" type="file" accept="image/*,.pdf" onChange={handleFileSelected} />
                <Button variant="secondary" type="button" onClick={() => cameraInputRef.current?.click()}>Tirar outra foto</Button>
              </div>
            </div>
          ) : null}
          <div className="v-receipt-actions v-receipt-actions--spread">
            <Button variant="tertiary" type="button" onClick={() => movementId && navigate(`/recebimentos/novo/${movementId}?step=conferencia`)}>CONTINUAR SEM DOCUMENTO</Button>
            <Button type="button" disabled={uploadState.kind !== 'uploaded'} onClick={() => movementId && navigate(`/recebimentos/novo/${movementId}?step=conferencia`)}>CONTINUAR</Button>
          </div>
        </section>
      ) : null}

      {effectiveStep === 'conferencia' ? (
        <section className="v-receipt-panel">
          <div className="v-receipt-panel__heading">
            <div>
              <span className="v-receipt-eyebrow">ETAPA 3 DE 4</span>
              <h2>Conferência</h2>
              <p>Confira o registro antes de confirmar a entrada no estoque.</p>
            </div>
          </div>
          {conferenceLoading || !conference ? <p>Carregando conferência...</p> : (
            <>
              <div className="v-receipt-comparison">
                <div><span>Informado</span><strong>{formatKg(conference.registeredQuantityKg)}</strong></div>
                {conference.documentQuantityKg !== null ? (
                  <div><span>{`Documento ${formatKg(conference.documentQuantityKg)}`}</span><strong>{conference.document?.filename ?? 'Documento'}</strong></div>
                ) : null}
              </div>
              {conference.state === 'processing' ? (
                <div className="v-receipt-alert"><strong>{conference.document ? 'Documento em processamento' : 'Sem documento vinculado'}</strong><p>O recebimento pode ser confirmado com os dados registrados.</p></div>
              ) : null}
              {conference.state === 'match' ? (
                <div className="v-receipt-alert v-receipt-alert--positive"><strong>Dados coincidentes</strong><p>O peso do documento coincide com o peso informado.</p></div>
              ) : null}
              {conference.state === 'divergence' && conference.documentQuantityKg !== null ? (
                <div className="v-receipt-divergence">
                  <div className="v-receipt-alert"><strong>Divergência de quantidade</strong><p>{formatKg(conference.differenceKg ?? 0, true)} / {new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(conference.differencePercent ?? 0)}%</p></div>
                  <fieldset className="v-receipt-decisions">
                    <legend>Qual quantidade deve ser adotada?</legend>
                    <label><input type="radio" name="receipt-decision" checked={decision === 'use_document'} onChange={() => { setDecision('use_document'); setReason('') }} />{`USAR ${formatKg(conference.documentQuantityKg).toUpperCase()}`}</label>
                    <label><input type="radio" name="receipt-decision" checked={decision === 'keep_registered'} onChange={() => setDecision('keep_registered')} />{`MANTER ${formatKg(conference.registeredQuantityKg).toUpperCase()}`}</label>
                  </fieldset>
                  {decision === 'keep_registered' ? (
                    <label className="v-field">Justificativa<textarea className="v-control v-receipt-textarea" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explique por que o valor registrado será mantido." /></label>
                  ) : null}
                </div>
              ) : null}
              <div className="v-receipt-actions">
                <Button type="button" disabled={confirmDisabled} onClick={() => void handleConfirm()}>{submitting ? 'CONFIRMANDO...' : 'CONFIRMAR RECEBIMENTO'}</Button>
              </div>
            </>
          )}
        </section>
      ) : null}

      {effectiveStep === 'concluir' ? (
        <section className="v-receipt-panel v-receipt-complete">
          <div className="v-receipt-panel__heading">
            <div>
              <span className="v-receipt-eyebrow">ETAPA 4 DE 4</span>
              <h2>Resumo do recebimento</h2>
              <p>A entrada foi registrada. O estoque é calculado a partir das movimentações confirmadas.</p>
            </div>
            <StatusBadge tone="positive">Concluído</StatusBadge>
          </div>
          {completionLoading && !completionSummary ? <p>Carregando resumo...</p> : null}
          {completionSummary ? (
            <>
              <div className="v-receipt-stock-equation">
                <div><span>Saldo anterior</span><strong>{formatKg(completionSummary.previousStockKg)}</strong></div>
                <span className="v-receipt-equation-symbol">+</span>
                <div><span>Entrada confirmada</span><strong>{formatKg(completionSummary.adoptedQuantityKg, true)}</strong></div>
                <span className="v-receipt-equation-symbol">=</span>
                <div><span>Novo saldo</span><strong>{formatKg(completionSummary.newStockKg)}</strong></div>
              </div>
              <div className="v-receipt-comparison">
                <div><span>Quantidade final</span><strong>{formatKg(completionSummary.adoptedQuantityKg)}</strong></div>
                <div><span>Decisão</span><strong>{decisionLabel(completionSummary.decision)}</strong></div>
              </div>
              {completionSummary.document ? (
                <div className="v-receipt-document-card">
                  <div><span>Documento vinculado</span><strong>{completionSummary.document.filename}</strong></div>
                  <StatusBadge tone={completionSummary.document.extractionStatus === 'accepted' ? 'positive' : 'processing'}>
                    {completionSummary.document.extractionStatus === 'accepted' ? 'Documento processado' : 'Processando'}
                  </StatusBadge>
                </div>
              ) : null}
              {completionSummary.reason ? (
                <div className="v-receipt-alert"><strong>Justificativa registrada</strong><p>{completionSummary.reason}</p></div>
              ) : null}
            </>
          ) : null}
          {!completionLoading && !completionSummary ? (
            <div className="v-receipt-alert"><strong>Movimentação já confirmada</strong><p>Os dados persistidos deste recebimento permanecem disponíveis no histórico operacional.</p></div>
          ) : null}
          <div className="v-receipt-actions v-receipt-actions--spread">
            <Button variant="secondary" type="button" onClick={() => navigate('/recebimentos')}>VER MOVIMENTAÇÃO</Button>
            <Button type="button" onClick={() => navigate('/recebimentos/novo?step=dados')}>RECEBER OUTRO MATERIAL</Button>
          </div>
        </section>
      ) : null}
    </div>
  )
}
