import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';

// Palettes de couleurs
const primary = {
    50: '#eef2ff',
    100: '#e0e7ff',
    200: '#c7d2fe',
    300: '#a5b4fc',
    400: '#818cf8',
    500: '#6366f1',
    600: '#4f46e5', // Couleur primaire principale
    700: '#4338ca',
    800: '#3730a3',
    900: '#312e81',
    950: '#1e1b4b'
};

const surface = {
    0: '#ffffff',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
    950: '#020617'
};

export const KupangaTheme = definePreset(Aura, {
    semantic: {
        primary: primary,
        colorScheme: {
            light: {
                surface: surface,
                text: {
                    color: '{surface.700}',
                    hoverColor: '{surface.800}',
                    mutedColor: '{surface.500}'
                }
            },
            dark: {
                surface: {
                    0: '#020617',
                    50: '#0f172a',
                    100: '#1e293b',
                    200: '#334155',
                    300: '#475569',
                    400: '#64748b',
                    500: '#94a3b8',
                    600: '#cbd5e1',
                    700: '#e2e8f0',
                    800: '#f1f5f9',
                    900: '#f8fafc',
                    950: '#ffffff'
                },
                text: {
                    color: '{surface.700}',      // Deviendra #e2e8f0 (Clair)
                    hoverColor: '{surface.800}', // Deviendra #f1f5f9 (Plus clair)
                    mutedColor: '{surface.500}'  // Deviendra #94a3b8 (Moyen)
                }
            }
        }
    },
    components: {
        global: {
            borderRadius: '6px'
        }
    }
});
