export function checkIsPro(profile: { is_pro?: boolean | null, pro_until?: string | null } | null | undefined): boolean {
  if (!profile) return false;
  if (profile.is_pro) return true;
  if (profile.pro_until) {
    return new Date(profile.pro_until) > new Date();
  }
  return false;
}
