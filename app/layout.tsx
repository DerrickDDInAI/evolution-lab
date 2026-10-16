import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Pursuit Lab · Humans play. Bots learn.',description:'A shared 6,000 × 6,000 arena. Dodge an evolving population of AI bots and teach them to chase.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
