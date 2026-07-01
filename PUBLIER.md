# Mettre le site en ligne gratuitement — Netlify

## Avant de publier : checklist

- [ ] Remplacer tous les `〔…〕` dans les pages (téléphone, e-mail, SIRET, prénoms, avis clients…)
- [ ] Coller votre clé Web3Forms dans `contact.html` (voir étape ci-dessous)
- [ ] Ajouter vos photos dans le dossier `images/` et les relier dans `realisations.html`

---

## Obtenir votre clé Web3Forms (gratuit, 2 min)

1. Allez sur **web3forms.com**
2. Entrez votre adresse e-mail → cliquez « Get your Access Key »
3. Copiez la clé reçue par mail
4. Ouvrez `contact.html` et remplacez `COLLEZ-ICI-VOTRE-CLÉ-WEB3FORMS` par votre clé
5. Sauvegardez — les demandes de devis arriveront dans votre boîte mail

---

## Publier sur Netlify (gratuit, 5 min)

### Option A — Glisser-déposer (le plus simple)

1. Allez sur **app.netlify.com** → créez un compte gratuit (avec votre e-mail)
2. Sur le tableau de bord, faites glisser **tout le dossier `maisonmat`** dans la zone « Deploy manually »
3. Votre site est en ligne en 30 secondes sur une adresse du type `nom-aleatoire.netlify.app`
4. Pour personnaliser l'adresse : Site settings → Domain management → Options → Edit site name

### Option B — Depuis GitHub (recommandé pour les mises à jour faciles)

1. Créez un compte sur **github.com**
2. Créez un nouveau dépôt « maisonmat » (privé ou public)
3. Glissez vos fichiers dans le dépôt via l'interface web GitHub
4. Sur Netlify : « Add new site » → « Import an existing project » → GitHub → sélectionnez votre dépôt
5. Chaque fois que vous modifiez un fichier sur GitHub, le site se met à jour automatiquement

---

## Ajouter un nom de domaine (ex. maisonmatiere.fr)

1. Achetez votre domaine chez OVH, Gandi ou Infomaniak (~10–15 €/an)
2. Sur Netlify : Site settings → Domain management → Add custom domain
3. Suivez les instructions pour pointer votre domaine vers Netlify (modification DNS chez votre registrar)
4. Le certificat HTTPS est activé automatiquement et gratuitement par Netlify

---

## Ajouter une photo dans la galerie

1. Copiez votre photo dans le dossier `images/` (ex. `images/sejour-beton-cire.jpg`)
2. Ouvrez `realisations.html`
3. Trouvez la ligne du bon emplacement, par exemple :
   ```html
   <div class="shot m2" data-img=""><span class="ph">Photo à venir</span><span class="cap">Séjour — béton ciré</span></div>
   ```
4. Remplissez `data-img` avec le chemin de votre photo :
   ```html
   <div class="shot m2" data-img="images/sejour-beton-cire.jpg" style="background:url('images/sejour-beton-cire.jpg') center/cover">
   ```
5. Supprimez `<span class="ph">Photo à venir</span>` une fois la vraie photo en place
6. Re-déposez le dossier sur Netlify pour mettre à jour le site
