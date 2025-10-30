# 📱 Quick Mobile Reference

## Tier Detection at a Glance

| Device | Tier | HDRI | Shadows | Post-FX | DPR | Memory |
|--------|------|------|---------|---------|-----|--------|
| iPhone SE (2020) | mobile-low | ❌ | ❌ | ❌ | 1.0 | 30 MB |
| iPhone 12+ | mobile-high | ✅ 512px | ✅ 2K | ✅ Bloom | 1.25 | 80 MB |
| Desktop | desktop | ✅ 1024px | ✅ 4K | ✅ Full | 2.0 | 200 MB |

---

## Console Log Quick Reference

### Tier Detection
```
📱 Renderer DPR: 1 (tier: mobile-low, device: 2)
📱 Renderer DPR: 1.25 (tier: mobile-high, device: 3)
📱 Renderer DPR: 2 (tier: desktop-webgl2, device: 2)
```

### Lighting/Shadows
```
📱 Mobile-low: Shadows DISABLED for performance
📱 Mobile-high: Lightweight shadows enabled (2K map)
🌅 Desktop: Shadow map initialized: 4096×4096
```

### Effects
```
📱 Mobile-low: Post-processing effects DISABLED
📱 Mobile-high: Selective post-processing enabled (Bloom + ToneMapping)
🖥️ Desktop: Full post-processing effects enabled
```

---

## Quick Debugging

### Force Tier
```javascript
localStorage.setItem('forceTier', 'mobile-high');
location.reload();
```

### Check Memory
```javascript
setInterval(() => {
  const m = performance.memory;
  console.log(`${(m.usedJSHeapSize/1e6).toFixed(1)}MB / ${(m.jsHeapSizeLimit/1e6).toFixed(1)}MB`);
}, 5000);
```

### Clear Everything
```javascript
localStorage.clear();
sessionStorage.clear();
location.reload();
```

---

## Files Changed (5 files)

1. `src/graphics/makeRenderer.ts` - WebGL bootstrap
2. `src/App.tsx` - Asset loading
3. `src/index.css` - Color scheme
4. `src/components/Effects.tsx` - Post-processing
5. `src/scene/Lighting.tsx` - Shadows

---

## Test Commands

```bash
# Build
npm run build

# Preview locally
npm run preview

# Type check
npx tsc --noEmit

# Clean rebuild
rm -rf dist node_modules/.vite && npm run build
```

---

## Expected FPS

- **Mobile-low**: 30-60 FPS
- **Mobile-high**: 45-60 FPS
- **Desktop**: 60+ FPS

---

## When to Investigate

🚨 **Red flags:**
- Context lost errors
- FPS below 20 on mobile-low
- White-on-white UI on Orion
- App reloads in a loop

✅ **Normal behavior:**
- Different background on mobile-low vs desktop
- Console logs showing tier detection
- Slight quality difference between tiers

---

## Quick Support

**Issue**: iOS Safari crashes on load  
**Check**: Console for "context lost" → Verify WebGL1 fallback is working

**Issue**: Orion shows white buttons  
**Check**: Color scheme should be `light`, not `light dark`

**Issue**: Mobile-high looks flat  
**Check**: Console should show "Lightweight shadows enabled (2K map)"

**Issue**: Desktop lost quality  
**Check**: Tier should be `desktop-webgl2`, DPR = 2.0

---

**Last Updated:** 2025-10-29
