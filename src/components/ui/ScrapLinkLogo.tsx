import React from 'react';

export const ScrapLinkLogo: React.FC<{ dark?: boolean }> = ({ dark = false }) => (
  <div className={`scraplink-brand flex items-center gap-2.5 ${dark ? 'scraplink-brand-dark' : ''}`}>
    <svg aria-hidden="true" className="scraplink-mark h-9 w-9 shrink-0" viewBox="0 0 36 36" fill="none">
      <path d="M18 3.5 30.6 10.8v14.4L18 32.5 5.4 25.2V10.8L18 3.5Z" fill={dark ? '#E9EFE9' : '#173D35'} />
      <path d="M11.5 14.1 18 10.35l6.5 3.75v7.8L18 25.65l-6.5-3.75v-7.8Z" stroke={dark ? '#173D35' : '#F5F4EE'} strokeWidth="2.4" />
      <path d="m12.3 22.15 5.7-3.3 5.7 3.3M18 10.7v8" stroke={dark ? '#173D35' : '#F5F4EE'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span className={`scraplink-wordmark text-lg font-semibold tracking-[-0.05em] ${dark ? 'text-[#f5f4ee]' : 'text-[#173d35]'}`}>Scrap<span className={dark ? 'text-[#c8d9b8]' : 'text-[#5b7c67]'}>Link</span></span>
  </div>
);
