import { useEffect } from 'react';

export function LayoutDebugger() {
    useEffect(() => {
        const logLayout = () => {
            const getRect = (sel: string) => document.querySelector(sel)?.getBoundingClientRect();
            const getStyle = (sel: string) => {
                const el = document.querySelector(sel);
                return el ? window.getComputedStyle(el) : null;
            };

            console.log('🔍 LAYOUT_DEBUG', {
                window: { w: window.innerWidth, h: window.innerHeight },
                viewport: getRect('.app-viewport'),
                layout: getRect('.app-layout'),
                shell: getRect('.scene-shell'),
                canvas: getRect('canvas'),
                styles: {
                    shell: {
                        height: getStyle('.scene-shell')?.height,
                        top: getStyle('.scene-shell')?.top,
                        bottom: getStyle('.scene-shell')?.bottom,
                        position: getStyle('.scene-shell')?.position
                    },
                    canvas: {
                        height: getStyle('canvas')?.height
                    }
                }
            });
        };

        // Log on mount and resize
        logLayout();
        window.addEventListener('resize', logLayout);
        return () => window.removeEventListener('resize', logLayout);
    }, []);

    return null;
}
