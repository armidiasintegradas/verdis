import { useMemo } from 'react'
import { useScope } from './scope-provider'

export function ScopeSelector() {
  const { activeScope, memberships, selectScope } = useScope()

  const activeMembershipId = useMemo(
    () =>
      memberships.find(
        (membership) =>
          membership.tenantId === activeScope?.tenantId &&
          membership.organizationId === activeScope?.organizationId &&
          membership.unitId === activeScope?.unitId,
      )?.membershipId ?? '',
    [memberships, activeScope],
  )

  if (memberships.length <= 1) {
    return <span aria-label="Unidade operacional ativa">Escopo ativo</span>
  }

  return (
    <label>
      <span className="v-visually-hidden">Selecionar escopo operacional</span>
      <select
        aria-label="Selecionar escopo operacional"
        value={activeMembershipId}
        onChange={(event) => {
          const membership = memberships.find(
            (candidate) => candidate.membershipId === event.target.value,
          )
          if (!membership) return

          selectScope({
            tenantId: membership.tenantId,
            organizationId: membership.organizationId,
            unitId: membership.unitId,
          })
        }}
      >
        {memberships.map((membership, index) => (
          <option key={membership.membershipId} value={membership.membershipId}>
            Escopo disponível {index + 1}
          </option>
        ))}
      </select>
    </label>
  )
}
