// shared/ui/Modal.jsx — LA modale unique de l'appli, accessible :
// role="dialog" + aria-modal, fermeture avec Échap, piège à focus léger
// (Tab boucle dans la modale), focus sur le 1er élément à l'ouverture et
// restauration du focus précédent à la fermeture. Clic sur le voile = fermer.
import { useEffect, useRef } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, ReactElement, ReactNode } from 'react';

const SELECTEUR_FOCUS = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

interface ModalProps {
  title?: string;
  onClose: () => void;
  classe?: string;
  children: ReactNode;
}

export default function Modal({ title, onClose, classe, children }: ModalProps): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const focusAvant = useRef<HTMLElement | null>(null);
  useEffect(() => {
    focusAvant.current = document.activeElement as HTMLElement | null;
    const premier = ref.current?.querySelector<HTMLElement>(SELECTEUR_FOCUS);
    if (premier) premier.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      if (focusAvant.current && document.contains(focusAvant.current)) focusAvant.current.focus();
    };
  }, [onClose]);

  // Piège à focus : Tab / Maj+Tab bouclent dans la modale.
  function onKeyDown(e: ReactKeyboardEvent<HTMLDivElement>): void {
    if (e.key !== 'Tab' || !ref.current) return;
    const focusables = ref.current.querySelectorAll<HTMLElement>(SELECTEUR_FOCUS);
    if (!focusables.length) return;
    const premier = focusables[0];
    const last = focusables[focusables.length - 1];
    if (e.shiftKey && document.activeElement === premier) {
      last.focus();
      e.preventDefault();
    } else if (!e.shiftKey && document.activeElement === last) {
      premier.focus();
      e.preventDefault();
    }
  }
  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
      }}
    >
      <div
        className={classe ? `modal ${classe}` : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === 'string' ? title : undefined}
        ref={ref}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        {children}
      </div>
    </div>
  );
}
