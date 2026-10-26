# Isolated cinematic intro prototype

Open `intro-particles-test.html`. Production V3 is not imported or initialized.
The prototype reads the existing configuration, geography, typography, monogram,
input helper and theme tokens. Its Three.js scene, camera and controls are separate.

One 40-second GSAP timeline starts after the scene and shaders are ready. A first
scene click/touch pauses exactly at its current progress; that entire initiating
gesture is consumed. Further native scroll/pan seeks forward/backward through the
same timeline. The manual instruction and accessible progress range appear only
when paused. The utility Play control resumes, without restarting the score.
Background tabs and WebGL context loss suspend playback without changing progress.

The opening GPU cloud gathers onto the actual existing country borders, with one
shared axial rotation on the cloud and globe that settles before the approach. The camera
then holds over Hlohovec/Cífer before retreating along the asymmetric star flight.
At the end, autoplay stops and the original globe accepts drag/pinch/wheel. The
existing-style footer offers replay and the verified production Journey/Wedding
routes. Scroll outside the globe surface, or use replay, to leave free exploration.
Reduced motion opens this final navigation immediately; replay is an explicit opt-in.

The particle shaders are original code: one shared GPU point cloud morphs between
geographic formation, seeded explosion and parametric volumetric heart coordinates.
The rounded heart combines a Bézier profile with a shell/interior loft. A second
point batch renders star cores/trails; a small plane renders the merger impulse.
Pulse, yaw and the traveling light wave are progress-based, so pausing freezes them
and backward seeking reverses them. There is no accumulating physics simulation.
16,000 points are used on mobile, 8,000 on constrained devices, 24,000 on desktop.
Star trails use a separate, smaller budget: they grow with traveled distance after
liftoff, instead of stacking the entire tail into one close-up particle blot.
The reference repository had no license, so none of its source was copied.

## Build without changing production configuration

From the repository root:

    node experiments/intro-particles/tests.mjs
    node experiments/intro-particles/playback.test.mjs
    node experiments/intro-particles/build.mjs
    npm run build

The helper builds only the new entry into `.intro-particles-build/`, then publishes
its HTML and hashed assets under `public/`. The existing Vite/Pages pipeline copies
those files unchanged. Commit the source plus `public/intro-particles-test.html`
and `public/experiments/intro-particles/`. Do not commit the temporary build folder.

The existing `sm-theme`, `sm-palette`, and `sm-language` preferences are honored.
Theme/language changes do not reset scroll or rebuild geometry. Photo/video assets
are not loaded by this prototype. A physical iPhone/Safari check remains necessary.
