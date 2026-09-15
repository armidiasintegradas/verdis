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
    return null
  }

  return (
    <label>
      Escopo ativo
      <select
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
            Organização {index + 1} · {membership.organizationId.slice(0, 8)}
            {membership.unitId ? ` · unidade ${membership.unitId.slice(0, 8)}` : ''}
          </option>
        ))}
      </select>
    </label>
  )
}
