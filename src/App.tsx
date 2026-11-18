import { Navigate, Route, Routes } from 'react-router';
import { AppRahmen } from './components/AppRahmen.tsx';
import { TrainingSeite } from './seiten/TrainingSeite.tsx';
import { PlaeneSeite } from './seiten/PlaeneSeite.tsx';
import { FortschrittSeite } from './seiten/FortschrittSeite.tsx';
import { ProfilSeite } from './seiten/ProfilSeite.tsx';

export function App() {
  return (
    <Routes>
      <Route element={<AppRahmen />}>
        <Route path="/training" element={<TrainingSeite />} />
        <Route path="/plaene" element={<PlaeneSeite />} />
        <Route path="/fortschritt" element={<FortschrittSeite />} />
        <Route path="/profil" element={<ProfilSeite />} />
        <Route path="*" element={<Navigate to="/training" replace />} />
      </Route>
    </Routes>
  );
}
