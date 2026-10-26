# Isolated cinematic intro prototype

Open `intro-particles-test.html`. Production V3 is not imported or initialized.
The prototype reads the existing configuration, geography, typography, monogram,
input helper and theme tokens. Its Three.js scene, camera and controls are separate.

One 34-second GSAP timeline starts after the scene and shaders are ready. `pacing.js`
smoothly compresses the opening formation to about 2.7 seconds and brings the
approach forward; manual scrolling samples the identical reversible score. A first
scene click/touch pauses exactly at its current progress; that entire initiating
gesture is consumed. Further native scroll/pan seeks forward/backward through the
same timeline. The manual instruction and accessible progress range appear only
when paused. The utility Play control resumes, without restarting the score.
Background tabs and WebGL context loss suspend playback without changing progress.

The opening GPU cloud gathers onto the actual existing country borders, with one
shared 360-degree axial rotation on the cloud and globe that settles before the approach.
Slovakia is highlighted using its existing geographic rings, with a subtle surface
fill and darker contour. Editorial origin labels give the names priority over the
towns. After a shorter hold, the camera retreats while one star arcs upward and
the other downward, curving back together only for their impact.
At the end, autoplay stops and the original globe accepts drag/pinch/wheel. The
existing-style footer offers replay and the verified production Journey/Wedding
routes. Scroll outside the globe surface, or use replay, to leave free exploration.
Reduced motion opens this final navigation immediately; replay is an explicit opt-in.

The particle shaders are original code: one shared GPU point cloud morphs between
geographic formation, seeded explosion and a volumetric heart.
`original-heart.js` restores the first sampler and point sprite verbatim from
`2f7b1ed75ab0cf6f43b0062870c23631586fdc8f`: approximately 82% shell / 18% interior,
the original random sequence, point sizes, brightness and sparkle.
Only geometry is refined: X ×0.90, Y ×0.96, Z ×0.91, a 0.028-unit cleft correction
and a 0.018-unit tip correction. This keeps the original volume inside today's
unchanged camera framing. The heart now uses 9,000 points on constrained devices,
20,000 on mobile and 30,000 on desktop. A slow 25-degree spatial turn and gentle
1.8% breathing reveal the original volume. Formation/explosion use adaptive
10,000 / 24,000 / 36,000 points; the impact briefly swirls the same particles into
clouds before they gather. No new effect layer or solid heart mesh is introduced.
A second point batch renders brighter star cores/trails; a small plane renders
the merger impulse.
Star trails use a separate, smaller budget: they grow with traveled distance after
liftoff, instead of stacking the entire tail into one close-up particle blot.
The reference repository had no license, so none of its source was copied.
Heart generation uses its own seeded random stream. All geometry is created once;
every motion remains a function of score progress. Camera framing is unchanged.

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
