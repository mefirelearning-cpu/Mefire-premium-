import './globals.css';
import './modern.css';
import AppShell from './app-shell';
export const metadata={title:'Mefire Premium — Gestion des abonnements',description:'Votre espace professionnel pour les clients, abonnements et Jarvis'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body><AppShell>{children}</AppShell></body></html>;}
