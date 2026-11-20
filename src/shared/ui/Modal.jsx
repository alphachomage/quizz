// shared/ui/Modal.jsx — LA modale unique de l'appli, accessible :
// role="dialog" + aria-modal, fermeture avec Échap, piège à focus léger
// (Tab boucle dans la modale), focus sur le 1er élément à l'ouverture et
// restauration du focus précédent à la fermeture. Clic sur le voile = fermer.
import { useEffect, useRef } from 'react';

const SELECTEUR_FOCUS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export default function Modal({ titre, onFermer, classe, children }) {
  const ref = useRef(null);
  const focusAvant = useRef(null);

  useEffect(() => {
    focusAvant.current = document.activeElement;
    const premier = ref.current?.querySelector(SELECTEUR_FOCUS);
    if (premier) premier.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onFermer();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (focusAvant.current && document.contains(focusAvant.current)) focusAvant.current.focus();
    };
  }, [onFermer]);

  // Piège à focus : Tab / Maj+Tab bouclent dans la modale.
  function onKeyDown(e) {
    if (e.key !== 'Tab' || !ref.current) return;
    const focusables = ref.current.querySelectorAll(SELECTEUR_FOCUS);
    if (!focusables.length) return;
    const premier = focusables[0];
    const dernier = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === premier) {
      dernier.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === dernier) {
      premier.focus();
      e.preventDefault();
    }
  }

  return (
    <div className="modal-overlay" onClick={onFermer} style={{ position: 'fixed' }}>
      <div
        className={classe ? `modal ${classe}` : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-label={typeof titre === 'string' ? titre : undefined}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
