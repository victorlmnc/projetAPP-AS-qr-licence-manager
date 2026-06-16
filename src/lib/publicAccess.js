export function publicToken(adherent) {
  return adherent?.public_token || '';
}

export function publicAdherentUrl(adherent, origin = window.location.origin) {
  const token = publicToken(adherent);
  return token ? `${origin}/adherent/${encodeURIComponent(token)}` : '';
}
