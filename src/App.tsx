import { Navigate, Route, Routes } from 'react-router';
import { AppRahmen } from './components/AppRahmen.tsx';
import { EigeneUebungNeuSeite } from './seiten/EigeneUebungNeuSeite.tsx';
import { FortschrittSeite } from './seiten/FortschrittSeite.tsx';
import { FortschrittUebungenSeite } from './seiten/FortschrittUebungenSeite.tsx';
import { FortschrittUebungSeite } from './seiten/FortschrittUebungSeite.tsx';
import { KoerpergewichtSeite } from './seiten/KoerpergewichtSeite.tsx';
import { PlaeneSeite } from './seiten/PlaeneSeite.tsx';
import { ProfilSeite } from './seiten/ProfilSeite.tsx';
import { LiveTrainingSeite } from './seiten/LiveTrainingSeite.tsx';
import { TrainingDetailSeite } from './seiten/TrainingDetailSeite.tsx';
import { TrainingSeite } from './seiten/TrainingSeite.tsx';
import { UebungenSeite } from './seiten/UebungenSeite.tsx';
import { UebungSeite } from './seiten/UebungSeite.tsx';
import { VorlageSeite } from './seiten/VorlageSeite.tsx';

export function App() {
  return (
    <Routes>
      <Route element={<AppRahmen />}>
        <Route path="/training" element={<TrainingSeite />} />
        <Route path="/training/laufend" element={<LiveTrainingSeite />} />
        <Route path="/training/:id" element={<TrainingDetailSeite />} />
        <Route path="/plaene" element={<PlaeneSeite />} />
        <Route path="/plaene/vorlagen/:id" element={<VorlageSeite />} />
        <Route path="/plaene/uebungen" element={<UebungenSeite />} />
        <Route path="/plaene/uebungen/neu" element={<EigeneUebungNeuSeite />} />
        <Route path="/plaene/uebungen/:id" element={<UebungSeite />} />
        <Route path="/fortschritt" element={<FortschrittSeite />} />
        <Route path="/fortschritt/uebungen" element={<FortschrittUebungenSeite />} />
        <Route path="/fortschritt/uebungen/:id" element={<FortschrittUebungSeite />} />
        <Route path="/fortschritt/koerpergewicht" element={<KoerpergewichtSeite />} />
        <Route path="/profil" element={<ProfilSeite />} />
        <Route path="*" element={<Navigate to="/training" replace />} />
      </Route>
    </Routes>
  );
}
