import React, { useRef, useEffect } from 'react';

interface Particle {
    id: number;
    x: number;
    y: number;
    type: 'proton' | 'electron' | 'neutron';
    radius: number;
}

interface PhysicsCanvasProps {
    particles: Particle[];
    width: number;
    height: number;
    kappaLimit: number; // Der maximale Integer-Wert der ParticleEngine (z.B. 1000000)
}

/**
 * PhysicsCanvas
 * Hochleistungs-Visualisierung für physikalische Partikel-Simulationen.
 * Transformiert Kappa-Koordinaten in Pixel-Koordinaten unter Berücksichtigung des DevicePixelRatio.
 */
export const PhysicsCanvas: React.FC<PhysicsCanvasProps> = ({
    particles,
    width,
    height,
    kappaLimit
}) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>(particles);

    // Synchronisiere Partikel-Daten ohne Re-Rendering des Canvas-Elements zu erzwingen
    useEffect(() => {
        particlesRef.current = particles;
    }, [particles]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d', { 
            alpha: false, 
            desynchronized: true // Reduziert Latenz in unterstützten Browsern
        });
        if (!ctx) return;

        let animationFrameId: number;

        const render = () => {
            const currentParticles = particlesRef.current;
            const dpr = window.devicePixelRatio || 1;
            
            // Handle High-DPI Scaling (Retina/Mobile)
            if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
                canvas.width = width * dpr;
                canvas.height = height * dpr;
                ctx.scale(dpr, dpr);
            }

            // Hintergrund löschen (Deep Space Blue)
            ctx.fillStyle = '#020617';
            ctx.fillRect(0, 0, width, height);

            // Koordinaten-Transformation vorbereiten
            // kappaScale berechnet das Verhältnis von Kappa-Units zu Screen-Pixeln
            const kappaScale = width / kappaLimit;

            // Batch-Rendering nach Typ zur Minimierung von FillStyle-Wechseln
            const drawType = (type: 'proton' | 'electron' | 'neutron', color: string) => {
                ctx.fillStyle = color;
                for (let i = 0; i < currentParticles.length; i++) {
                    const p = currentParticles[i];
                    if (p.type !== type) continue;
                    
                    // Transformation: Kappa-Int -> Render-Float
                    const renderX = p.x * kappaScale;
                    const renderY = p.y * kappaScale;
                    const renderR = Math.max(p.radius * kappaScale, 1.5); // Mindestgröße 1.5px für Sichtbarkeit

                    ctx.beginPath();
                    // Nutze fixen Wert für 2 * PI für Performance
                    ctx.arc(renderX, renderY, renderR, 0, 6.283185307179586);
                    ctx.fill();
                }
            };

            // Zeichne Layer
            drawType('proton', '#ef4444');   // Rot
            drawType('electron', '#3b82f6'); // Blau
            drawType('neutron', '#94a3b8');  // Grau

            animationFrameId = requestAnimationFrame(render);
        };

        animationFrameId = requestAnimationFrame(render);

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [width, height, kappaLimit]);

    return (
        <canvas
            ref={canvasRef}
            style={{
                width: width,
                height: height,
                display: 'block',
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                touchAction: 'none',
                imageRendering: 'auto'
            }}
        />
    );
};

export default PhysicsCanvas;