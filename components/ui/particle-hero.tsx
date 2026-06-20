"use client"

import { useEffect, useRef } from "react"
import { formatDualEurText } from "@/lib/salon-currency"
import Link from "next/link"
import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation"

interface Particle {
  x: number
  y: number
  speed: number
  opacity: number
  fadeDelay: number
  fadeStart: number
  fadingOut: boolean
  reset: () => void
  update: () => void
  draw: (ctx: CanvasRenderingContext2D) => void
}

const CSS = `
  @keyframes ph-spotlight {
    0%   { transform: rotateZ(0deg) scale(1);   filter: blur(15px) opacity(0.45); }
    20%  { transform: rotateZ(-1deg) scale(1.2); filter: blur(16px) opacity(0.55); }
    40%  { transform: rotateZ(2deg) scale(1.3);  filter: blur(14px) opacity(0.38); }
    60%  { transform: rotateZ(-2deg) scale(1.2); filter: blur(15px) opacity(0.55); }
    80%  { transform: rotateZ(1deg) scale(1.1);  filter: blur(13px) opacity(0.38); }
    100% { transform: rotateZ(0deg) scale(1);   filter: blur(15px) opacity(0.45); }
  }
  @keyframes ph-loadrot {
    0%   { transform: rotate(0deg) scale(0); }
    100% { transform: scale(1); }
  }
  @keyframes ph-accentload {
    0%   { opacity: 0; transform: scale(0); }
    100% { opacity: 1; transform: scale(1); }
  }
  @keyframes ph-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.35; }
  }
  @media (prefers-reduced-motion: reduce) {
    .ph-canvas { display: none; }
    .ph-spotlight-beam { display: none; }
    .ph-accent-line { animation: none !important; opacity: 0.12 !important; transform: none !important; }
  }
`

