# Mobile Optimization Validation Checklist

This checklist covers the smoke tests that confirm the Claude-driven mobile optimizations are working as intended. Run these steps before sign-off on any mobile-related release.

## 1. Build and deploy the preview
- `npm run build`
- Deploy a preview build or run `npm run preview` so that real devices can access the latest artifacts.

## 2. Safari on iOS (mobile-low tier)
- Use an iPhone SE (2020) or similar low-memory device.
- Clear Safari caches and visit the preview link.
- Confirm the scene loads on the first attempt and does **not** bounce back to the loading screen.
- Verify the gradient background renders (no HDRI), with UI remaining responsive.
- Rotate the scene for 60 seconds; ensure the FPS overlay stays above 30 FPS and no "context lost" banner appears.

## 3. Safari on iOS (mobile-high tier)
- Use an iPhone 12/13/14 class device.
- Load the experience and confirm the lightweight HDRI (512px) and soft shadows appear.
- Toggle any UI panels that previously caused stalls. Ensure the FPS overlay remains above 45 FPS.
- Inspect the console via Web Inspector to verify `📱 Mobile-high` logs are present and no WebGL errors occur.

## 4. Orion Browser on iOS
- Open the same preview link in Orion.
- Confirm the background gradient renders and buttons/text are dark-on-light with adequate contrast.
- Interact with the scene and UI for 2 minutes. Ensure no visual regressions or context loss popups.

## 5. Android Chrome
- Load the preview on a mid-tier Android device.
- Confirm tier detection logs `📱 Mobile-high` or `📱 Mobile-low` as appropriate.
- Validate Bloom and tone mapping are active on capable hardware.

## 6. Desktop regression check
- Load the experience on a desktop browser (Chrome/Edge/Firefox).
- Ensure full-quality HDRI, 4K shadows, and post-processing remain enabled.
- Confirm no new warnings appear in the console.

## 7. Post-test summary
- Capture device logs or screenshots showing the tier detection banner for each platform.
- File issues for any anomalies before merging the branch.

Following this script makes it easy to prove that the optimizations are functioning correctly across the targeted mobile environments.
