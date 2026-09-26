'use client';

import { t, type Lang } from '@/lib/i18n';

interface NextBestAction {
  title: string;
  meta: string;
}

interface NextBestActionsProps {
  lang: Lang;
  items: NextBestAction[];
}

export default function NextBestActions({ lang, items }: NextBestActionsProps) {
  return (
    <article className="card next">
      <h2>{t(lang, 'nextTitle')}</h2>
      <p className="next-sub">{t(lang, 'nextSubtitle')}</p>
      {items.map((item, index) => (
        <div key={`${item.title}-${index}`} className="next-item">
          <i className="next-dot" aria-hidden="true" />
          <div>
            <strong>{item.title}</strong>
            <span>{item.meta}</span>
          </div>
        </div>
      ))}
    </article>
  );
}
