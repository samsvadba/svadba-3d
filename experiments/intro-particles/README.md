# Shared cinematic intro and isolated prototype

Open `intro-particles-test.html`. Production V3 is not imported or initialized.
The prototype reads the existing configuration, geography, typography, monogram,
input helper and theme tokens. Its Three.js scene, camera and controls are separate.
Production `intro-particles-v3.js` uses these same particle/choreography helpers
on the native V3 renderer, camera and globe, with its existing header and footer.

One 17.2-second GSAP timeline starts after the scene and shaders are ready. `pacing.js`
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
The stars collide once at 13.3 s. Their same particles expand into a short spatial
cloud, then regroup directly on the real geographic boundary positions from
14.0–17.0 s. There is no heart drawing, heart flight, second impact or hidden
heart geometry. The entire intro now finishes at 17.2 s. The exact original
pre-impact score, including its outgoing tangent, is preserved through 13.3 s.
The world-space morph loses all merge offset and curl at its Earth endpoint;
production then reveals Journey labels without a new entrance.
The original soft point sprite remains in use. Legacy random draw advancement
preserves every approved opening scatter, explosion direction and star seed,
without generating or uploading any of the former heart points or ribbons.
Formation uses adaptive 16,000 / 42,000 / 60,000 points, while the early explosion
retains its 12,000 / 30,000 / 45,000 budget. Additional geography points fade in
with the reform weight, so increasing the draw range creates no density jump.
All geometry is created once and every motion remains a function of score
progress, fully reversible without an accumulated trail history.
A second point batch renders brighter star cores/trails; a small plane renders
the merger impulse.
Star trails use a separate, smaller budget: they grow with traveled distance after
liftoff, instead of stacking the entire tail into one close-up particle blot.
The reference repository had no license, so none of its source was copied.
Camera framing remains unchanged up to the stars’ impact; afterward it settles
directly into the existing interactive globe.

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
