// Edge Function „delete-account“: Die angemeldete Person löscht ihr eigenes Konto inklusive aller Daten.
// Es wird ausschließlich das Konto des Aufrufers gelöscht (ID aus dem geprüften JWT, nie aus dem Request-Body).
import { adminClient, antwort, aufrufer, bediene } from '../_shared/http.ts';

bediene(async (req) => {
  const admin = adminClient();
  const ich = await aufrufer(req, admin);
  if (!ich) return antwort(req, 401, { fehler: 'Nicht angemeldet.' });

  // Trainingsdaten werden per Fremdschlüssel (on delete cascade) mitgelöscht.
  const { error } = await admin.auth.admin.deleteUser(ich.id);
  if (error) throw error;
  return antwort(req, 200, { ok: true });
});
