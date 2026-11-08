/**
 * Liste ou calendrier ouvert sous un champ, dans la couche supérieure du navigateur (API Popover, `popover="auto"` :
 * fermeture par Échap ou clic à l'extérieur). Il n'est ainsi jamais coupé par une fenêtre, un panneau ou une carte
 * (`overflow`, `transform`). Placé sous le champ, ou au-dessus s'il manque de place en bas.
 */
export function placerSous(panneau: HTMLElement, champ: HTMLElement, marge = 6): void {
  const r = champ.getBoundingClientRect();
  const largeur = panneau.offsetWidth || 320;
  const hauteur = panneau.offsetHeight || 360;
  const vw = document.documentElement.clientWidth;
  const vh = window.innerHeight;
  const gauche = Math.max(8, Math.min(r.left, vw - largeur - 8));
  const enBas = r.bottom + marge + hauteur <= vh - 8 || r.top - marge - hauteur < 8;
  panneau.style.left = `${gauche}px`;
  panneau.style.top = `${enBas ? r.bottom + marge : Math.max(8, r.top - marge - hauteur)}px`;
}

export function ouvrirPopover(panneau: HTMLElement): void {
  if (typeof panneau.showPopover === 'function') {
    if (!panneau.matches(':popover-open')) panneau.showPopover();
  } else {
    panneau.classList.add('ouvert-secours');
  }
}

export function fermerPopover(panneau: HTMLElement): void {
  if (typeof panneau.hidePopover === 'function') {
    if (panneau.matches(':popover-open')) panneau.hidePopover();
  } else {
    panneau.classList.remove('ouvert-secours');
  }
}

/** Styles communs du champ (bouton au rendu de `.kp-input`) et du panneau. */
export const STYLES_CHAMP_LISTE = `
  :host { display: block; min-width: 0; }
  .declencheur {
    display: flex; align-items: center; justify-content: space-between; gap: 8px; width: 100%;
    text-align: left; cursor: pointer;
  }
  .declencheur .valeur { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .declencheur .vide { color: var(--kp-text-subtle); }
  .declencheur kp-icon { flex: none; color: var(--kp-text-subtle); }
  :host(.ng-invalid.ng-touched) .declencheur {
    border-color: var(--kp-state-danger); box-shadow: inset 0 0 0 1px var(--kp-state-danger);
  }
  .panneau {
    position: fixed; inset: auto; margin: 0; padding: 12px; box-sizing: border-box;
    border: 0; border-radius: var(--kp-radius-lg); background: var(--kp-surface); color: var(--kp-text);
    box-shadow: var(--kp-elev-2), 0 0 0 1px var(--kp-border);
  }
  .panneau:not(:popover-open):not(.ouvert-secours) { display: none; }
  .pied { display: flex; justify-content: space-between; gap: 8px; margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--kp-border); }
  .lien {
    min-height: 36px; padding: 0 8px; border: 0; border-radius: var(--kp-radius-pill); background: none;
    color: var(--kp-accent); font-size: 14px; font-weight: 500; cursor: pointer;
  }
  .lien:hover { background: var(--kp-accent-soft); }
  .lien:disabled { color: var(--kp-text-subtle); background: none; cursor: not-allowed; }
`;
