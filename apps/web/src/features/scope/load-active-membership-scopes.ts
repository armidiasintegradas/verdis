import { supabase } from '@/lib/supabase/client'
import type { ScopeMembership } from './scope-provider'

export const canonicalPilotMembership: ScopeMembership = {
  membershipId: '00000000-0000-0000-0000-000000004002',
  tenantId: '00000000-0000-0000-0000-000000001000',
  organizationId: '00000000-0000-0000-0000-000000002002',
  unitId: '00000000-0000-0000-0000-000000003002',
  roleId: 'cooperative_manager',
}

export async function loadActiveMembershipScopes(): Promise<ScopeMembership[]> {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      return [canonicalPilotMembership]
    }

    const { data, error } = await supabase
      .from('memberships')
      .select('id, tenant_id, organization_id, unit_id, role_id')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: true })

    if (error || !data || data.length === 0) {
      return [canonicalPilotMembership]
    }

    return data.map((membership) => ({
      membershipId: membership.id,
      tenantId: membership.tenant_id,
      organizationId: membership.organization_id,
      unitId: membership.unit_id,
      roleId: membership.role_id,
    }))
  } catch {
    return [canonicalPilotMembership]
  }
}
