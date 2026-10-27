import type { Metadata } from 'next';
import './globals.css';
const title='Immunity | EvoGoo';
const description='An EvoGoo evolution experiment. Tread lightly in a living alien world and survive evolving sentinels in a shared multiplayer arena.';
export const metadata:Metadata={
  metadataBase:new URL('https://evogoo.com'),
  title,description,applicationName:'EvoGoo',
  alternates:{canonical:'/'},
  icons:{icon:{url:'/evogoo.svg',type:'image/svg+xml'}},
  openGraph:{title,description,siteName:'EvoGoo',url:'/',type:'website',images:[{url:'/immunity/nursery-menu.webp',alt:'Immunity: a living evolution experiment on EvoGoo'}]},
  twitter:{card:'summary_large_image',title,description,images:['/immunity/nursery-menu.webp']},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
