# Shared cinematic intro and isolated prototype

Open `intro-particles-test.html`. Production V3 is not imported or initialized.
The prototype reads the existing configuration, geography, typography, monogram,
input helper and theme tokens. Its Three.js scene, camera and controls are separate.
Production `intro-particles-v3.js` uses these same particle/choreography helpers
on the native V3 renderer, camera and globe, with its existing header and footer.

One 22.1-second GSAP timeline starts after the scene and shaders are ready. `pacing.js`
gives the rotating cloud four seconds to gather, followed by one final second
of gentle coasting on the completed globe. These are one continuous motion.
The close-up arrives at 7.5 s, the camera leaves the towns at 8.3 s and the stars
collide at 13.3 s. Manual scrolling samples the identical reversible score. A first
scene click/touch pauses exactly at its current progress; that entire initiating
gesture is consumed. Further native scroll/pan seeks forward/backward through the
same timeline. The manual instruction and accessible progress range appear only
when paused. The utility Play control resumes, without restarting the score.
Background tabs and WebGL context loss suspend playback without changing progress.

The opening GPU cloud rotates while gathering onto the actual existing country
borders. Cloud and geography share two axial turns (720 degrees) across five
seconds, with smooth acceleration and deceleration. The globe finishes forming
after four seconds, then coasts through its remaining 42 degrees during the
final second, settling to zero velocity and acceleration before the unchanged
approach. Peak speed is 0.75 turns per second. The startup already shows particles,
without a loading label.
Slovakia is highlighted using only its existing geographic contour; there is no
surface fill. Editorial origin labels stay outside its projected boundary, with
the names above their towns. After a shorter hold, the camera retreats while one star arcs upward and
the other downward, curving back together only for their impact.
At the end, autoplay stops and the original globe accepts drag/pinch/wheel. The
existing-style footer offers replay and the verified production Journey/Wedding
routes. Scroll outside the globe surface, or use replay, to leave free exploration.
Reduced motion opens this final navigation immediately; replay is an explicit opt-in.

During formation, an analytic ray/sphere visibility fade follows the surface reveal.
The still-transparent globe therefore cannot abruptly depth-cut the rotating cloud
over America. The returning geographic cloud uses the same gradual visibility
with the actual sphere opacity, so its rear points do not abruptly disappear.

The original GPU point cloud retains its geographic formation and seeded burst.
Before drawing, dispersed dust fades away instead of condensing into tiny blobs.
Two luminous pens then trace the native globe badge's exact Bezier contour in
0.55 s (15.6–16.15 s). `heart-light-trails.js` samples one closed contour for
both pens and ribbons. Two contours share one GPU ribbon mesh with a roughly
one-CSS-pixel stroke, plus four point sprites for the pens and restrained halos.
Camera projection keeps the hearts about 28 CSS pixels wide at any DPR/viewport.
The cores fade after closing the line; only a few companion grains remain.
`sampleHeartPose` drives a short pair of opposite spatial arcs with a gentle
tilt, preserving approach velocity at their collision after 2.15 s of flight.
The impact at 18.3 s produces a second particle burst, which reforms directly
onto the original geographic positions from 19.0–21.9 s. There is no large
shared-heart regather, hold or second shatter. The world-space morph has zero
residual merge offset and fades into the native globe. Production then reveals
Journey labels without a new entrance.
`original-heart.js` retains the original sampler and soft point sprite from
`2f7b1ed75ab0cf6f43b0062870c23631586fdc8f`. Its cached geometry and random streams
remain intact to avoid changing the opening, explosion or seeded point variation;
the large heart itself is no longer a render destination.
The ribbon geometry, four pen sprites and 360 companion grain slots are created
once; update reuses every GPU buffer. Drawing and pen position are analytic
functions of the same reversible score, with no accumulated trail history.
Formation uses adaptive 16,000 / 42,000 / 60,000 points, while the
first explosion retains its 12,000 / 30,000 / 45,000 budget. All formation points
return with a gradual opacity ramp during the compact-heart impact, then gather
on Earth. No solid heart mesh or duplicated scene is introduced.
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
    node experiments/intro-particles/label-layout.test.mjs
    node experiments/intro-particles/continent-visibility.test.mjs
    node experiments/intro-particles/heart-morph.test.mjs
    node experiments/intro-particles/playback.test.mjs
    node intro-particles-v3.test.mjs
    node origins-v3.test.mjs
    node experiments/intro-particles/build.mjs
    npm run build

The helper builds only the new entry into `.intro-particles-build/`, then publishes
its HTML and hashed assets under `public/`. The existing Vite/Pages pipeline copies
those files unchanged. Commit the source plus `public/intro-particles-test.html`
and `public/experiments/intro-particles/`. Do not commit the temporary build folder.

The existing `sm-theme`, `sm-palette`, and `sm-language` preferences are honored.
Theme/language changes do not reset scroll or rebuild geometry. Photo/video assets
are not loaded by this prototype. A physical iPhone/Safari check remains necessary.
