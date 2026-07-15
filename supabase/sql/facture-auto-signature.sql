-- Facture générée automatiquement quand un devis est signé en ligne.
-- Remplace la fonction on_signature() : au moment de la signature, le devis passe
-- en « accepté » ET une facture est créée automatiquement (numéro réservé, même montant).
-- Échéance laissée vide pour ne PAS déclencher de relance prématurée : tu la fixes
-- quand tu envoies réellement la facture (fin de chantier).

create or replace function on_signature() returns trigger
language plpgsql security definer as $$
declare
  d           documents%rowtype;
  an          int := extract(year from now());
  num         int;
  facnum      text;
begin
  -- 1) Le devis passe en « accepté » et on récupère ses infos
  update documents
     set statut = 'accepte', date_signature = now(), signataire = new.signataire
   where id = new.document_id
   returning * into d;

  -- 2) Si c'était bien un devis → on crée la facture
  if d.type = 'devis' then
    -- Numéro de facture (compteur annuel), verrou pour éviter les doublons
    select dernier into num from compteurs where type = 'facture' for update;
    if not found then
      insert into compteurs(type, annee, dernier) values ('facture', an, 1);
      num := 1;
    else
      update compteurs
         set dernier = case when annee = an then dernier + 1 else 1 end,
             annee   = an
       where type = 'facture'
       returning dernier into num;
    end if;
    facnum := 'FAC-' || an || '-' || lpad(num::text, 4, '0');

    -- On ne recrée pas de facture si une existe déjà pour ce chantier avec ce montant
    if not exists (
      select 1 from documents
       where chantier_id = d.chantier_id and type = 'facture' and coalesce(montant,0) = coalesce(d.montant,0)
    ) then
      insert into documents (chantier_id, type, nom, montant, statut, date_echeance, fichier_url)
      values (d.chantier_id, 'facture', facnum, d.montant, 'en-attente', null, null);
    end if;
  end if;

  return new;
end $$;
