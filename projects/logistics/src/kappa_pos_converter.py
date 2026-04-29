interface KappaPos {
    kappaX: number;
    kappaY: number;
}

interface GPS {
    lat: number;
    lon: number;
}

class KappaPosConverter {
    private static readonly SCALE_FACTOR: number = 1000;

    /**
     * Wandelt GPS-Koordinaten in kappaPos (int32) um.
     * Nutzt Bitweise OR 0 Operation zur Sicherstellung von 32-Bit Integer Verhalten.
     */
    public static toKappaPos(lat: number, lon: number): KappaPos {
        return {
            kappaX: (Math.round(lon * KappaPosConverter.SCALE_FACTOR)) | 0,
            kappaY: (Math.round(lat * KappaPosConverter.SCALE_FACTOR)) | 0
        };
    }

    /**
     * Wandelt kappaPos (int32) zurück in GPS-Koordinaten.
     */
    public static fromKappaPos(kappaX: number, kappaY: number): GPS {
        return {
            lat: kappaY / KappaPosConverter.SCALE_FACTOR,
            lon: kappaX / KappaPosConverter.SCALE_FACTOR
        };
    }
}

export { KappaPos, GPS, KappaPosConverter };