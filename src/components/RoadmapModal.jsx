const ROADMAP = [
  {
    id: "backend",
    icon: "🔄",
    title: "Backend / database",
    status: "todo",
    description:
      "Real-time sync zodat alle gezinsleden elkaars maaltijdkeuzes zien vanaf hun eigen telefoon.",
    detail:
      "Aanbevolen stack: Node.js + Supabase of Firebase Realtime Database. Momenteel slaat de app alles lokaal op via localStorage — dit werkt alleen per apparaat.",
  },
  {
    id: "picnic",
    icon: "🛵",
    title: "Picnic integratie",
    status: "todo",
    description:
      "Boodschappenlijst rechtstreeks in het Picnic winkelmandje zetten via de inofficiële Picnic API.",
    detail:
      "API: github.com/MRVDH/picnic-api — vereist een backend om Picnic-inloggegevens veilig te beheren (nooit client-side opslaan). De 'Stuur naar Picnic' knop staat al in de UI klaar.",
    link: "https://github.com/MRVDH/picnic-api",
    linkLabel: "picnic-api op GitHub",
  },
  {
    id: "accounts",
    icon: "👤",
    title: "Gebruikersaccounts",
    status: "todo",
    description:
      "Elk gezinslid logt in met hun naam (Papa, Mama, Inga, Kevin) zodat keuzes aan een persoon gekoppeld zijn.",
    detail:
      "Vereist de backend uit punt 1. Simpele auth is voldoende — bijv. Supabase Auth met magic link of een PIN per persoon.",
  },
  {
    id: "push",
    icon: "🔔",
    title: "Push notificaties",
    status: "todo",
    description:
      "Stuur een melding als het tijd is om de maaltijden voor de week te kiezen.",
    detail:
      "Web Push API werkt al in de browser (de app is een PWA). Vereist een backend voor het opslaan van push subscriptions en het versturen via VAPID. Bijv. elke maandag een herinnering sturen.",
  },
  {
    id: "instructions",
    icon: "📋",
    title: "Receptinstructies",
    status: "todo",
    description:
      "Volledige bereidingswijze toevoegen aan elk receptkaartje — momenteel staan alleen ingrediënten opgeslagen.",
    detail:
      "Datamodel is al klaar om uit te breiden: voeg een `instructions: string[]` veld toe aan elk recept in recipes.js. UI: toon stap-voor-stap in een uitklapbaar gedeelte onder de ingrediëntenlijst.",
  },
  {
    id: "photos",
    icon: "📸",
    title: "Receptfoto's",
    status: "todo",
    description: "Foto's toevoegen aan receptkaartjes voor een visueel aantrekkelijkere bibliotheek.",
    detail:
      "Opties: (1) Marley Spoon afbeeldings-URLs overnemen, (2) upload naar Supabase Storage of Cloudinary, (3) link naar externe afbeelding per recept. Voeg een `imageUrl` veld toe aan het receptobject.",
  },
  {
    id: "custom-recipes",
    icon: "✍️",
    title: "Eigen recepten toevoegen",
    status: "todo",
    description:
      "Gezinsleden kunnen zelf recepten toevoegen, los van de Marley Spoon kaartjes.",
    detail:
      "Een 'Voeg recept toe' formulier in de Receptenbibliotheek met velden voor naam, emoji, tags, bereidingstijd en ingrediënten. Opslaan in localStorage (al beschikbaar) of backend zodra die er is.",
  },
];

import { useLanguage } from "../LanguageContext";

const STATUS_KEY = { todo: "statusTodo", inprogress: "statusInProgress", done: "statusDone" };
const STATUS_COLOR = { todo: "#e0e0e0", inprogress: "#fff3cd", done: "#d4edda" };
const STATUS_TEXT  = { todo: "#555",    inprogress: "#856404",  done: "#155724" };

export default function RoadmapModal({ onClose }) {
  const { t } = useLanguage();
  return (
    <div className="roadmap-overlay" onClick={onClose}>
      <div className="roadmap-modal" onClick={(e) => e.stopPropagation()}>
        <div className="roadmap-header">
          <div>
            <h2>{t("roadmapTitle")}</h2>
            <p className="roadmap-subtitle">{t("roadmapSubtitle")}</p>
          </div>
          <button className="roadmap-close" onClick={onClose}>×</button>
        </div>

        <div className="roadmap-list">
          {ROADMAP.map((item, i) => (
            <div key={item.id} className="roadmap-item">
              <div className="roadmap-item-left">
                <span className="roadmap-number">{i + 1}</span>
              </div>
              <div className="roadmap-item-body">
                <div className="roadmap-item-top">
                  <span className="roadmap-icon">{item.icon}</span>
                  <h3 className="roadmap-title">{item.title}</h3>
                  <span
                    className="roadmap-status"
                    style={{ background: STATUS_COLOR[item.status], color: STATUS_TEXT[item.status] }}
                  >
                    {t(STATUS_KEY[item.status])}
                  </span>
                </div>
                <p className="roadmap-desc">{item.description}</p>
                <p className="roadmap-detail">{item.detail}</p>
                {item.link && (
                  <a
                    className="roadmap-link"
                    href={item.link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                  >
                    🔗 {item.linkLabel}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="roadmap-footer">
          <span>{t("roadmapFooter")}</span>
        </div>
      </div>
    </div>
  );
}
