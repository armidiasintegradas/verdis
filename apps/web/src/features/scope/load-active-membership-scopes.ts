import { supabase } from '@/lib/supabase/client'
import type { ScopeMembership } from './scope-provider'

export async function loadActiveMembershipScopes(): Promise<ScopeMembership[]> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    return []
  }

  const { data, error } = await supabase
    .from('memberships')
    .select('id, tenant_id, organization_id, unit_id, role_id')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })

  if (error) {
    throw error
  }

  return data.map((membership) => ({
    membershipId: membership.id,
    tenantId: membership.tenant_id,
    organizationId: membership.organization_id,
    unitId: membership.unit_id,
    roleId: membership.role_id,
  }))
}
