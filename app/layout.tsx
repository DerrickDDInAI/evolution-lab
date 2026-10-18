import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Pursuit Lab',description:'Survive against evolving bots in a shared multiplayer arena.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
