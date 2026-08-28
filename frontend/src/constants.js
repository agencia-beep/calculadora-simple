export const WEBSITE_STATUS_LABELS = {
  sin_website: "Sin website",
  tiene_website: "Tiene website",
  solo_red_social: "Solo redes sociales",
  website_deficiente: "Website deficiente",
  no_prospecto: "No prospecto",
};

export const WEBSITE_STATUS_BADGE = {
  sin_website: "badge-danger",
  tiene_website: "badge-success",
  solo_red_social: "badge-warning",
  website_deficiente: "badge-warning",
  no_prospecto: "badge-muted",
};

export const PRIORITY_BADGE = {
  Alta: "badge-danger",
  Media: "badge-warning",
  Baja: "badge-muted",
};

export const CONTACT_STATUS_OPTIONS = [
  "No contactado",
  "Por llamar",
  "Contactado",
  "Reunion agendada",
  "Cerrado",
  "Descartado",
];

export function scoreColor(score) {
  if (score >= 70) return "#b91c1c";
  if (score >= 40) return "#b45309";
  return "#6b7280";
}
