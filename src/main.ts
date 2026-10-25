import { createClient, type Session } from '@supabase/supabase-js'
import examBrut from './exam.html?raw'
import themeExam from './theme-exam.css?raw'
import './istb.css'

/** Site « ISTB – EXAM Santos Adrien » : l'appli d'examen seule, aux couleurs de l'ISTB.
 *  Connexion par identifiant (ou e-mail) + mot de passe ; les chantiers sont dans istb_docs (RLS : membres ISTB). */

// Projet Supabase « ISTB EXAM » (compte STS), distinct de celui de FACE.
// Clé publishable : publique par conception, l'accès aux données est protégé par la RLS.
const url = (import.meta.env.VITE_ISTB_SUPABASE_URL as string | undefined) || 'https://bgktjzfzbdgvkychthyi.supabase.co'
const cle = (import.meta.env.VITE_ISTB_SUPABASE_KEY as string | undefined) || 'sb_publishable_ozRyspNiyqfvuTsAhENFDA_bGaZkolR'
const supabase = createClient(url, cle, { auth: { storageKey: 'istb-auth' } })

const app = document.getElementById('app')!
const logo = new URL('logo-istb.png', location.href).href

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

/** L'appli d'examen, avec ses propres clés de stockage local (pour ne pas se mélanger avec FACE sur le même navigateur) et l'habillage ISTB. */
function pageExam(): string {
  return examBrut
    .replaceAll("'exam-sa-", "'istb-sa-")
    .replaceAll("'exam-help-", "'istb-help-")
    .replaceAll('Supabase FACE', 'ton compte ISTB')
    .replace('<title>EXAM Santos Adrien</title>', '<title>ISTB – EXAM Santos Adrien</title>')
    + `<style>${themeExam}</style>`
}

function attente(texte = 'Chargement…') {
  app.innerHTML = `<div class="attente">${esc(texte)}</div>`
}

function connexion(message = '') {
  app.innerHTML = `
  <main class="connexion">
    <form class="carte" novalidate>
      <img class="logo" src="${logo}" alt="ISTB – Institut Supérieur des Techniciens du Bâtiment" width="556" height="109">
      <h1>EXAM Santos Adrien</h1>
      <p class="sous">Suivi financier de chantier · espace d'examen</p>
      <p class="erreur" ${message ? '' : 'hidden'}>${esc(message)}</p>
      <div class="champ">
        <label for="id">Identifiant</label>
        <input id="id" name="id" autocomplete="username" autocapitalize="none" spellcheck="false" required>
      </div>
      <div class="champ">
        <label for="mdp">Mot de passe</label>
        <div class="mdp">
          <input id="mdp" name="mdp" type="password" autocomplete="current-password" required>
          <button type="button" data-voir>Afficher</button>
        </div>
      </div>
      <button class="btn" type="submit">Se connecter</button>
      <p class="pied">Institut Supérieur des Techniciens du Bâtiment · Construire l'avenir</p>
    </form>
  </main>`
  const form = app.querySelector('form')!
  const err = app.querySelector<HTMLParagraphElement>('.erreur')!
  const mdp = app.querySelector<HTMLInputElement>('#mdp')!
  const voir = app.querySelector<HTMLButtonElement>('[data-voir]')!
  voir.onclick = () => { const cache = mdp.type === 'password'; mdp.type = cache ? 'text' : 'password'; voir.textContent = cache ? 'Masquer' : 'Afficher' }
  app.querySelector<HTMLInputElement>('#id')!.focus()

  form.onsubmit = async e => {
    e.preventDefault()
    const id = (form.elements.namedItem('id') as HTMLInputElement).value.trim()
    const motDePasse = mdp.value
    const btn = form.querySelector<HTMLButtonElement>('.btn')!
    const erreur = (t: string) => { err.textContent = t; err.hidden = false; btn.disabled = false; btn.textContent = 'Se connecter' }
    if (!id || !motDePasse) return erreur('Saisis ton identifiant et ton mot de passe.')
    btn.disabled = true; btn.textContent = 'Connexion…'
    let email = id
    if (!id.includes('@')) {
      const { data, error } = await supabase.rpc('istb_email', { p_identifiant: id })
      if (error) return erreur('Connexion impossible pour le moment. Réessaie dans un instant.')
      if (!data) return erreur('Identifiant ou mot de passe incorrect.')
      email = data as string
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password: motDePasse })
    if (error) return erreur('Identifiant ou mot de passe incorrect.')
  }
}

