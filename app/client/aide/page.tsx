'use client'

import { useState, type ReactNode } from 'react'
import { motion } from 'framer-motion'
import {
  Share2, Bell, Settings, CheckCircle2, AlertTriangle,
  HelpCircle, Smartphone, ChevronDown, MoreVertical, Home,
} from 'lucide-react'
import NotificationActivateButton from '@/components/NotificationActivateButton'

type Plateforme = 'ios' | 'android'

export default function AidePage() {
  const [platform, setPlatform] = useState<Plateforme>('ios')
  const [openFaq, setOpenFaq] = useState<number | null>(null)

  return (
    <div className="space-y-6 max-w-3xl">
      {/* En-tête */}
      <div>
        <h1 className="text-2xl font-semibold flex items-center gap-2" style={{ color: '#F5F5F5' }}>
          <HelpCircle size={22} style={{ color: '#D4AF37' }} />
          Aide & Installation
        </h1>
        <p className="text-sm mt-1" style={{ color: '#707070' }}>
          Installez l'application sur votre téléphone et activez les notifications pour ne manquer aucune alerte.
        </p>
      </div>

      {/* Pourquoi installer */}
      <div className="card-premium p-5">
        <h2 className="text-sm font-semibold mb-3" style={{ color: '#D4AF37' }}>Pourquoi installer l'application ?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
              <Smartphone size={15} />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: '#F5F5F5' }}>Accès direct</div>
              <div className="text-xs mt-0.5" style={{ color: '#707070' }}>
                Une icône sur votre écran d'accueil, comme une vraie application — plus besoin de retaper l'adresse.
              </div>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(212,175,55,0.1)', color: '#D4AF37' }}>
              <Bell size={15} />
            </div>
            <div>
              <div className="text-sm font-medium" style={{ color: '#F5F5F5' }}>Notifications en temps réel</div>
              <div className="text-xs mt-0.5" style={{ color: '#707070' }}>
                Alertes de stop/objectif, réponses au forum : reçues même l'application fermée.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sélecteur plateforme */}
      <div className="flex gap-2">
        <button onClick={() => setPlatform('ios')}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: platform === 'ios' ? 'rgba(212,175,55,0.12)' : 'var(--noir-elevated)',
            color:      platform === 'ios' ? '#D4AF37' : '#707070',
            border:     `1px solid ${platform === 'ios' ? 'rgba(212,175,55,0.3)' : 'var(--noir-border)'}`,
          }}>
          iPhone (Safari)
        </button>
        <button onClick={() => setPlatform('android')}
          className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors"
          style={{
            background: platform === 'android' ? 'rgba(212,175,55,0.12)' : 'var(--noir-elevated)',
            color:      platform === 'android' ? '#D4AF37' : '#707070',
            border:     `1px solid ${platform === 'android' ? 'rgba(212,175,55,0.3)' : 'var(--noir-border)'}`,
          }}>
          Android (Chrome)
        </button>
      </div>

      {/* Étapes d'installation */}
      <div className="card-premium p-5">
        <h2 className="text-sm font-semibold mb-4" style={{ color: '#F5F5F5' }}>
          Installer l'application {platform === 'ios' ? 'sur iPhone' : 'sur Android'}
        </h2>

        {platform === 'ios' ? (
          <ol className="space-y-4">
            <Etape n={1} icon={<Share2 size={15} />}>
              Ouvrez l'application dans <strong>Safari</strong> (pas Chrome — l'installation ne fonctionne que
              depuis Safari sur iPhone), puis appuyez sur l'icône <strong>Partager</strong> en bas de l'écran.
            </Etape>
            <Etape n={2} icon={<Home size={15} />}>
              Faites défiler les options et appuyez sur <strong>« Sur l'écran d'accueil »</strong>.
            </Etape>
            <Etape n={3} icon={<CheckCircle2 size={15} />}>
              Appuyez sur <strong>« Ajouter »</strong> en haut à droite. Une icône Elinoja Patrimoine apparaît sur
              votre écran d'accueil.
            </Etape>
            <Etape n={4} icon={<Smartphone size={15} />}>
              <strong>Important :</strong> ouvrez toujours l'application depuis cette icône, et non depuis Safari —
              c'est ce qui permet aux notifications de fonctionner sur iPhone.
            </Etape>
          </ol>
        ) : (
          <ol className="space-y-4">
            <Etape n={1} icon={<MoreVertical size={15} />}>
              Ouvrez l'application dans <strong>Chrome</strong>, puis appuyez sur le menu <strong>⋮</strong>
              (trois points) en haut à droite.
            </Etape>
            <Etape n={2} icon={<Home size={15} />}>
              Appuyez sur <strong>« Installer l'application »</strong> (ou <strong>« Ajouter à l'écran d'accueil »</strong> selon
              la version de Chrome).
            </Etape>
            <Etape n={3} icon={<CheckCircle2 size={15} />}>
              Confirmez en appuyant sur <strong>« Installer »</strong>. Une icône Elinoja Patrimoine apparaît sur
              votre écran d'accueil ou dans votre tiroir d'applications.
            </Etape>
          </ol>
        )}
      </div>

      {/* Activer les notifications */}
      <div className="card-premium p-5">
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-2" style={{ color: '#F5F5F5' }}>
          <Bell size={15} style={{ color: '#D4AF37' }} />
          Activer les notifications
        </h2>
        <p className="text-xs mb-4" style={{ color: '#707070' }}>
          Une fois l'application installée et ouverte depuis son icône, activez les notifications pour recevoir vos
          alertes de trading et vos réponses de forum en temps réel.
        </p>
        <ol className="space-y-3 mb-4">
          <Etape n={1} icon={<Bell size={15} />}>
            Sur la page d'accueil de l'application, appuyez sur le bouton <strong>« Activer les notifications »</strong>.
          </Etape>
          <Etape n={2} icon={<CheckCircle2 size={15} />}>
            Votre téléphone affiche une demande d'autorisation — appuyez sur <strong>« Autoriser »</strong>
            (ou <strong>« Allow »</strong>).
          </Etape>
        </ol>
        <div className="pt-3 border-t" style={{ borderColor: 'var(--noir-border)' }}>
          <div className="text-xs font-medium mb-2" style={{ color: '#5C5C5C' }}>Essayer maintenant :</div>
          <NotificationActivateButton />
        </div>
      </div>

      {/* FAQ / dépannage */}
      <div className="card-premium overflow-hidden">
        <div className="p-5 pb-3">
          <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: '#F5F5F5' }}>
            <AlertTriangle size={15} style={{ color: '#FF9800' }} />
            Ça ne fonctionne pas ?
          </h2>
        </div>
        <div className="divide-y" style={{ borderColor: 'var(--noir-border)' }}>
          {FAQS.map((f, i) => (
            <div key={i}>
              <button onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left">
                <span className="text-sm" style={{ color: '#C0C0C0' }}>{f.q}</span>
                <ChevronDown size={15}
                  style={{
                    color: '#5C5C5C', flexShrink: 0,
                    transform: openFaq === i ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s',
                  }} />
              </button>
              {openFaq === i && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
                  className="px-5 pb-4 text-xs leading-relaxed" style={{ color: '#707070' }}>
                  {f.a}
                </motion.div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function Etape({ n, icon, children }: { n: number; icon: ReactNode; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
        style={{ background: 'rgba(212,175,55,0.12)', color: '#D4AF37', border: '1px solid rgba(212,175,55,0.25)' }}>
        {n}
      </div>
      <div className="flex-1 min-w-0 pt-0.5">
        <span className="text-xs leading-relaxed" style={{ color: '#A0A0A0' }}>{children}</span>
      </div>
      <div className="flex-shrink-0 pt-0.5" style={{ color: '#5C5C5C' }}>{icon}</div>
    </li>
  )
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "J'ai autorisé les notifications mais je ne reçois rien",
    a: "Vérifiez que vous avez bien ouvert l'application depuis l'icône sur votre écran d'accueil (et non depuis Safari/Chrome directement) — sur iPhone en particulier, les notifications ne fonctionnent que dans ce mode. Vérifiez aussi que le bouton affiche bien « Notifications activées » dans la carte de bienvenue.",
  },
  {
    q: "Le bouton d'activation n'apparaît plus après avoir autorisé",
    a: "C'est normal : une fois activées, le bouton se transforme en confirmation « Notifications activées ». Si vous voulez les désactiver, faites-le depuis les réglages de notifications de votre téléphone (voir ci-dessous).",
  },
  {
    q: "J'ai refusé la permission par erreur, comment revenir en arrière ?",
    a: "Sur iPhone : Réglages → faites défiler jusqu'à trouver l'icône de l'application dans la liste → Notifications → activez « Autoriser les notifications ». Sur Android : Réglages → Applications → l'application → Notifications → activez. Rouvrez ensuite l'application et réessayez le bouton d'activation.",
  },
  {
    q: "L'icône « Sur l'écran d'accueil » n'apparaît pas dans Safari",
    a: "Assurez-vous d'utiliser Safari (pas une autre navigateur comme Chrome, Firefox ou une appli intégrée) — sur iPhone, seul Safari propose cette option. L'icône Partager se trouve en bas de l'écran (un carré avec une flèche vers le haut).",
  },
  {
    q: "J'ai désinstallé puis réinstallé l'application, dois-je tout refaire ?",
    a: "Oui — une réinstallation crée un nouvel abonnement aux notifications. Reprenez simplement l'étape « Activer les notifications » ci-dessus une fois l'application réinstallée.",
  },
]
