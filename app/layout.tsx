import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'Glass Tide · Pursuit Lab',description:'Tread lightly in a living alien world. Survive evolving sentinels in a shared multiplayer arena.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