async function changerMotDePasse() {
  const nouveau = prompt('Nouveau mot de passe (8 caractères minimum) :')
  if (nouveau === null) return
  if (nouveau.length < 8) return alert('Le mot de passe doit faire au moins 8 caractères.')
  if (prompt('Retape le nouveau mot de passe :') !== nouveau) return alert('Les deux saisies ne correspondent pas : mot de passe inchangé.')
  const { error } = await supabase.auth.updateUser({ password: nouveau })
  alert(error ? 'Changement impossible : ' + error.message : 'Mot de passe changé.')
}

let pont: ((e: MessageEvent) => void) | null = null

async function ouvrir(session: Session) {
  attente()
  const { data: membre } = await supabase.from('istb_membres').select('identifiant').eq('user_id', session.user.id).maybeSingle()
  if (!membre) {
    await supabase.auth.signOut()
    return connexion("Ce compte n'a pas accès au site ISTB.")
  }
  const qui = (membre as { identifiant: string }).identifiant
  app.innerHTML = `
  <div class="site">
    <header class="bandeau">
      <div class="marque"><img src="${logo}" alt="ISTB"><span class="titre">EXAM Santos Adrien</span></div>
      <div class="compte"><span class="qui">Connecté : <b>${esc(qui)}</b></span><button class="sortir" type="button" data-mdp>Mot de passe</button><button class="sortir" type="button" data-sortir>Déconnexion</button></div>
    </header>
    <iframe class="cadre" title="EXAM Santos Adrien"></iframe>
  </div>`
  const cadre = app.querySelector<HTMLIFrameElement>('.cadre')!
  app.querySelector<HTMLButtonElement>('[data-sortir]')!.onclick = () => supabase.auth.signOut()
  app.querySelector<HTMLButtonElement>('[data-mdp]')!.onclick = changerMotDePasse

  // L'appli demande ses lectures/écritures par message ; on les fait dans istb_docs.
  if (pont) window.removeEventListener('message', pont)
  pont = async (e: MessageEvent) => {
    const win = cadre.contentWindow
    if (!win || e.source !== win || !e.data || typeof e.data.examReq !== 'number') return
    const { examReq, op, key, json } = e.data as { examReq: number; op: 'get' | 'set' | 'del'; key: string; json?: string }
    const repondre = (r: { ok: boolean; json?: string | null; err?: string }) => win.postMessage({ examRep: examReq, ...r }, '*')
    try {
      if (op === 'get') {
        const { data, error } = await supabase.from('istb_docs').select('json').eq('cle', key).maybeSingle()
        if (error) throw error
        repondre({ ok: true, json: (data as { json: string } | null)?.json ?? null })
      } else if (op === 'set') {
        const { error } = await supabase.from('istb_docs').upsert(
          { user_id: session.user.id, cle: key, json: json ?? '', updated_at: new Date().toISOString() },
          { onConflict: 'user_id,cle' })
        if (error) throw error
        repondre({ ok: true })
      } else if (op === 'del') {
        const { error } = await supabase.from('istb_docs').delete().eq('cle', key)
        if (error) throw error
        repondre({ ok: true })
      }
    } catch (err) {
      repondre({ ok: false, err: err instanceof Error ? err.message : String((err as { message?: string })?.message ?? err) })
    }
  }
  window.addEventListener('message', pont)
  cadre.srcdoc = pageExam()
}

let utilisateur: string | null | undefined = undefined
supabase.auth.onAuthStateChange((_evt, session) => {
  const uid = session?.user.id ?? null
  if (uid === utilisateur) return
  utilisateur = uid
  // Hors du callback d'auth : les requêtes Supabase n'y sont pas permises.
  setTimeout(() => { if (session) void ouvrir(session); else connexion() }, 0)
})
attente()
