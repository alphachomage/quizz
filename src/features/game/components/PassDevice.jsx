// PasseAppareil.jsx — écran « passe l'appareil » entre deux tours (mode duel uniquement :
// clic obligatoire pour garder le secret entre les joueurs).
import Icon from '@shared/ui/Icon.jsx';

export default function PassDevice({ joueur, couleurTheme, onPret }) {
  return (
    <div className="ecran-centre">
      <div className="passe-appareil">
        <div className="gros-icone"><Icon nom="device" taille={56} /></div>
        <h2>Passe l'appareil à</h2>
        <div className="nom-joueur" style={{ background: couleurTheme }}>
          {joueur}
        </div>
        <p className="indice">Les autres ne doivent pas regarder l'écran.</p>
        <button className="btn-principal" onClick={onPret}>
          Je suis prêt, c'est parti !
        </button>
      </div>
    </div>
  );
}
