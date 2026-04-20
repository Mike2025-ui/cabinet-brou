/* ============================================================
   CABINET MONSIEUR BOU – Script principal (Version Django)
   Les données viennent de l'API Django au lieu du tableau local
   ============================================================ */

/* ──────────────────────────────────────────────────────────────
   1. DONNÉES (chargées depuis Django via API)
────────────────────────────────────────────────────────────── */
let annonces = [];

/* ──────────────────────────────────────────────────────────────
   2. ÉTAT DE L'APPLICATION (variables globales)
────────────────────────────────────────────────────────────── */
let filtreActif   = "tous";
let annonceActive = null;
let galerieImages = [];
let galerieIndex  = 0;
let noteSelectionnee = 0;
let whatsappNumero  = "2250700000000";

/* ──────────────────────────────────────────────────────────────
   2.5. FONCTIONS POUR L'API DJANGO
────────────────────────────────────────────────────────────── */
// Récupère le token CSRF pour les requêtes POST/PUT/DELETE
function getCSRFToken() {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, 10) === 'csrftoken=') {
                cookieValue = decodeURIComponent(cookie.substring(10));
                break;
            }
        }
    }
    return cookieValue;
}

// Vérifie la taille du fichier (max 10 MB)
function verifierTailleFichier(fichier, maxMB = 10) {
    const maxOctets = maxMB * 1024 * 1024;
    if (fichier.size > maxOctets) {
        afficherToast(`❌ Le fichier "${fichier.name}" dépasse ${maxMB} MB`, 'error');
        return false;
    }
    return true;
}

// Charge les annonces depuis l'API Django
async function chargerAnnonces() {
    try {
        const response = await fetch('/api/annonces/');
        const data = await response.json();
        annonces = data;
        
        renderAnnonces();
        if (document.getElementById('annoncesGrid2')) {
            renderAnnoncesPage2();
        }
        if (document.getElementById('adminList')) {
            renderAdminList();
        }
        
        console.log(`✅ ${annonces.length} annonces chargées depuis Django`);
    } catch (error) {
        console.error('Erreur lors du chargement des annonces:', error);
        afficherToast('Impossible de charger les annonces', 'error');
    }
}

/* ──────────────────────────────────────────────────────────────
   3. NAVIGATION ENTRE PAGES
────────────────────────────────────────────────────────────── */
function showPage(nom) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById('page-' + nom);
  if (page) page.classList.add('active');
  document.getElementById('navLinks').classList.remove('open');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (nom === 'annonces') renderAnnoncesPage2();
  if (nom === 'admin')    renderAdminList();
}

function toggleMenu() {
  document.getElementById('navLinks').classList.toggle('open');
}

function retourAccueil() { showPage('accueil'); }

// Fonction utilitaire pour corriger les URLs des fichiers uploadés
function getMediaUrl(path) {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://')) {
        return path;
    }
    if (path.startsWith('/media/')) {
        return path;
    }
    return `/media/${path}`;
}

/* ──────────────────────────────────────────────────────────────
   4. RENDU DES CARTES D'ANNONCES
────────────────────────────────────────────────────────────── */
function creerCarteHTML(a) {
  const etoiles = genererEtoiles(a.note);
  const imgUrl = getMediaUrl(a.imgPrincipale) || 'https://via.placeholder.com/400x210?text=Image+indisponible';

  return `
    <div class="annonce-card" data-id="${a.id}" data-type="${a.type}">
      <span class="badge-type">${capitaliser(a.type)}</span>
      <span class="badge-id">#${a.id}</span>
      <div class="card-img-wrap" onclick="voirDetail('${a.id}')">
        <img src="${imgUrl}" alt="${a.titre}" loading="lazy"
             onerror="this.src='https://via.placeholder.com/400x210?text=Image+indisponible'" />
      </div>
      <button class="card-galerie-icon" onclick="event.stopPropagation(); ouvrirGalerie('${a.id}', 0)">
        <i class="fas fa-images"></i> ${a.images.length} photos
      </button>
      <div class="card-body">
        <div class="card-title">${a.titre}</div>
        <div class="card-loc">
          <i class="fas fa-map-marker-alt"></i> ${a.ville}, ${a.quartier}
        </div>
        <div class="card-price">${a.prix}</div>
        <div class="stars">
          ${etoiles}
          <span class="rating-val">${a.note}/5</span>
        </div>
        <div class="card-btns">
          <button class="btn-detail" onclick="voirDetail('${a.id}')">
            <i class="fas fa-eye"></i> Voir détails
          </button>
          <button class="btn-interet" onclick="ouvrirContact('${a.id}')">
            <i class="fas fa-heart"></i> Je suis intéressé
          </button>
        </div>
      </div>
    </div>
  `;
}

