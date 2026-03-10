/**
 * Resolve a user_id from a brand_username.
 *
 * Lookup order:
 *  1. brand_kit.brand_username → brand_kit.user_id
 *  2. company_information.username → company_information.user_id (shared with Doubleclicker)
 *  3. Fallback to the authenticated user's own ID (they selected this brand in the UI)
 *
 * @param {string} brandUsername
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} [authenticatedUserId] - The req.user.id from auth middleware
 * @returns {Promise<string|null>} user_id or null
 */
export async function resolveUserIdFromBrand(brandUsername, supabase, authenticatedUserId) {
  if (!brandUsername) return authenticatedUserId || null;

  // 1. Try brand_kit first (the existing Stitch-native path)
  const { data: brandKit } = await supabase
    .from('brand_kit')
    .select('user_id')
    .eq('brand_username', brandUsername)
    .maybeSingle();

  if (brandKit?.user_id) return brandKit.user_id;

  // 2. Try company_information (shared table with Doubleclicker)
  const { data: company } = await supabase
    .from('company_information')
    .select('user_id')
    .eq('username', brandUsername)
    .maybeSingle();

  if (company?.user_id) return company.user_id;

  // 3. Fallback: if the user is authenticated, use their own user_id
  //    (they picked this brand from the dropdown, so they have access)
  if (authenticatedUserId) {
    console.log(`[resolveUserIdFromBrand] No brand_kit or company_information match for "${brandUsername}", falling back to authenticated user ${authenticatedUserId}`);
    return authenticatedUserId;
  }

  return null;
}
