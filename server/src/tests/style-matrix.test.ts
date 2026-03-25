import { describe, it, expect } from 'vitest';
import { StyleMatrixParser } from '../modules/world/style/StyleMatrixParser.js';
import path from 'path';

describe('StyleMatrixParser', () => {
    const dataDir = path.join(process.cwd(), 'game-data', 'style-matrix');
    const parser = new StyleMatrixParser(dataDir);

    it('should parse a valid style key correctly', () => {
        const props = parser.parseKey('desert_ancient_redfalcon_ruined');
        expect(props.palette).toContain('#C1121F'); // redfalcon accent color
        expect(props.materialModifier).toBe('faded'); // ancient
        expect(props.decal).toBe('emblem_redfalcon'); // redfalcon
        expect(props.conditionOverlay).toBe('dirt_heavy'); // ruined
        expect(props.meshVariant).toBe('broken'); // ruined
    });

    it('should throw error for invalid format', () => {
        expect(() => {
            parser.parseKey('invalid_key_format');
        }).toThrow(/Invalid Style Key format/);
    });

    it('should use default fallbacks for unknown properties', () => {
        const props = parser.parseKey('unknownbiome_unknownhist_unknownfaction_unknowncond');
        expect(props.palette).toEqual(['#FFFFFF']);
        expect(props.materialModifier).toBe('default');
        expect(props.decal).toBeNull();
        expect(props.conditionOverlay).toBe('none');
        expect(props.meshVariant).toBe('base');
    });
});
