/**
 * The valuation handoff.
 *
 * An owner runs a valuation, reads the range, and presses "Talk to us". Before
 * this file, the contact form on the home page had no idea any of that had
 * happened. A lead arrived saying "I want to talk" with no company, no site and
 * no number, and nobody could tell it apart from a cold form fill.
 *
 * So the valuation page leaves a note for the contact form. The note rides in
 * sessionStorage, not the URL, on purpose: the owner's revenue and profit are
 * his business, and a URL gets copied, pasted, logged and shared. sessionStorage
 * dies with the tab and never leaves the browser until the form is sent.
 *
 * The form shows the owner what it is about to attach. Nothing travels in
 * secret.
 */

const KEY = "gesher:valuation-handoff";

// A note older than this is stale. The tab was left open overnight, or he ran a
// valuation this morning and is writing about something else now.
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

export interface ValuationHandoff {
  /** Ties the note back to the Brief the engine already wrote. */
  briefId?: string;
  /** The site he typed, as a bare domain. */
  site: string;
  /** What the engine decided the company is called. */
  company?: string;
  /** The range he was shown, exactly as he read it. */
  range?: string;
  /** The bands he picked on the way in, as labels, not numbers. */
  revenue?: string;
  profit?: string;
  savedAt: number;
}

export function saveValuationHandoff(note: Omit<ValuationHandoff, "savedAt">): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...note, savedAt: Date.now() }));
  } catch {
    // Private window, blocked storage, full quota. The form just works the old
    // way. Never break a valuation over a note.
  }
}

export function readValuationHandoff(): ValuationHandoff | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const note = JSON.parse(raw) as ValuationHandoff;
    if (!note || typeof note.site !== "string" || !note.site) return null;
    if (typeof note.savedAt !== "number" || Date.now() - note.savedAt > MAX_AGE_MS) {
      clearValuationHandoff();
      return null;
    }
    return note;
  } catch {
    return null;
  }
}

export function clearValuationHandoff(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to do. A note we cannot clear is a note that expires by itself.
  }
}

/** One line for the screen and for the lead email. "Kitaron (geosoft-sys.com), ₪11M to ₪14.2M". */
export function describeHandoff(note: ValuationHandoff): string {
  const who = note.company ? `${note.company} (${note.site})` : note.site;
  return note.range ? `${who}, ${note.range}` : who;
}
