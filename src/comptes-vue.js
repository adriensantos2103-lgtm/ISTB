/* Onglet « Comptes » (profs et admins), ajouté à l'appli de chantier dans le cadre.
   Les demandes passent au site parent par message ; il les fait dans Supabase (fonctions istb_*). */
(function () {
  const ROLE = window.ISTB_ROLE, MOI = window.ISTB_UID;
  if (ROLE !== 'prof' && ROLE !== 'admin') return;
  const admin = ROLE === 'admin';

  const groupe = NAV.find(g => g[1].some(i => i[0] === 'data')) || NAV[NAV.length - 1];
  groupe[1].push(['comptes', 'Comptes']);
  renderNav(); // l'appli a déjà dessiné son menu au chargement

  let n = 0;
  const attente = new Map();
  window.addEventListener('message', e => {
    if (e.source !== window.parent || !e.data || e.data.istbRep === undefined) return;
    const w = attente.get(e.data.istbRep); if (!w) return;
    attente.delete(e.data.istbRep);
    e.data.ok ? w.res(e.data.data) : w.rej(new Error(e.data.err || 'erreur'));
  });
  const appel = (op, args) => new Promise((res, rej) => {
    const id = ++n; attente.set(id, { res, rej });
    window.parent.postMessage({ istbReq: id, op, args }, '*');
    setTimeout(() => { if (attente.has(id)) { attente.delete(id); rej(new Error('délai dépassé')) } }, 20000);
  });

  const ROLES = { eleve: 'Élève', prof: 'Prof', admin: 'Admin' };
  const PILL = { eleve: '', prof: 'w', admin: 'ok' };
  const ST = { liste: null, charge: false, err: '', cree: null, occupe: false, b: { nom: '', id: '', mdp: '', role: 'eleve' } };
  const date = d => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : 'jamais';

  async function charger() {
    ST.charge = true;
    try { ST.liste = await appel('liste'); ST.err = '' } catch (e) { ST.err = e.message }
    ST.charge = false;
    if (VIEW === 'comptes') render();
  }

  VIEWS.comptes = () => {
    if (!ST.liste && !ST.charge && !ST.err) charger();
    const lead = admin
      ? 'Tu crées, modifies et supprimes les comptes des élèves, des profs et des admins. Chacun a ses propres chantiers et ne voit pas ceux des autres.'
      : 'Tu crées les comptes de tes élèves. Chaque élève a ses propres chantiers et ne voit pas ceux des autres. Pour supprimer un compte, demande à un admin.';
    const optRoles = admin
      ? Object.entries(ROLES).map(([k, l]) => `<option value="${k}" ${k === ST.b.role ? 'selected' : ''}>${l}</option>`).join('')
      : '<option value="eleve">Élève</option>';
    let h = head('Outils', 'Comptes', lead);
    h += `<div class="grid2">
    <div class="panel"><h2>Créer un compte</h2>
      <div class="form">
        <label for="cpt-nom">Prénom et nom</label><input id="cpt-nom" value="${esc(ST.b.nom)}" autocomplete="off" placeholder="Ex. : Léa Martin">
        <label for="cpt-id">Identifiant</label><input id="cpt-id" value="${esc(ST.b.id)}" autocomplete="off" autocapitalize="none" spellcheck="false" placeholder="Ex. : lea.martin">
        <label for="cpt-mdp">Mot de passe</label><input id="cpt-mdp" value="${esc(ST.b.mdp)}" autocomplete="new-password" placeholder="8 caractères minimum">
        <label for="cpt-role">Rôle</label><select id="cpt-role" ${admin ? '' : 'disabled'}>${optRoles}</select>
      </div>
      <div class="row" style="margin-top:12px"><button class="btn pri" data-cpt="creer" ${ST.occupe ? 'disabled' : ''}>Créer le compte</button></div>
      ${ST.cree ? `<p class="note" style="margin-top:12px"><span class="pill ok">Compte créé</span> À transmettre : identifiant <b>${esc(ST.cree.id)}</b>, mot de passe <b>${esc(ST.cree.mdp)}</b>. La personne pourra le changer avec le bouton « Mot de passe » en haut du site.</p>` : ''}
    </div>
    <div class="panel"><h2>Qui peut faire quoi</h2><ul class="chk">
      <li><b>Élève</b> : utilise l'appli avec ses propres chantiers. Ne gère aucun compte.</li>
      <li><b>Prof</b> : comme un élève, et crée des comptes élèves. Ne supprime personne.</li>
      <li><b>Admin</b> : crée, modifie et supprime tous les comptes.</li>
    </ul><p class="note">Identifiant : lettres minuscules, chiffres, point ou tiret, 3 caractères minimum (ex. : lea.martin).</p></div>
    </div>`;
    h += `<div class="panel" style="margin-top:16px"><h2>Comptes ${ST.liste ? `<span class="tag">${ST.liste.length}</span>` : ''}</h2>`;
    if (ST.err) h += `<p class="note"><span class="pill ko">Erreur</span> ${esc(ST.err)} <button class="btn sm" data-cpt="recharger">Réessayer</button></p>`;
    else if (!ST.liste) h += '<p class="note">Chargement…</p>';
    else {
      h += `<div class="scroll"><table class="tbl"><thead><tr><th>Nom</th><th>Identifiant</th><th>Rôle</th><th>Dernière connexion</th>${admin ? '<th></th>' : ''}</tr></thead><tbody>`;
      for (const c of ST.liste) {
        const moi = c.user_id === MOI;
        const role = admin && !moi
          ? `<select data-cpt-role="${c.user_id}" style="width:auto">${Object.entries(ROLES).map(([k, l]) => `<option value="${k}" ${k === c.role ? 'selected' : ''}>${l}</option>`).join('')}</select>`
          : `<span class="pill ${PILL[c.role]}">${ROLES[c.role] || esc(c.role)}</span>`;
        const actions = admin
          ? `<td class="n"><div class="row" style="justify-content:flex-end;flex-wrap:nowrap"><button class="btn sm" data-cpt="mdp" data-u="${c.user_id}">Nouveau mot de passe</button>${moi ? '' : `<button class="btn sm ghostb" data-cpt="suppr" data-u="${c.user_id}">Supprimer</button>`}</div></td>`
          : '';
        h += `<tr><td class="strong">${esc(c.nom || '—')}${moi ? ' <span class="tag">toi</span>' : ''}</td><td class="m">${esc(c.identifiant)}</td><td>${role}</td><td class="mut">${date(c.derniere_connexion)}</td>${actions}</tr>`;
      }
      h += '</tbody></table></div>';
    }
    return h + '</div>';
  };

  const trouver = uid => (ST.liste || []).find(c => c.user_id === uid);
  const champ = id => document.getElementById(id);

  document.addEventListener('click', async e => {
    const b = e.target.closest('[data-cpt]'); if (!b || b.tagName === 'SELECT') return;
    const a = b.dataset.cpt;
    try {
      if (a === 'recharger') { ST.err = ''; ST.liste = null; render(); return }
      if (a === 'creer') {
        const nom = champ('cpt-nom').value.trim(), id = champ('cpt-id').value.trim().toLowerCase(), mdp = champ('cpt-mdp').value, role = champ('cpt-role').value;
        if (!nom || !id || !mdp) { toast('Remplis le nom, l’identifiant et le mot de passe.'); return }
        ST.b = { nom, id, mdp, role }; ST.occupe = true; render();
        try { await appel('creer', { identifiant: id, nom, mot_de_passe: mdp, role }) } finally { ST.occupe = false }
        ST.cree = { id, mdp }; ST.b = { nom: '', id: '', mdp: '', role }; toast('Compte créé : ' + id); await charger(); return;
      }
      const c = trouver(b.dataset.u); if (!c) return;
      if (a === 'mdp') {
        const mdp = prompt(`Nouveau mot de passe pour ${c.nom || c.identifiant} (8 caractères minimum) :`);
        if (mdp === null) return;
        await appel('modifier', { user_id: c.user_id, mot_de_passe: mdp });
        toast('Mot de passe changé pour ' + c.identifiant + ' : ' + mdp);
      }
      if (a === 'suppr') {
        if (!confirm(`Supprimer le compte de ${c.nom || c.identifiant} (${c.identifiant}) ?\n\nSes chantiers seront supprimés aussi. C'est définitif.`)) return;
        await appel('supprimer', { user_id: c.user_id });
        toast('Compte supprimé : ' + c.identifiant); await charger();
      }
    } catch (err) { toast(err.message); render() }
  });

  document.addEventListener('change', async e => {
    const s = e.target.closest('[data-cpt-role]'); if (!s) return;
    const c = trouver(s.dataset.cptRole); if (!c) return;
    try {
      await appel('modifier', { user_id: c.user_id, role: s.value });
      toast(`${c.identifiant} est maintenant ${ROLES[s.value]}.`); await charger();
    } catch (err) { toast(err.message); render() }
  });
})();
