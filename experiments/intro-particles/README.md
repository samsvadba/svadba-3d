# Isolated scroll-driven intro prototype

Open `intro-particles-test.html`. Production V3 is not imported or initialized.
The prototype reads the existing configuration, geography, typography, monogram,
input helper and theme tokens. Its Three.js scene, camera and controls are separate.

Scroll down/up to drive and reverse the camera, geographic stars, particle burst,
volumetric heart and final reveal. The thin progress control is keyboard accessible.
At the end, the center surface accepts drag/pinch/wheel; the bottom margin and
“Back to our story” control let the visitor return to scrolling.

The particle shaders are original code: one shared GPU point cloud morphs between
seeded explosion and implicit 3D heart coordinates. Two small point batches render
star cores/trails. There is no animation clock or accumulating physics simulation.
9,000 points are used on mobile, 5,200 on constrained devices, 14,000 on desktop.
The reference repository had no license, so none of its source was copied.

## Build without changing production configuration

From the repository root:

    node experiments/intro-particles/tests.mjs
    node experiments/intro-particles/build.mjs
    npm run build

The helper builds only the new entry into `.intro-particles-build/`, then publishes
its HTML and hashed assets under `public/`. The existing Vite/Pages pipeline copies
those files unchanged. Commit the source plus `public/intro-particles-test.html`
and `public/experiments/intro-particles/`. Do not commit the temporary build folder.

The existing `sm-theme`, `sm-palette`, and `sm-language` preferences are honored.
Theme/language changes do not reset scroll or rebuild geometry. Photo/video assets
are not loaded by this prototype. A physical iPhone/Safari check remains necessary.
