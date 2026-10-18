/** Builds the mandatory tenant predicate from authenticated server-side context. */
export function tenantScope(businessId: string, column = 'business_id'): { clause: string; values: string[] } {
  return { clause: `${column} = $1`, values: [businessId] };
}
