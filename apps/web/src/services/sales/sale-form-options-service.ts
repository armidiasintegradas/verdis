import type { ActiveScope } from '@/domain/scope'
import { supabase } from '@/lib/supabase/client'

export type SaleBuyerOption = {
  id: string
  label: string
}

export type SaleMaterialOption = {
  id: string
  code: string
  label: string
  availableStockKg: number
}

export type SaleFormOptions = {
  buyers: SaleBuyerOption[]
  materials: SaleMaterialOption[]
}

export async function loadSaleFormOptions(scope: ActiveScope): Promise<SaleFormOptions> {
  const buyersPromise = supabase
    .from('counterparties')
    .select('id, external_name')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)
    .order('external_name')

  const materialsPromise = supabase
    .from('materials')
    .select('id, code, name')
    .eq('tenant_id', scope.tenantId)
    .order('name')

  let stockQuery = supabase
    .from('current_stock')
    .select('material_id, quantity_kg')
    .eq('tenant_id', scope.tenantId)
    .eq('organization_id', scope.organizationId)
  stockQuery = scope.unitId === null
    ? stockQuery.is('unit_id', null)
    : stockQuery.eq('unit_id', scope.unitId)
  const stockPromise = stockQuery.order('material_id')

  const [buyersResult, materialsResult, stockResult] = await Promise.all([
    buyersPromise,
    materialsPromise,
    stockPromise,
  ])

  if (buyersResult.error) throw buyersResult.error
  if (materialsResult.error) throw materialsResult.error
  if (stockResult.error) throw stockResult.error

  const stockByMaterial = new Map(
    (stockResult.data ?? []).map((row) => [row.material_id, Number(row.quantity_kg)]),
  )

  return {
    buyers: (buyersResult.data ?? []).flatMap((row) =>
      row.external_name ? [{ id: row.id, label: row.external_name }] : [],
    ),
    materials: (materialsResult.data ?? []).map((row) => ({
      id: row.id,
      code: row.code,
      label: row.name,
      availableStockKg: stockByMaterial.get(row.id) ?? 0,
    })),
  }
}
