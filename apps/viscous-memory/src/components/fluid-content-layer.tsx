import { CONTENT } from '@/config';
import { useParamsStore } from '@/store';

export default function FluidContentLayer() {
  const reveal = useParamsStore((s) => s.fluidState.revealLevel);
  const blurPx = useParamsStore((s) => s.fluidState.blurPx);
  const opacity = Math.min(0.95, 0.14 + reveal * 0.95);
  const titleOpacity = Math.min(1, 0.18 + reveal * 1.6);
  const leadOpacity = Math.min(0.9, 0.06 + reveal * 1.15);
  const linkOpacity = Math.min(0.86, 0.08 + reveal * 0.95);

  return (
    <section
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 2,
        pointerEvents: 'none',
        color: 'rgba(214, 226, 240, 0.94)',
        padding: '8vh 8vw',
        display: 'grid',
        gridTemplateRows: '1fr auto',
        backdropFilter: `blur(${blurPx.toFixed(2)}px)`,
        WebkitBackdropFilter: `blur(${blurPx.toFixed(2)}px)`,
      }}
    >
      <div style={{ alignSelf: 'center', maxWidth: 760 }}>
        <h1
          style={{
            margin: 0,
            letterSpacing: '0.08em',
            fontSize: 'clamp(2.2rem, 6.5vw, 6rem)',
            lineHeight: 0.96,
            fontWeight: 300,
            opacity: titleOpacity,
            textTransform: 'uppercase',
            textShadow: '0 0 24px rgba(160, 180, 210, 0.16)',
          }}
        >
          {CONTENT.title}
        </h1>
        <p
          style={{
            marginTop: '1.2rem',
            maxWidth: 560,
            fontSize: 'clamp(0.95rem, 1.35vw, 1.2rem)',
            lineHeight: 1.6,
            letterSpacing: '0.02em',
            opacity: leadOpacity,
          }}
        >
          {CONTENT.lead}
        </p>
      </div>

      <nav
        style={{
          display: 'flex',
          gap: '1.4rem',
          fontSize: '0.88rem',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          opacity: linkOpacity,
        }}
        aria-label="Atmospheric navigation"
      >
        {CONTENT.links.map((link) => (
          <span key={link}>{link}</span>
        ))}
      </nav>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity,
          background:
            'radial-gradient(130% 100% at 50% 30%, rgba(136,161,194,0.07), rgba(11,14,20,0.15) 45%, rgba(5,6,10,0.35) 78%, rgba(2,2,4,0.55) 100%)',
        }}
      />
    </section>
  );
}
