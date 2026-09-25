import "./globals.css";
import AppShell from './app-shell';
export const metadata={title:"Mefire Premium CRM",description:"CRM WhatsApp et automatisation clients"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="fr"><body><AppShell>{children}</AppShell></body></html>}
