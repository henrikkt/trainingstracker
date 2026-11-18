import { useState } from 'react';
import { GERAETE, GERAETE_NAMEN, MUSKELGRUPPEN, MUSKELGRUPPEN_NAMEN, type Geraet, type Muskelgruppe, type Uebung } from '../domain/typen.ts';
import { AuswahlFeld, Chip, TextFeld } from './Auswahl.tsx';
import { Knopf } from './ui.tsx';

export type UebungsDaten = Pick<Uebung, 'name' | 'muskel' | 'geraet' | 'nebenMuskeln'>;

/** Formular für eigene Übungen (anlegen und bearbeiten). */
export function EigeneUebungFormular({ start, knopfText, onSpeichern }: { start?: UebungsDaten; knopfText: string; onSpeichern: (daten: UebungsDaten) => void }) {
  const [name, setName] = useState(start?.name ?? '');
  const [muskel, setMuskel] = useState<Muskelgruppe>(start?.muskel ?? 'brust');
  const [geraet, setGeraet] = useState<Geraet>(start?.geraet ?? 'langhantel');
  const [neben, setNeben] = useState<Muskelgruppe[]>([...(start?.nebenMuskeln ?? [])]);

  const gueltig = name.trim().length > 0;
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (gueltig) onSpeichern({ name: name.trim(), muskel, geraet, nebenMuskeln: neben.filter((m) => m !== muskel) });
      }}
    >
      <TextFeld label="Name" wert={name} onChange={setName} platzhalter="z. B. Landmine Press" autoFocus={!start} />
      <div className="grid grid-cols-2 gap-3">
        <AuswahlFeld label="Muskelgruppe" wert={muskel} onChange={setMuskel} optionen={MUSKELGRUPPEN.map((m) => ({ wert: m, text: MUSKELGRUPPEN_NAMEN[m] }))} />
        <AuswahlFeld label="Gerät" wert={geraet} onChange={setGeraet} optionen={GERAETE.map((g) => ({ wert: g, text: GERAETE_NAMEN[g] }))} />
      </div>
      <fieldset>
        <legend className="mb-2 text-sm font-semibold text-text-leise">Weitere Muskeln (optional)</legend>
        <div className="flex flex-wrap gap-2">
          {MUSKELGRUPPEN.filter((m) => m !== muskel).map((m) => (
            <Chip key={m} aktiv={neben.includes(m)} onClick={() => setNeben((n) => (n.includes(m) ? n.filter((x) => x !== m) : [...n, m]))}>
              {MUSKELGRUPPEN_NAMEN[m]}
            </Chip>
          ))}
        </div>
      </fieldset>
      <Knopf gross type="submit" disabled={!gueltig}>
        {knopfText}
      </Knopf>
    </form>
  );
}
