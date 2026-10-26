# Shared cinematic intro and isolated prototype

Open `intro-particles-test.html`. Production V3 is not imported or initialized.
The prototype reads the existing configuration, geography, typography, monogram,
input helper and theme tokens. Its Three.js scene, camera and controls are separate.
Production `intro-particles-v3.js` uses these same particle/choreography helpers
on the native V3 renderer, camera and globe, with its existing header and footer.

One 29-second GSAP timeline starts after the scene and shaders are ready. `pacing.js`
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

The particle shaders are original code: one shared GPU point cloud morphs between
geographic formation, seeded explosion, two small heart markers, their impact
and a final shatter back onto the actual country-boundary geometry.
The native globe badge's exact Bezier outline is sampled into 180 fine points per
marker. Camera projection keeps them about 22 CSS pixels wide regardless of DPR
or viewport; they never grow into full-sized twin hearts. `sampleHeartPose` drives
their opposing looping paths and preserves approach velocity at the collision.
The impact produces a second particle burst, which reforms the original large
heart for just 0.7 s. The final
world-space morph reaches the original geographic positions before fading into
the native globe. Production then reveals Journey labels without a new entrance.
`original-heart.js` restores the first sampler and point sprite verbatim from
`2f7b1ed75ab0cf6f43b0062870c23631586fdc8f`: approximately 82% shell / 18% interior,
the original random sequence and soft point sprite. The heart alone now has a
1.2 CSS-pixel minimum point diameter and stronger seeded opacity, so it remains
clear on light backgrounds without changing formation, stars or explosion.
Normals from that same implicit surface emphasize the visible particle rim,
with up to 25% larger points and 35% stronger opacity; interior particles remain
unchanged. This is view-dependent shell shading, not a drawn outline or extra layer.
Its width stays X ×0.90, while a smooth Y ×0.76–0.90 taper shortens the lower half;
the complete refined Y coordinate is then scaled ×1.04 to restore a little height.
Z ×0.86 retains depth, with a 0.042-unit cleft and 0.016-unit tip correction.
The resulting width/height ratio is about 1.08, inside the unchanged camera framing.
The heart uses 10,000 points on constrained devices,
22,000 on mobile and 33,000 on desktop for the large heart. The small-marker phase
draws only 360 points in total, avoiding an opaque blob at icon size. A slow 25-degree spatial turn and gentle
1.8% breathing reveal the original volume. Formation uses adaptive
16,000 / 42,000 / 60,000 points, while explosion retains its existing
12,000 / 30,000 / 45,000 budget; the impact briefly swirls the same particles into
clouds before they gather. All formation points return with a gradual opacity
ramp during the final shatter. No solid heart mesh or duplicated scene is introduced.
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
