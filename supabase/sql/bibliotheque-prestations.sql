-- Bibliothèque de prestations : vos lignes de devis types (désignation, unité, prix)
-- à insérer en 1 clic dans un devis. Réservée à l'admin connecté.

create table if not exists prestations (
  id uuid primary key default gen_random_uuid(),
  designation text not null,
  detail text,
  unite text default 'm²',
  prix numeric,
  created_at timestamptz default now()
);

alter table prestations enable row level security;

create policy "prestations admin lecture" on prestations
  for select to authenticated using (true);
create policy "prestations admin gestion" on prestations
  for all to authenticated using (true) with check (true);

-- Quelques prestations de départ (modifiables/supprimables depuis le devis)
insert into prestations (designation, detail, unite, prix) values
  ('Cloison placo BA13 sur ossature', 'Fourniture et pose, bandes et enduit de finition', 'm²', 48),
  ('Doublage isolant thermique', 'Laine de roche + BA13, pose collée ou sur ossature', 'm²', 52),
  ('Enduit décoratif à la chaux', 'Application 2 couches, finition ferrée', 'm²', 65),
  ('Béton ciré sol ou plan de travail', 'Préparation support, application, protection', 'm²', 120),
  ('Peinture murs et plafonds', 'Préparation, 2 couches de finition', 'm²', 28),
  ('Plafond décaissé avec gorge LED', 'Structure, plaques, bandes, hors éclairage', 'ml', 85),
  ('Protection et nettoyage de fin de chantier', 'Bâchage, dépoussiérage, évacuation des déchets', 'forfait', 150);
