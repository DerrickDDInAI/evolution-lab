'use client';
import {useId} from 'react';

/** Decorative membranes stay separate from live labels and never intercept input. */
export function TidalShell({lens=false}:{lens?:boolean}){
  const id=useId();
  return <svg className="tidal-shell" viewBox="0 0 400 220" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id={id} x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff1ce"/><stop offset=".22" stopColor="#9bd1cf" stopOpacity=".35"/><stop offset=".52" stopColor="#f3d398"/><stop offset=".76" stopColor="#d2efdf" stopOpacity=".3"/><stop offset="1" stopColor="#ffdb9f"/></linearGradient></defs>
    <path fill="#bfe8dd18" d="M5 8C24 79 60 46 18 157C36 69 17 39 5 8ZM393 217C350 189 365 166 388 152C369 181 385 201 393 217Z"/>
    <g fill="none" stroke={`url(#${id})`} vectorEffect="non-scaling-stroke">
      <path strokeWidth="1.5" d={lens?"M4 113C-6 46 78 15 180 18S349 35 392 99C419 153 335 198 226 200S23 201 4 113Z":"M37 16C105-7 241 24 332 13C388 4 397 42 386 97C378 140 404 194 355 207C276 229 153 195 64 211C10 220 1 175 13 121C24 76-7 32 37 16Z"}/>
      <path className="shell-outer" opacity={lens?".25":".65"} d="M14 71C-4 24 67 8 127 16S316 35 377 9C348 40 386 87 391 111M7 209C48 163 102 219 205 210S340 183 395 213C366 177 394 150 384 119"/>
      <path opacity=".4" d="M5 8C24 79 60 46 18 157M395 2C352 55 404 87 379 161M2 220C63 184 33 154 18 128M393 217C350 189 365 166 388 152"/>
    </g>
    <g fill="#fff1c9"><ellipse cx="16" cy="52" rx="3" ry="2"/><ellipse cx="382" cy="179" rx="3" ry="2"/></g>
  </svg>;
}

export function TidalPeriphery(){
  return <svg className="tidal-periphery" viewBox="0 0 1600 900" preserveAspectRatio="none" aria-hidden="true">
    <g fill="none" stroke="#ffe0a5" strokeWidth="1" opacity=".65">
      <path d="M0 128C14 54 92 0 291 13L420 0M0 39Q40 21 27 0M2 3Q60 71 0 190M1600 126C1586 54 1508 0 1309 13L1180 0M1600 39Q1560 21 1573 0M1598 3Q1540 71 1600 190"/>
      <path d="M0 665C24 743 36 817 145 857S419 864 635 856M0 707Q29 765 1 882M0 895Q98 829 233 899M1600 665C1576 743 1564 817 1455 857S1181 864 965 856M1600 707Q1571 765 1599 882M1600 895Q1502 829 1367 899"/>
      <path opacity=".3" d="M1 639Q35 778 140 825T620 889M1599 639Q1565 778 1460 825T980 889"/>
    </g>
    <g fill="#fff0ce" className="tidal-nodes"><circle cx="22" cy="92" r="3"/><circle cx="1578" cy="92" r="3"/><circle cx="36" cy="789" r="4"/><circle cx="1564" cy="789" r="4"/><circle cx="357" cy="866" r="2"/><circle cx="1243" cy="866" r="2"/></g>
  </svg>;
}
