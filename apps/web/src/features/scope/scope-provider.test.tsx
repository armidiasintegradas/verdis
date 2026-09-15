import { act, render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { ScopeProvider, useScope, type ScopeMembership } from './scope-provider'

const tenantId = '10000000-0000-4000-8000-000000000001'
const organizationA = '20000000-0000-4000-8000-000000000001'
const organizationB = '20000000-0000-4000-8000-000000000002'
const unknownOrganization = '20000000-0000-4000-8000-000000000099'

const memberships: ScopeMembership[] = [
  {
    membershipId: '30000000-0000-4000-8000-000000000001',
    tenantId,
    organizationId: organizationA,
    unitId: null,
    roleId: '40000000-0000-4000-8000-000000000001',
  },
  {
    membershipId: '30000000-0000-4000-8000-000000000002',
    tenantId,
    organizationId: organizationB,
    unitId: null,
    roleId: '40000000-0000-4000-8000-000000000002',
  },
]

function Probe() {
  const { activeScope, memberships: available, selectScope } = useScope()

  return (
    <div>
      <output aria-label="membership-count">{available.length}</output>
      <output aria-label="organization">{activeScope?.organizationId ?? 'none'}</output>
      <button
        type="button"
        onClick={() => selectScope({ tenantId, organizationId: organizationB, unitId: null })}
      >
        Select B
      </button>
      <button
        type="button"
        onClick={() =>
          selectScope({ tenantId, organizationId: unknownOrganization, unitId: null })
        }
      >
        Select unknown
      </button>
    </div>
  )
}

function renderProvider(children: ReactNode) {
  return render(
    <ScopeProvider loadMemberships={async () => memberships}>{children}</ScopeProvider>,
  )
}

test('loads memberships and allows selecting only a returned scope', async () => {
  renderProvider(<Probe />)

  await waitFor(() => {
    expect(screen.getByLabelText('membership-count')).toHaveTextContent('2')
  })

  expect(screen.getByLabelText('organization')).toHaveTextContent(organizationA)

  act(() => screen.getByRole('button', { name: 'Select B' }).click())
  expect(screen.getByLabelText('organization')).toHaveTextContent(organizationB)

  act(() => screen.getByRole('button', { name: 'Select unknown' }).click())
  expect(screen.getByLabelText('organization')).toHaveTextContent(organizationB)
})

test('rejects a persisted scope that is no longer present in memberships', async () => {
  localStorage.setItem(
    'verdis.activeScope',
    JSON.stringify({ tenantId, organizationId: unknownOrganization, unitId: null }),
  )

  renderProvider(<Probe />)

  await waitFor(() => {
    expect(screen.getByLabelText('membership-count')).toHaveTextContent('2')
  })

  expect(screen.getByLabelText('organization')).toHaveTextContent(organizationA)
  expect(JSON.parse(localStorage.getItem('verdis.activeScope') ?? '{}')).toEqual({
    tenantId,
    organizationId: organizationA,
    unitId: null,
  })
})