export function ParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>()

  const createParticle = (canvas: HTMLCanvasElement): Particle => {
    const particle: Particle = {
      x: 0, y: 0, speed: 0, opacity: 1,
      fadeDelay: 0, fadeStart: 0, fadingOut: false,
      reset() {
        this.x = Math.random() * canvas.width
        this.y = Math.random() * canvas.height
        this.speed = Math.random() / 5 + 0.1
        this.opacity = 1
        this.fadeDelay = Math.random() * 600 + 100
        this.fadeStart = Date.now() + this.fadeDelay
        this.fadingOut = false
      },
      update() {
        this.y -= this.speed
        if (this.y < 0) this.reset()
        if (!this.fadingOut && Date.now() > this.fadeStart) this.fadingOut = true
        if (this.fadingOut) {
          this.opacity -= 0.008
          if (this.opacity <= 0) this.reset()
        }
      },
      draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = `rgba(${255 - (Math.random() * 255) / 2}, 255, 255, ${this.opacity})`
        ctx.fillRect(this.x, this.y, 0.4, Math.random() * 2 + 1)
      },
    }
    particle.reset()
    particle.y = Math.random() * canvas.height
    particle.fadeDelay = Math.random() * 600 + 100
    particle.fadeStart = Date.now() + particle.fadeDelay
    return particle
  }

  const initParticles = (canvas: HTMLCanvasElement) => {
    const count = Math.floor((canvas.width * canvas.height) / 6000)
    particlesRef.current = Array.from({ length: count }, () => createParticle(canvas))
  }

  const animate = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    particlesRef.current.forEach(p => { p.update(); p.draw(ctx) })
    animationRef.current = requestAnimationFrame(() => animate(canvas, ctx))
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let cancelled = false
    const start = () => {
      if (cancelled) return
      canvas.width = window.innerWidth
      canvas.height = canvas.parentElement?.clientHeight ?? 700
      initParticles(canvas)
      animate(canvas, ctx)
    }

    const idle = typeof requestIdleCallback === "function"
      ? requestIdleCallback(start)
      : setTimeout(start, 200) as unknown as number

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = canvas.parentElement?.clientHeight ?? 700
      initParticles(canvas)
    }
    window.addEventListener("resize", handleResize)
    return () => {
      cancelled = true
      if (typeof cancelIdleCallback === "function") cancelIdleCallback(idle)
      else clearTimeout(idle)
      window.removeEventListener("resize", handleResize)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const spotlightAnims = [
    "ph-loadrot 2s ease-in-out forwards, ph-spotlight 17s ease-in-out infinite",
    "ph-loadrot 2s ease-in-out forwards, ph-spotlight 14s ease-in-out infinite",
    "ph-loadrot 2s ease-in-out forwards, ph-spotlight 21s ease-in-out infinite reverse",
  ]
  const spotlightRotations = ["rotate(20deg)", "rotate(-20deg)", "rotate(0deg)"]

  return (
    <section
      aria-label="Hero"
      style={{
        position: "relative",
        width: "100%",
        minHeight: "100svh",
        overflow: "hidden",
        backgroundColor: "rgb(5, 6, 15)",
      }}
    >
      {/* Scoped styles */}
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Gradient animation background */}
      <BackgroundGradientAnimation
        gradientBackgroundStart="rgb(5, 6, 15)"
        gradientBackgroundEnd="rgb(8, 12, 40)"
        firstColor="60, 90, 180"
        secondColor="124, 58, 237"
        thirdColor="100, 160, 255"
        fourthColor="80, 40, 160"
        fifthColor="50, 80, 200"
        pointerColor="120, 100, 240"
        size="90%"
        blendingValue="hard-light"
        interactive={true}
        containerClassName="!absolute !inset-0 !w-full !h-full"
      />

      {/* Particles canvas */}
      <canvas
        ref={canvasRef}
        className="ph-canvas"
        aria-hidden="true"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          pointerEvents: "none", zIndex: 3,
        }}
      />

      {/* Spotlight beams */}
      <div
        aria-hidden="true"
        style={{
          pointerEvents: "none",
          position: "absolute", inset: 0,
          overflow: "hidden", zIndex: 4,
        }}
      >
        {spotlightAnims.map((anim, i) => (
          <div
            key={i}
            className="ph-spotlight-beam"
            style={{
              position: "absolute",
              left: 0, right: 0, top: "3em",
              margin: "0 auto",
              width: "30em",
              height: "max(42em, 86vh)",
              borderRadius: "0 0 50% 50%",
              backgroundImage:
                "conic-gradient(from 0deg at 50% -5%, transparent 45%, rgba(124,145,182,.25) 49%, rgba(124,145,182,.45) 50%, rgba(124,145,182,.25) 51%, transparent 55%)",
              transformOrigin: "50% 0",
              filter: "blur(15px) opacity(0.45)",
              transform: spotlightRotations[i],
              animation: anim,
            }}
          />
        ))}
      </div>

      {/* Accent grid lines */}
      <div
        aria-hidden="true"
        style={{
          pointerEvents: "none", position: "absolute",
          inset: 0, zIndex: 4, overflow: "hidden",
        }}
      >
        {/* Horizontal */}
        {[18, 28, 38, 52, 62].map((pct, i) => (
          <div
            key={`h-${i}`}
            className="ph-accent-line"
            style={{
              position: "absolute",
              top: `${pct}%`, left: 0, right: 0,
              height: "1px",
              background: "linear-gradient(90deg, transparent, rgba(186,214,247,.14), transparent)",
              opacity: 0, transform: "scaleX(0)",
              animation: `ph-accentload 1.8s ease-out ${2 + i * 0.12}s forwards`,
            }}
          />
        ))}
        {/* Vertical */}
        {[-35, -22, 22, 35].map((pct, i) => (
          <div
            key={`v-${i}`}
            className="ph-accent-line"
            style={{
              position: "absolute",
              top: 0, bottom: 0,
              left: pct > 0 ? `calc(50% + ${pct}%)` : `calc(50% - ${Math.abs(pct)}%)`,
              width: "1px",
              background: "rgba(186,214,247,.1)",
              opacity: 0, transform: "scaleY(0)",
              animation: `ph-accentload 1.8s ease-out ${1.8 + i * 0.1}s forwards`,
            }}
          />
        ))}
      </div>

      {/* ── CONTENT ── */}
      <div
        style={{
          position: "relative", zIndex: 10,
          display: "flex", flexDirection: "column",
          alignItems: "center", textAlign: "center",
          justifyContent: "center",
          minHeight: "100svh",
          padding: "clamp(80px,14vh,140px) clamp(20px,6vw,60px) clamp(60px,10vh,100px)",
          maxWidth: 760, width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Brand badge */}
        <div
          className="ph-sub"
          style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(186,214,247,.15)",
            borderRadius: 9999, padding: "6px 18px",
            marginBottom: 32, fontSize: 14, fontWeight: 600,
            color: "rgba(186,214,247,.8)",
            letterSpacing: "-0.01em",
            fontFamily: "Georgia, 'Times New Roman', serif",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 7, height: 7, borderRadius: "50%",
              background: "#22C55E", flexShrink: 0,
              boxShadow: "0 0 6px rgba(34,197,94,.55)",
              animation: "ph-blink 2s infinite",
            }}
          />
          booking platform
        </div>

        {/* Main headline */}
        <h1
          style={{
            fontSize: "clamp(30px,5.5vw,56px)",
            fontWeight: 700,
            letterSpacing: "-0.035em",
            lineHeight: 1.12,
            margin: "0 0 20px",
            fontFamily: "Georgia, 'Times New Roman', serif",
            color: "rgba(186,214,247,.95)",
            maxWidth: 680,
          }}
        >
          Независим собствен сайт с резервации за твоя салон.
        </h1>

        {/* Emphasis sub-heading */}
        <p
          style={{
            fontSize: "clamp(20px,3vw,28px)",
            fontWeight: 700,
            lineHeight: 1.3,
            margin: "0 0 40px",
            fontFamily: "Georgia, 'Times New Roman', serif",
            background: "linear-gradient(160deg, #bad1f1 20%, #9dc3f7 60%, #c8dff8 100%)",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          Готов за 15 минути.
        </p>

        {/* CTA buttons */}
        <div
          className="ph-cta"
          style={{
            display: "flex", gap: 12, flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Link
            href="/create"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              padding: "15px 40px", borderRadius: 9999,
              background: "#FAF8F5", color: "#1C1917",
              fontWeight: 700, fontSize: 16,
              textDecoration: "none", whiteSpace: "nowrap",
              transition: "transform .2s ease, box-shadow .2s ease",
              boxShadow: "0 4px 24px rgba(250,248,245,.15)",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"
              ;(e.currentTarget as HTMLElement).style.boxShadow = "0 10px 36px rgba(250,248,245,.22)"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.transform = "translateY(0)"
              ;(e.currentTarget as HTMLElement).style.boxShadow = "0 4px 24px rgba(250,248,245,.15)"
            }}
          >
            Създай своя сайт сега →
          </Link>
          <Link
            href="/demo"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              padding: "15px 32px", borderRadius: 9999,
              background: "rgba(255,255,255,.07)",
              border: "1.5px solid rgba(186,214,247,.25)",
              color: "rgba(186,214,247,.9)",
              fontWeight: 600, fontSize: 16,
              textDecoration: "none", whiteSpace: "nowrap",
              transition: "border-color .2s ease, background .2s ease",
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(186,214,247,.5)"
              ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.11)"
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = "rgba(186,214,247,.25)"
              ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,.07)"
            }}
          >
            Виж демо →
          </Link>
        </div>

        {/* Price note */}
        <p
          className="ph-sub"
          style={{
            marginTop: 20, fontSize: 13,
            color: "rgba(186,214,247,.35)",
          }}
        >
          от {formatDualEurText('0.82')} / ден · без скрити такси · 0% комисионна · собствен бранд
        </p>
      </div>

      {/* Bottom fade to page background */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0,
          height: 120,
          background: "linear-gradient(to bottom, transparent, #FAF8F5)",
          zIndex: 12, pointerEvents: "none",
        }}
      />
    </section>
  )
}
