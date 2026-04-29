precision highp float;

varying vec2 vUv;
uniform float uTime;
uniform float uResonance;
uniform float uPhaseShift;

void main() {
    // Zentrierung der UV-Koordinaten für radiale Berechnungen
    vec2 centerUv = vUv - 0.5;
    float distanceToCenter = length(centerUv);

    // Deterministische Verzerrung (Distortion) basierend auf uPhaseShift und uResonance
    // Erzeugt ringförmige Wellenbewegungen, die direkt mit dem PhaseShift synchronisiert sind
    float ripple = sin(distanceToCenter * 30.0 - uPhaseShift) * (uResonance * 0.05);
    vec2 distortedUv = vUv + (normalize(centerUv) * ripple);

    // Neuberechnung des Abstands nach der Verzerrung für den Glüheffekt
    float distortedDist = length(distortedUv - 0.5);

    // Intensitäts-Mapping: Höhere Resonanz erzeugt schärfere und hellere Effekte
    float coreIntensity = smoothstep(0.4, 0.0, distortedDist) * uResonance;
    
    // Glühen (Glow) basierend auf der Resonanz-Amplitude
    float glow = pow(max(0.0, 0.6 - distortedDist), 4.0) * (uResonance * 15.0);

    // Farbmodulation: Wechsel von Gefahren-Rot zu Resonanz-Blau/Cyan basierend auf der Intensität
    vec3 colorHazard = vec3(1.0, 0.1, 0.0); // Gefahrenzustand
    vec3 colorResonance = vec3(0.0, 0.8, 1.0); // Resonanzkopplung
    
    // Dynamische Farbmischung gesteuert durch uResonance und uPhaseShift
    float colorMix = clamp(uResonance * (0.5 + 0.5 * cos(uPhaseShift)), 0.0, 1.0);
    vec3 baseColor = mix(colorHazard, colorResonance, colorMix);

    // Finaler Farb-Output: Kombination aus Kern-Intensität und additivem Glühen
    vec3 finalRGB = baseColor * (coreIntensity + glow);
    
    // Alpha-Kanal skaliert mit der Resonanz für deterministisches Culling/Blending
    float finalAlpha = clamp((coreIntensity + glow) * uResonance, 0.0, 1.0);

    gl_FragColor = vec4(finalRGB, finalAlpha);
}