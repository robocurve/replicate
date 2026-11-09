import React from 'react';

/**
 * Robocurve Wordmark — the ascending-step mark plus the "Robocurve" logotype.
 * Theme `dark` for use on ink surfaces. Set `showText={false}` for the mark alone.
 */
export function Wordmark({ size = 28, showText = true, theme = 'light', style = {}, ...rest }) {
  const markFillColor = theme === 'dark' ? 'var(--ember-400)' : 'var(--accent)';
  const text = theme === 'dark' ? 'var(--neutral-50)' : 'var(--neutral-900)';
  const markHeight = Math.round(size * 0.9);
  const markWidth = Math.round(markHeight * (25.8275 / 17.7711));

  return (
    <span
      style={{ display: 'inline-flex', alignItems: 'center', gap: `${Math.round(size * 0.34)}px`, ...style }}
      {...rest}
    >
      <svg width={markWidth} height={markHeight} viewBox="0 0 25.8275 17.7711" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
        <path d="M2.8637 17.6708C2.75946 17.7363 2.63886 17.7711 2.51576 17.7711H0.654758C-0.0872439 17.7711 -0.256079 16.7311 0.447813 16.4964L4.41533 15.1732C5.14934 14.9285 5.62543 15.9362 4.97022 16.3477L2.8637 17.6708Z" fill={markFillColor} />
        <path d="M8.22348 17.5627C8.09974 17.6956 7.92631 17.7711 7.74472 17.7711H6.02003C5.36476 17.7711 5.11651 16.9146 5.67019 16.5642L9.8692 13.9065C10.5171 13.4964 11.2203 14.3437 10.6978 14.905L8.22348 17.5627Z" fill={markFillColor} />
        <path d="M13.2431 17.4635C13.1236 17.6548 12.9139 17.7711 12.6883 17.7711H10.3249C9.75391 17.7711 9.45703 17.0906 9.84542 16.672L17.0792 8.87529C17.6187 8.29383 18.5337 8.99405 18.1135 9.66677L13.2431 17.4635Z" fill={markFillColor} />
        <path d="M23.4108 17.2116C23.3638 17.5329 23.0883 17.7711 22.7636 17.7711H14.9348C14.4217 17.7711 14.1083 17.2072 14.3793 16.7714L24.6169 0.310882C24.9914 -0.291253 25.9223 0.0494504 25.8197 0.751072L23.4108 17.2116Z" fill={markFillColor} />
      </svg>
      {showText && (
        <span
          /* The comp's logotype (Figma text 2103:5605) is Imagin Bold at
             18.34px with -1.28px tracking on a 26px line, 88px wide; at size
             22 that is 18.35px / -0.06em (Figma tracks the 'ur' pair looser). */
          style={{
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            fontSize: `${(size * 0.834).toFixed(2)}px`,
            letterSpacing: '-0.06em',
            color: text,
            lineHeight: `${Math.round(size * 1.18)}px`,
          }}
        >
          Robocurve
        </span>
      )}
    </span>
  );
}
