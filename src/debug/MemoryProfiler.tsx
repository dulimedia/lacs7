import React, { useState, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

// RenderTarget logging disabled to prevent crash
const renderTargetLogs: string[] = ['Render Target logging disabled in strict mode'];

export const MemoryProfiler: React.FC = () => {
    const { gl, scene } = useThree();
    const [stats, setStats] = useState({
        geometries: 0,
        textures: 0,
        drawCalls: 0,
        triangles: 0,
        jsHeap: '0'
    });
    const [report, setReport] = useState<string>('');
    const [isVisible, setIsVisible] = useState(true);

    // Step 1: Live Memory Overlay
    useFrame(() => {
        if (!isVisible) return;

        // @ts-ignore
        const heap = window.performance?.memory ? Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB' : 'N/A';

        setStats({
            geometries: gl.info.memory.geometries,
            textures: gl.info.memory.textures,
            drawCalls: gl.info.render.calls,
            triangles: gl.info.render.triangles,
            jsHeap: heap
        });
    });

    // Step 3 & 4: Dump Inventory & Duplicates
    const generateReport = useCallback(() => {
        const reportLines: string[] = [];
        reportLines.push(`--- MEMORY PROFILE REPORT ---`);
        reportLines.push(`Timestamp: ${new Date().toISOString()}`);
        reportLines.push(`JS Heap: ${// @ts-ignore
            window.performance?.memory?.usedJSHeapSize
                ? Math.round(window.performance.memory.usedJSHeapSize / 1024 / 1024) + ' MB'
                : 'N/A'}`);
        reportLines.push(`GL Info: Textures=${gl.info.memory.textures}, Geometries=${gl.info.memory.geometries}`);
        reportLines.push(`Max Texture Size: ${gl.getParameter(gl.MAX_TEXTURE_SIZE)}`);
        reportLines.push(`\n--- RENDER TARGETS ---`);
        reportLines.push(...renderTargetLogs);

        // Texture Inventory
        const textures = new Map<string, {
            uuid: string,
            src: string,
            size: number,
            w: number,
            h: number,
            refs: number,
            names: string[]
        }>();

        scene.traverse((obj) => {
            if (!(obj as any).isMesh) return;
            const mesh = obj as THREE.Mesh;
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

            materials.forEach((mat) => {
                if (!mat) return;
                ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap', 'alphaMap', 'envMap'].forEach((mapType) => {
                    // @ts-ignore
                    const tex = mat[mapType];
                    if (tex && tex.isTexture) {
                        const image = tex.image;
                        if (image) {
                            const w = image.width || 0;
                            const h = image.height || 0;
                            // Approx size: w * h * 4 bytes * 1.33 for mipmaps
                            const estimatedSize = Math.round((w * h * 4 * 1.33) / 1024 / 1024 * 100) / 100; // in MB

                            const key = tex.uuid;
                            if (!textures.has(key)) {
                                textures.set(key, {
                                    uuid: tex.uuid,
                                    src: image.src ? image.src.substring(image.src.length - 50) : 'Embedded/Buffer',
                                    size: estimatedSize,
                                    w, h,
                                    refs: 0,
                                    names: []
                                });
                            }
                            const entry = textures.get(key)!;
                            entry.refs++;
                            if (entry.names.length < 3) entry.names.push(mesh.name || 'unnamed');
                        }
                    }
                });
            });
        });

        const sortedTextures = Array.from(textures.values()).sort((a, b) => b.size - a.size);
        const totalTextureMem = sortedTextures.reduce((acc, item) => acc + item.size, 0);

        reportLines.push(`\n--- TEXTURE INVENTORY ---`);
        reportLines.push(`Total Unique Textures Found: ${sortedTextures.length}`);
        reportLines.push(`Estimated Total Texture Memory: ${totalTextureMem.toFixed(2)} MB`);
        reportLines.push(`\n[Top 30 Largest Textures]`);

        sortedTextures.slice(0, 30).forEach((t, i) => {
            reportLines.push(`${i + 1}. [${t.size} MB] ${t.w}x${t.h} - ${t.src} (${t.refs} refs) on [${t.names.join(', ')}]`);
        });

        // Duplicate Check (by src)
        const srcMap = new Map<string, string[]>();
        sortedTextures.forEach(t => {
            if (t.src !== 'Embedded/Buffer') {
                if (!srcMap.has(t.src)) srcMap.set(t.src, []);
                srcMap.get(t.src)?.push(t.uuid);
            }
        });

        reportLines.push(`\n--- DUPLICATE SRC CHECK ---`);
        let dupesFound = 0;
        srcMap.forEach((uuids, src) => {
            if (uuids.length > 1) {
                reportLines.push(`DUPLICATE: ${src} loaded as ${uuids.length} separate Texture objects.`);
                dupesFound++;
            }
        });
        if (dupesFound === 0) reportLines.push('No obvious duplicate image sources found.');

        setReport(reportLines.join('\n'));
        console.log(reportLines.join('\n'));
    }, [gl, scene]);

    if (!isVisible && !report) return (
        <Html fullscreen style={{ pointerEvents: 'none', zIndex: 9999 }}>
            <div style={{ position: 'fixed', bottom: 0, left: 0, pointerEvents: 'auto' }}>
                <button onClick={() => setIsVisible(true)}>Show Profiler</button>
            </div>
        </Html>
    );

    return (
        <Html fullscreen style={{ pointerEvents: 'none', zIndex: 10000 }}>
            <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none', // Passthrough for clicks
                fontFamily: 'monospace',
                fontSize: '12px',
                color: '#00ff00',
                textShadow: '1px 1px 0 #000'
            }}>
                {/* Live Stats Overlay */}
                <div style={{
                    position: 'absolute',
                    top: 10,
                    left: 10,
                    background: 'rgba(0,0,0,0.8)',
                    padding: '10px',
                    border: '1px solid #00ff00',
                    pointerEvents: 'auto'
                }}>
                    <div>[MEM] Heap: {stats.jsHeap}</div>
                    <div>Tex Count: {stats.textures}</div>
                    <div>Geo Count: {stats.geometries}</div>
                    <div>Calls: {stats.drawCalls}</div>
                    <div>Tris: {stats.triangles}</div>
                    <div style={{ marginTop: '10px', display: 'flex', gap: '5px' }}>
                        <button style={{ background: '#333', color: '#fff', cursor: 'pointer' }} onClick={generateReport}>📸 PRINT RECEIPT</button>
                        <button style={{ background: '#333', color: '#fff', cursor: 'pointer' }} onClick={() => setIsVisible(false)}>Minimize</button>
                    </div>
                </div>

                {/* Full Report Area */}
                {report && (
                    <div style={{
                        position: 'absolute',
                        top: '50px',
                        right: '10px',
                        width: '600px',
                        height: '80vh',
                        background: 'rgba(0,0,0,0.95)',
                        border: '1px solid #00ff00',
                        padding: '10px',
                        overflow: 'auto',
                        pointerEvents: 'auto'
                    }}>
                        <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                            <strong>MEMORY RECEIPT</strong>
                            <button onClick={() => setReport('')}>Close</button>
                        </div>
                        <textarea
                            readOnly
                            value={report}
                            style={{
                                width: '100%',
                                height: '90%',
                                background: 'transparent',
                                color: '#00ff00',
                                border: 'none',
                                fontSize: '11px'
                            }}
                        />
                    </div>
                )}
            </div>
        </Html>
    );
};