function genererEtoiles(note) {
  let html = '';
  for (let i = 1; i <= 5; i++) {
    if (i <= Math.floor(note)) {
      html += '<i class="fas fa-star"></i>';
    } else if (i - note < 1 && i - note > 0) {
      html += '<i class="fas fa-star-half-alt"></i>';
    } else {
      html += '<i class="far fa-star"></i>';
    }
  }
  return html;
}

function capitaliser(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/* ──────────────────────────────────────────────────────────────
   5. AFFICHAGE DE LA GRILLE D'ANNONCES (page accueil)
────────────────────────────────────────────────────────────── */
function renderAnnonces() {
  const grid     = document.getElementById('annoncesGrid');
  const noResult = document.getElementById('noResult');
  const terme    = document.getElementById('searchInput')?.value.toLowerCase() || '';

  const filtrees = annonces.filter(a => {
    const matchType   = filtreActif === 'tous' || a.type === filtreActif;
    const matchSearch = terme === '' ||
      a.titre.toLowerCase().includes(terme)     ||
      a.ville.toLowerCase().includes(terme)     ||
      a.quartier.toLowerCase().includes(terme)  ||
      a.id.toLowerCase().includes(terme);
    return matchType && matchSearch;
  });

  if (filtrees.length === 0) {
    grid.innerHTML = '';
    noResult.classList.remove('hidden');
  } else {
    noResult.classList.add('hidden');
    grid.innerHTML = filtrees.map(creerCarteHTML).join('');
  }
}

/* ──────────────────────────────────────────────────────────────
   6. PAGE "TOUTES LES ANNONCES"
────────────────────────────────────────────────────────────── */
function renderAnnoncesPage2() {
  const grid = document.getElementById('annoncesGrid2');
  const terme = document.getElementById('searchInput2')?.value.toLowerCase() || '';

  const filtrees = annonces.filter(a =>
    terme === '' ||
    a.titre.toLowerCase().includes(terme) ||
    a.ville.toLowerCase().includes(terme) ||
    a.quartier.toLowerCase().includes(terme)
  );

  grid.innerHTML = filtrees.length > 0
    ? filtrees.map(creerCarteHTML).join('')
    : '<p style="text-align:center;color:var(--gray-mid);padding:40px">Aucune annonce trouvée.</p>';
}

function filterAnnonces2() { renderAnnoncesPage2(); }

/* ──────────────────────────────────────────────────────────────
   7. FILTRES
────────────────────────────────────────────────────────────── */
function setFiltre(btn, type) {
  filtreActif = type;
  document.querySelectorAll('.filtre-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderAnnonces();
}

function filterAnnonces() { renderAnnonces(); }

/* ──────────────────────────────────────────────────────────────
   8. PAGE DÉTAIL D'UNE ANNONCE
────────────────────────────────────────────────────────────── */
function voirDetail(id) {
  const a = annonces.find(x => x.id === id);
  if (!a) return;

  annonceActive = a;

  const thumbsHTML = a.images.map((img, i) => {
    const imgUrl = getMediaUrl(img);
    return `
      <div class="detail-thumb ${i === 0 ? 'active' : ''}" onclick="changerImgDetail(this,'${imgUrl}',${i})">
        <img src="${imgUrl}" alt="Photo ${i+1}" />
      </div>
    `;
  }).join('');

  const docsHTML = a.documents.length > 0 ? `
    <div class="docs-section">
      <h3><i class="fas fa-folder-open"></i> Documents juridiques (${a.documents.length})</h3>
      ${a.documents.map((doc, i) => {
        const docUrl = getMediaUrl(doc.url);
        return `
          <div class="doc-item" onclick="window.open('${docUrl}', '_blank')">
            <i class="fas fa-file-alt"></i>
            <span>${doc.nom}</span>
            <i class="fas fa-external-link-alt" style="margin-left:auto;font-size:0.75rem"></i>
          </div>
        `;
      }).join('')}
    </div>
  ` : '';

  const commentsHTML = a.commentaires.map(c => `
    <div class="comment-item">
      <div class="comment-avatar">${c.auteur.charAt(0)}</div>
      <div class="comment-content">
        <div class="comment-stars">${genererEtoiles(c.note)}</div>
        <span class="author">${c.auteur}</span>
        <span class="date">${c.date}</span>
        <p class="text">${c.texte}</p>
      </div>
    </div>
  `).join('');

  const msgWA = encodeURIComponent(
    `Bonjour Cabinet Bou, je suis intéressé par l'annonce #${a.id} – ${a.titre}. Pouvez-vous me contacter ?`
  );
  const lienWA = `https://wa.me/${whatsappNumero}?text=${msgWA}`;
  
  const imgPrincipaleUrl = getMediaUrl(a.imgPrincipale) || 'https://via.placeholder.com/800x400?text=Image+indisponible';

  document.getElementById('detailContent').innerHTML = `
    <div class="detail-layout">
      <div>
        <div class="detail-img-main" id="detailImgMain" onclick="ouvrirGalerie('${a.id}', 0)">
          <img src="${imgPrincipaleUrl}" alt="${a.titre}" id="detailImgPrincipale" />
        </div>
        <div class="detail-thumbs">${thumbsHTML}</div>
        <div class="detail-info-box">
          <h2>${a.titre}</h2>
          <div class="detail-meta-row"><i class="fas fa-tag"></i> ${capitaliser(a.type)}</div>
          <div class="detail-meta-row"><i class="fas fa-hashtag"></i> Référence #${a.id}</div>
          <div class="detail-meta-row"><i class="fas fa-map-marker-alt"></i> ${a.ville} – ${a.quartier}</div>
          ${a.surface ? `<div class="detail-meta-row"><i class="fas fa-ruler-combined"></i> ${a.surface} m²</div>` : ''}
          <div class="detail-price-big">${a.prix}</div>
          <div class="stars" style="font-size:1rem">${genererEtoiles(a.note)} <span class="rating-val">${a.note}/5</span></div>
          <p class="detail-desc">${a.description}</p>
        </div>
        ${docsHTML}
        <div class="comments-section">
          <h3><i class="fas fa-comments"></i> Commentaires & Avis (${a.commentaires.length})</h3>
          <div class="comment-form">
            <h4>Laisser un avis sur cette annonce</h4>
            <input type="text" id="comAuteur" placeholder="Votre nom" />
            <div class="stars-input" id="starsInput">
              <i class="far fa-star" data-val="1" onclick="selNote(1)"></i>
              <i class="far fa-star" data-val="2" onclick="selNote(2)"></i>
              <i class="far fa-star" data-val="3" onclick="selNote(3)"></i>
              <i class="far fa-star" data-val="4" onclick="selNote(4)"></i>
              <i class="far fa-star" data-val="5" onclick="selNote(5)"></i>
            </div>
            <textarea id="comTexte" rows="3" placeholder="Partagez votre expérience ou posez une question…"></textarea>
            <button type="button" class="btn-primary" style="margin-top:10px" onclick="ajouterCommentaire('${a.id}')">
              <i class="fas fa-paper-plane"></i> Publier
            </button>
          </div>
          <div id="commentsList">${commentsHTML || '<p style="color:var(--gray-mid);font-size:0.88rem">Soyez le premier à laisser un avis !</p>'}</div>
        </div>
      </div>
      <div class="detail-sidebar">
        <div class="sidebar-card">
          <h3>Cette annonce vous intéresse ?</h3>
          <div class="sidebar-id">Référence : #${a.id}</div>
          <button class="btn-interet-big" onclick="ouvrirContact('${a.id}')">
            <i class="fas fa-heart"></i> Je suis intéressé
          </button>
          <a href="${lienWA}" target="_blank" class="btn-whatsapp-big">
            <i class="fab fa-whatsapp"></i> Contacter via WhatsApp
          </a>
          <p style="font-size:0.78rem;color:var(--gray-mid);text-align:center;margin-top:12px">
            <i class="fas fa-shield-alt"></i> Transaction sécurisée par le Cabinet Bou
          </p>
        </div>
        <div class="sidebar-card" style="margin-top:16px">
          <h3><i class="fas fa-balance-scale"></i> Cabinet Monsieur Bou</h3>
          <p style="font-size:0.85rem;color:var(--gray-mid);margin-bottom:10px">
            Experts en droit immobilier depuis 2016. Chaque annonce est vérifiée et sécurisée juridiquement.
          </p>
          <div style="font-size:0.82rem;color:var(--gray-mid)">
            <div style="margin-bottom:6px"><i class="fas fa-phone" style="color:var(--blue);width:16px"></i> +225 07 00 00 00 00</div>
            <div><i class="fas fa-envelope" style="color:var(--blue);width:16px"></i> contact@cabinetbou.ci</div>
          </div>
        </div>
      </div>
    </div>
  `;

  showPage('detail');
  noteSelectionnee = 0;
}

function changerImgDetail(thumbEl, imgSrc, index) {
  document.getElementById('detailImgPrincipale').src = imgSrc;
  document.querySelectorAll('.detail-thumb').forEach(t => t.classList.remove('active'));
  thumbEl.classList.add('active');
  galerieIndex = index;
}

/* ──────────────────────────────────────────────────────────────
   9. GALERIE MODALE
────────────────────────────────────────────────────────────── */
function ouvrirGalerie(id, indexDep = 0, mode = 'images', docIdx = 0) {
  const a = annonces.find(x => x.id === id);
  if (!a) return;

  if (mode === 'docs') {
    galerieImages = a.documents.map(d => getMediaUrl(d.url));
    galerieIndex  = docIdx;
  } else {
    galerieImages = a.images.map(img => getMediaUrl(img));
    galerieIndex  = indexDep;
  }

  afficherImageGalerie();
  document.getElementById('modalGalerie').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function afficherImageGalerie() {
  const img   = document.getElementById('galerieImg');
  const count = document.getElementById('galerieCount');
  const thumbs = document.getElementById('galerieThumbs');

  img.src = galerieImages[galerieIndex];
  count.textContent = `${galerieIndex + 1} / ${galerieImages.length}`;

  thumbs.innerHTML = galerieImages.map((src, i) => `
    <img src="${src}" class="${i === galerieIndex ? 'active-thumb' : ''}"
         onclick="galerieGoTo(${i})" alt="Photo ${i+1}" />
  `).join('');
}

function galerieNext() {
  galerieIndex = (galerieIndex + 1) % galerieImages.length;
  afficherImageGalerie();
}
function galeriePrev() {
  galerieIndex = (galerieIndex - 1 + galerieImages.length) % galerieImages.length;
  afficherImageGalerie();
}
function galerieGoTo(i) {
  galerieIndex = i;
  afficherImageGalerie();
}
function fermerGalerie() {
  document.getElementById('modalGalerie').classList.add('hidden');
  document.body.style.overflow = '';
}

document.addEventListener('keydown', function(e) {
  const modal = document.getElementById('modalGalerie');
  if (modal.classList.contains('hidden')) return;
  if (e.key === 'ArrowRight') galerieNext();
  if (e.key === 'ArrowLeft')  galeriePrev();
  if (e.key === 'Escape')     fermerGalerie();
});

/* ──────────────────────────────────────────────────────────────
   10. MODAL CONTACT
────────────────────────────────────────────────────────────── */
function ouvrirContact(id) {
  annonceActive = annonces.find(x => x.id === id);
  if (!annonceActive) return;

  document.getElementById('modalAnnonceId').textContent = `#${id} – ${annonceActive.titre}`;
  document.getElementById('iPrenom').value = '';
  document.getElementById('iNom').value    = '';
  document.getElementById('iTel').value    = '';
  document.getElementById('iMsg').value    = '';

  document.getElementById('modalContact').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function fermerContact() {
  document.getElementById('modalContact').classList.add('hidden');
  document.body.style.overflow = '';
}

function envoyerInteret(event) {
  event.preventDefault();

  const prenom = document.getElementById('iPrenom').value.trim();
  const nom    = document.getElementById('iNom').value.trim();
  const tel    = document.getElementById('iTel').value.trim();
  const msg    = document.getElementById('iMsg').value.trim();

  if (!prenom || !nom || !tel) {
    afficherToast('Veuillez remplir tous les champs obligatoires.', 'error');
    return;
  }

  const msgAuto = `Bonjour Cabinet Bou,\n\nJe suis intéressé par l'annonce #${annonceActive.id} – ${annonceActive.titre}.\n\nMes coordonnées :\n- Prénom : ${prenom}\n- Nom : ${nom}\n- Téléphone : ${tel}${msg ? '\n- Message : ' + msg : ''}\n\nMerci de me recontacter.`;
  const msgEncode = encodeURIComponent(msgAuto);
  const lienWA = `https://wa.me/${whatsappNumero}?text=${msgEncode}`;

  document.getElementById('btnWhatsApp').onclick = function() {
    window.open(lienWA, '_blank');
  };

  fermerContact();
  afficherToast(`✅ Message préparé pour #${annonceActive.id} ! Cliquez sur WhatsApp pour envoyer.`, 'success');
  window.open(lienWA, '_blank');
}

function ouvrirWhatsApp() {
  const prenom = document.getElementById('iPrenom').value.trim();
  const nom    = document.getElementById('iNom').value.trim();
  const tel    = document.getElementById('iTel').value.trim();

  if (!annonceActive) return;

  const msgAuto = prenom
    ? `Bonjour Cabinet Bou, je suis ${prenom} ${nom} (${tel}). Je suis intéressé par l'annonce #${annonceActive.id} – ${annonceActive.titre}.`
    : `Bonjour Cabinet Bou, je suis intéressé par l'annonce #${annonceActive.id} – ${annonceActive.titre}.`;

  const lienWA = `https://wa.me/${whatsappNumero}?text=${encodeURIComponent(msgAuto)}`;
  window.open(lienWA, '_blank');
}

/* ──────────────────────────────────────────────────────────────
   11. SYSTÈME DE NOTATION
────────────────────────────────────────────────────────────── */
function selNote(val) {
  noteSelectionnee = val;
  const etoiles = document.querySelectorAll('#starsInput i');
  etoiles.forEach((e, i) => {
    if (i < val) {
      e.classList.remove('far');
      e.classList.add('fas', 'active');
    } else {
      e.classList.remove('fas', 'active');
      e.classList.add('far');
    }
  });
}

/* ──────────────────────────────────────────────────────────────
   12. AJOUT DE COMMENTAIRE (version API Django)
────────────────────────────────────────────────────────────── */
async function ajouterCommentaire(annonceId) {
  const auteur = document.getElementById('comAuteur').value.trim();
  const texte  = document.getElementById('comTexte').value.trim();

  if (!auteur) { afficherToast('Veuillez entrer votre nom.', 'error'); return; }
  if (!texte)  { afficherToast('Veuillez écrire un commentaire.', 'error'); return; }
  if (noteSelectionnee === 0) { afficherToast('Veuillez sélectionner une note (étoiles).', 'error'); return; }

  try {
    const response = await fetch(`/api/annonce/${annonceId}/commentaire/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCSRFToken()
      },
      body: JSON.stringify({
        auteur: auteur,
        note: noteSelectionnee,
        texte: texte
      })
    });

    if (response.ok) {
      await chargerAnnonces();
      voirDetail(annonceId);
      afficherToast('✅ Commentaire publié avec succès !', 'success');
    } else {
      afficherToast('Erreur lors de la publication', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    afficherToast('Erreur réseau', 'error');
  }
}

/* ──────────────────────────────────────────────────────────────
   13. FORMULAIRE CONTACT PAGE
────────────────────────────────────────────────────────────── */
function envoyerContact(event) {
  event.preventDefault();

  const prenom  = document.getElementById('cPrenom').value.trim();
  const nom     = document.getElementById('cNom').value.trim();
  const tel     = document.getElementById('cTel').value.trim();
  const message = document.getElementById('cMessage').value.trim();

  if (!prenom || !nom || !tel || !message) {
    afficherToast('Veuillez remplir tous les champs.', 'error');
    return;
  }

  const msgWA = encodeURIComponent(
    `Bonjour Cabinet Bou,\n\nNom : ${prenom} ${nom}\nTél : ${tel}\n\nMessage : ${message}`
  );
  const lienWA = `https://wa.me/${whatsappNumero}?text=${msgWA}`;

  window.open(lienWA, '_blank');
  document.getElementById('contactForm').reset();
  afficherToast('✅ Message envoyé ! WhatsApp va s\'ouvrir.', 'success');
}

/* ──────────────────────────────────────────────────────────────
   14. TABLEAU DE BORD ADMIN (version API Django avec upload)
────────────────────────────────────────────────────────────── */
async function ajouterAnnonce(event) {
    event.preventDefault();

    const formData = new FormData();
    
    formData.append('titre', document.getElementById('aTitle').value.trim());
    formData.append('type', document.getElementById('aType').value);
    formData.append('ville', document.getElementById('aVille').value.trim());
    formData.append('quartier', document.getElementById('aQuartier').value.trim());
    formData.append('prix', document.getElementById('aPrix').value.trim());
    formData.append('surface', document.getElementById('aSurface').value.trim());
    formData.append('description', document.getElementById('aDesc').value.trim());
    
    const imgMain = document.getElementById('aImgMain').files[0];
    if (imgMain) {
        if (!verifierTailleFichier(imgMain, 10)) return;
        formData.append('img_principale', imgMain);
    } else {
        afficherToast('Veuillez sélectionner une image principale', 'error');
        return;
    }
    
    const imgsSecond = document.getElementById('aImgsSecond').files;
    for (let i = 0; i < imgsSecond.length; i++) {
        if (!verifierTailleFichier(imgsSecond[i], 10)) return;
        formData.append('images', imgsSecond[i]);
    }
    
    const docs = document.getElementById('aDocs').files;
    for (let i = 0; i < docs.length; i++) {
        if (!verifierTailleFichier(docs[i], 10)) return;
        formData.append('documents', docs[i]);
    }

    try {
        const response = await fetch('/api/annonces/creer/', {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            body: formData
        });

        if (response.ok) {
            await chargerAnnonces();
            document.getElementById('adminForm').reset();
            afficherToast('✅ Annonce publiée avec succès !', 'success');
        } else {
            const error = await response.json();
            afficherToast('Erreur: ' + (error.error || 'Problème lors de la création'), 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        afficherToast('Erreur réseau', 'error');
    }
}

function renderAdminList() {
  const list = document.getElementById('adminList');
  document.getElementById('nbAnnonces').textContent = annonces.length;

  if (annonces.length === 0) {
    list.innerHTML = '<p style="color:var(--gray-mid);text-align:center;padding:20px">Aucune annonce.</p>';
    return;
  }

  list.innerHTML = annonces.map(a => {
    const imgUrl = getMediaUrl(a.imgPrincipale) || 'https://via.placeholder.com/56x44?text=?';
    return `
      <div class="admin-row">
        <img src="${imgUrl}" alt="${a.titre}"
             onerror="this.src='https://via.placeholder.com/56x44?text=?'" />
        <div class="admin-info">
          <strong>#${a.id} – ${a.titre}</strong>
          <span>${a.ville}, ${a.quartier} · ${capitaliser(a.type)} · ${a.prix}</span>
        </div>
        <button class="btn-edit" onclick="ouvrirEditAnnonce('${a.id}')">
          <i class="fas fa-edit"></i> Modifier
        </button>
        <button class="btn-suppr" onclick="supprimerAnnonce('${a.id}')">
          <i class="fas fa-trash"></i> Supprimer
        </button>
      </div>
    `;
  }).join('');
}

function ouvrirEditAnnonce(id) {
  const a = annonces.find(x => x.id === id);
  if (!a) return;
  document.getElementById('editId').value = a.id;
  document.getElementById('editTitre').value = a.titre;
  document.getElementById('editType').value = a.type;
  document.getElementById('editVille').value = a.ville;
  document.getElementById('editQuartier').value = a.quartier;
  document.getElementById('editPrix').value = a.prix;
  document.getElementById('editSurface').value = a.surface || '';
  document.getElementById('editDescription').value = a.description;
  document.getElementById('editImgPrincipale').value = '';
  document.getElementById('modalEditAnnonce').classList.remove('hidden');
}

function fermerEditAnnonce() {
  document.getElementById('modalEditAnnonce').classList.add('hidden');
}

async function soumettreEditAnnonce(event) {
    event.preventDefault();
    const id = document.getElementById('editId').value;

    const formData = new FormData();
    formData.append('titre', document.getElementById('editTitre').value);
    formData.append('type', document.getElementById('editType').value);
    formData.append('ville', document.getElementById('editVille').value);
    formData.append('quartier', document.getElementById('editQuartier').value);
    formData.append('prix', document.getElementById('editPrix').value);
    formData.append('surface', document.getElementById('editSurface').value);
    formData.append('description', document.getElementById('editDescription').value);
    
    const imgFile = document.getElementById('editImgPrincipale').files[0];
    if (imgFile) {
        if (!verifierTailleFichier(imgFile, 10)) return;
        formData.append('img_principale', imgFile);
    }

    // Ajouter un paramètre _method pour simuler PUT
    formData.append('_method', 'PUT');

    try {
        const response = await fetch(`/api/annonces/${id}/modifier/`, {
            method: 'POST',  // ← Utiliser POST au lieu de PUT
            headers: {
                'X-CSRFToken': getCSRFToken()
            },
            body: formData
        });

        if (response.ok) {
            await chargerAnnonces();
            fermerEditAnnonce();
            afficherToast(`Annonce #${id} modifiée.`, 'success');
        } else {
            const error = await response.json();
            afficherToast('Erreur: ' + (error.error || 'Problème lors de la modification'), 'error');
        }
    } catch (error) {
        console.error('Erreur:', error);
        afficherToast('Erreur réseau', 'error');
    }
}

async function supprimerAnnonce(id) {
  if (!confirm(`Supprimer définitivement l'annonce #${id} ?`)) return;

  try {
    const response = await fetch(`/api/annonces/${id}/supprimer/`, {
      method: 'DELETE',
      headers: {
        'X-CSRFToken': getCSRFToken()
      }
    });

    if (response.ok) {
      await chargerAnnonces();
      afficherToast(`Annonce #${id} supprimée.`, 'success');
    } else {
      afficherToast('Erreur lors de la suppression', 'error');
    }
  } catch (error) {
    console.error('Erreur:', error);
    afficherToast('Erreur réseau', 'error');
  }
}

/* ──────────────────────────────────────────────────────────────
   15. TOAST
────────────────────────────────────────────────────────────── */
let toastTimer = null;

function afficherToast(message, type = '', duree = 3500) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className   = `toast ${type}`;
  toast.classList.remove('hidden');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.add('hidden');
  }, duree);
}

/* ──────────────────────────────────────────────────────────────
   16. INITIALISATION
────────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async function () {
  await chargerAnnonces();
  animerApparition();
  console.log('%c✅ Cabinet Monsieur Bou – Version Django chargée', 'color:#1E3A8A;font-weight:bold;font-size:14px');
});

/* ──────────────────────────────────────────────────────────────
   17. ANIMATION
────────────────────────────────────────────────────────────── */
function animerApparition() {
  if (!window.IntersectionObserver) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeInUp 0.4s ease forwards';
      }
    });
  }, { threshold: 0.1 });

  document.querySelectorAll('.annonce-card').forEach(card => {
    card.style.opacity = '0';
    observer.observe(card);
  });
}

const styleAnim = document.createElement('style');
styleAnim.textContent = `
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;
document.head.appendChild(styleAnim);