// Edge Function „admin-users“: Zugänge verwalten – nur für Admins (app_metadata.role = 'admin').
// Sieht und liefert ausschließlich Verwaltungsdaten (E-Mail, Zeitpunkte, Status), niemals Trainingsdaten.
// Einladungs- und Reset-Links werden per generateLink erzeugt – ohne E-Mail-Versand; der Admin teilt den Link selbst.
import { adminClient, antwort, aufrufer, bediene } from '../_shared/http.ts';
import { alsNutzerEintrag, istAdmin, leseAdminAnfrage, SPERRDAUER, verbotenAufSichSelbst, type LinkAntwort } from '../_shared/regeln.ts';

bediene(async (req) => {
  const admin = adminClient();
  const ich = await aufrufer(req, admin);
  if (!ich) return antwort(req, 401, { fehler: 'Nicht angemeldet.' });
  if (!istAdmin(ich.app_metadata)) return antwort(req, 403, { fehler: 'Nur für Admins.' });

  const anfrage = leseAdminAnfrage(await req.json().catch(() => null));
  if (typeof anfrage === 'string') return antwort(req, 400, { fehler: anfrage });
  if (verbotenAufSichSelbst(anfrage, ich.id)) return antwort(req, 400, { fehler: 'Diese Aktion geht nicht für dein eigenes Konto.' });

  switch (anfrage.aktion) {
    case 'liste': {
      const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      const nutzer = data.users.map((u) => alsNutzerEintrag(u)).sort((a, b) => a.email.localeCompare(b.email));
      return antwort(req, 200, { nutzer });
    }
    case 'einladen': {
      const { data, error } = await admin.auth.admin.generateLink({ type: 'invite', email: anfrage.email });
      if (error) {
        if (/already been registered|already exists/i.test(error.message)) {
          return antwort(req, 409, { fehler: 'Für diese E-Mail gibt es schon ein Konto. Erstelle stattdessen einen Reset-Link.' });
        }
        throw error;
      }
      const ergebnis: LinkAntwort = { token: data.properties.hashed_token, typ: 'invite', email: anfrage.email };
      return antwort(req, 200, ergebnis);
    }
    case 'reset': {
      const { data: gefunden, error: suchFehler } = await admin.auth.admin.getUserById(anfrage.nutzerId);
      if (suchFehler || !gefunden.user.email) return antwort(req, 404, { fehler: 'Konto nicht gefunden.' });
      const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email: gefunden.user.email });
      if (error) throw error;
      const ergebnis: LinkAntwort = { token: data.properties.hashed_token, typ: 'recovery', email: gefunden.user.email };
      return antwort(req, 200, ergebnis);
    }
    case 'sperren':
    case 'entsperren': {
      const { error } = await admin.auth.admin.updateUserById(anfrage.nutzerId, { ban_duration: anfrage.aktion === 'sperren' ? SPERRDAUER : 'none' });
      if (error) throw error;
      return antwort(req, 200, { ok: true });
    }
    case 'loeschen': {
      // Löscht das Konto; alle Trainingsdaten werden per Fremdschlüssel (on delete cascade) mitgelöscht.
      const { error } = await admin.auth.admin.deleteUser(anfrage.nutzerId);
      if (error) throw error;
      return antwort(req, 200, { ok: true });
    }
  }
});
