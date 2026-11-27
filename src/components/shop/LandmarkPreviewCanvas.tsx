import React, { memo, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  buildDiamondLandmarkGroup,
  createCityMaterialLibrary,
  type AnimatedCityPart,
} from '../../city3d/buildingModels';
import type { DiamondAssetDef } from '../../game/types';

interface LandmarkPreviewCanvasProps {
  asset: DiamondAssetDef;
  height?: number;
}

export const LandmarkPreviewCanvas = memo(function LandmarkPreviewCanvas({
  asset,
  height = 220,
}: LandmarkPreviewCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [fallbackMode, setFallbackMode] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let disposed = false;
    let rafId = 0;

    try {
      const width = Math.max(240, host.clientWidth || 320);
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'default',
      });
      renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, width / height, 0.5, 120);
      camera.position.set(13.5, 11.5, 16.5);
      camera.lookAt(0, 5.2, 0);

      const hemi = new THREE.HemisphereLight(0xcde7ff, 0x1a153a, 1.35);
      const key = new THREE.DirectionalLight(0xffffff, 1.85);
      key.position.set(12, 20, 14);
      const rim = new THREE.PointLight(new THREE.Color(asset.accentColor), 3.4, 34);
      rim.position.set(-7, 9, -6);
      scene.add(hemi, key, rim);

      const maxAniso = Math.min(4, Math.max(1, renderer.capabilities.getMaxAnisotropy() || 1));
      const lib = createCityMaterialLibrary(maxAniso);
      const animatedParts: AnimatedCityPart[] = [];
      const grp = buildDiamondLandmarkGroup({
        assetId: asset.id,
        lib,
        animatedParts,
      });

      const pivot = new THREE.Group();
      if (grp) {
        grp.position.set(0, 0, 0);
        pivot.add(grp);
      }

      // Subtle glowing circular showroom plinth
      const ringGeo = new THREE.RingGeometry(4.8, 5.35, 36);
      ringGeo.rotateX(-Math.PI * 0.5);
      const ringMat = new THREE.MeshBasicMaterial({
        color: asset.accentColor,
        transparent: true,
        opacity: 0.45,
        side: THREE.DoubleSide,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.position.y = 0.05;
      pivot.add(ring);
      scene.add(pivot);

      host.innerHTML = '';
      host.appendChild(renderer.domElement);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = `${height}px`;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.borderRadius = '14px';

      let dragActive = false;
      let lastX = 0;
      let userYaw = 0.4;

      const onDown = (e: PointerEvent) => {
        dragActive = true;
        lastX = e.clientX;
      };
      const onMove = (e: PointerEvent) => {
        if (!dragActive) return;
        const dx = e.clientX - lastX;
        lastX = e.clientX;
        userYaw += dx * 0.012;
      };
      const onUp = () => {
        dragActive = false;
      };

      const dom = renderer.domElement;
      dom.addEventListener('pointerdown', onDown);
      window.addEventListener('pointermove', onMove);
      window.addEventListener('pointerup', onUp);

      const gl = renderer.getContext();
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      const rName = dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) || '') : '';
      const isSw = /swiftshader|llvmpipe|software/i.test(rName);

      let lastTs = performance.now();
      const renderLoop = (now: number) => {
        if (disposed || !renderer) return;
        const dt = Math.min(0.08, Math.max(0.005, (now - lastTs) / 1000));
        lastTs = now;
        if (!dragActive) {
          userYaw += dt * 0.42;
        }
        pivot.rotation.y = userYaw;
        for (const ap of animatedParts) {
          if (ap.kind === 'radar') ap.obj.rotation.y += dt * ap.speed;
          if (ap.kind === 'beacon') ap.obj.rotation.y += dt * ap.speed;
        }
        renderer.render(scene, camera);
        if (isSw) {
          rafId = window.setTimeout(() => renderLoop(performance.now()), 90);
        } else {
          rafId = requestAnimationFrame(renderLoop);
        }
      };

      renderer.render(scene, camera);
      if (isSw) {
        rafId = window.setTimeout(() => renderLoop(performance.now()), 120);
      } else {
        rafId = requestAnimationFrame(renderLoop);
      }

      const ro = typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => {
            if (!host || !renderer || disposed) return;
            const w = Math.max(220, host.clientWidth || 320);
            camera.aspect = w / height;
            camera.updateProjectionMatrix();
            renderer.setSize(w, height);
          })
        : null;
      ro?.observe(host);

      setFallbackMode(false);

      return () => {
        disposed = true;
        cancelAnimationFrame(rafId);
        window.clearTimeout(rafId);
        ro?.disconnect();
        dom.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        pivot.traverse((obj) => {
          const m = obj as THREE.Mesh;
          if (m.geometry) m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((x) => x.dispose());
          else if (m.material) m.material.dispose();
        });
        lib.dispose();
        renderer?.dispose();
        if (dom.parentElement === host) host.removeChild(dom);
      };
    } catch {
      setFallbackMode(true);
      return () => {
        disposed = true;
        cancelAnimationFrame(rafId);
        window.clearTimeout(rafId);
        renderer?.dispose();
      };
    }
  }, [asset.id, asset.accentColor, height]);

  return (
    <div
      className="dx-3d-stage"
      style={{
        height,
        '--art-a': asset.accentColor,
        '--art-b': asset.secondaryColor,
      } as React.CSSProperties}
    >
      {fallbackMode ? (
        <div className="dx-3d-fallback">
          <span className="dx-3d-fallback-ic" aria-hidden="true">{asset.icon}</span>
          <b>{asset.name}</b>
          <small>Waterfront 3D Monument</small>
        </div>
      ) : (
        <div ref={hostRef} className="dx-3d-host" />
      )}
      <span className="dx-3d-hint">Drag to rotate 3D model</span>
    </div>
  );
});
