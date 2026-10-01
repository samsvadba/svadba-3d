@import url(
  'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@300;400;500&display=swap'
);

:root {
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  color:
    #f8f3e9;

  background:
    #8d887b;

  font-synthesis:
    none;

  text-rendering:
    optimizeLegibility;

  --cream:
    #f7f0e3;

  --gold:
    #d6b578;

  --dark:
    #29281f;
}

* {
  box-sizing:
    border-box;
}

html {
  margin: 0;

  background:
    #8d887b;

  scroll-behavior:
    smooth;
}

body {
  margin: 0;

  min-width:
    320px;

  overflow-x:
    hidden;

  background:
    #8d887b;

  color:
    var(--cream);
}

body::-webkit-scrollbar {
  width:
    5px;
}

body::-webkit-scrollbar-track {
  background:
    #7c786d;
}

body::-webkit-scrollbar-thumb {
  background:
    rgba(
      255,
      245,
      225,
      0.35
    );

  border-radius:
    999px;
}

::selection {
  color:
    #27251f;

  background:
    rgba(
      236,
      208,
      158,
      0.88
    );
}

/* =========================================================
   EXPERIENCE
========================================================= */

.experience {
  position:
    relative;

  width:
    100%;

  height:
    400vh;

  background:
    #898579;

  isolation:
    isolate;
}

/* =========================================================
   THREE.JS CANVAS
========================================================= */

#scene {
  position:
    sticky;

  top:
    0;

  z-index:
    1;

  display:
    block;

  width:
    100%;

  height:
    100svh;

  outline:
    none;

  touch-action:
    pan-y;
}

/* =========================================================
   FILM OVERLAYS
========================================================= */

.film-vignette {
  position:
    sticky;

  top:
    0;

  z-index:
    3;

  width:
    100%;

  height:
    100svh;

  margin-top:
    -100svh;

  pointer-events:
    none;

  background:

    linear-gradient(
      180deg,

      rgba(
        34,
        30,
        22,
        0.15
      )
      0%,

      transparent
      22%,

      transparent
      70%,

      rgba(
        35,
        30,
        22,
        0.2
      )
      100%
    ),

    radial-gradient(
      ellipse
      at center,

      transparent
      50%,

      rgba(
        40,
        34,
        25,
        0.13
      )
      74%,

      rgba(
        30,
        26,
        20,
        0.32
      )
      100%
    );
}

.film-grain {
  position:
    sticky;

  top:
    0;

  z-index:
    4;

  width:
    100%;

  height:
    100svh;

  margin-top:
    -100svh;

  pointer-events:
    none;

  opacity:
    0.12;

  mix-blend-mode:
    soft-light;

  background-image:

    radial-gradient(
      circle
      at 20% 30%,

      rgba(
        255,
        255,
        255,
        0.7
      )
      0 0.5px,

      transparent
      0.7px
    ),

    radial-gradient(
      circle
      at 75% 60%,

      rgba(
        25,
        20,
        15,
        0.65
      )
      0 0.5px,

      transparent
      0.75px
    );

  background-size:
    5px 5px,
    7px 7px;

  animation:
    grain-shift
    0.24s
    steps(2)
    infinite;
}

@keyframes grain-shift {

  0% {
    transform:
      translate(
        0,
        0
      );
  }

  25% {
    transform:
      translate(
        -1px,
        1px
      );
  }

  50% {
    transform:
      translate(
        1px,
        -1px
      );
  }

  75% {
    transform:
      translate(
        1px,
        1px
      );
  }

  100% {
    transform:
      translate(
        0,
        0
      );
  }

}

/* =========================================================
   LOCATION LABELS
========================================================= */

.world-label {
  position:
    sticky;

  top:
    0;

  z-index:
    8;

  width:
    max-content;

  height:
    0;

  pointer-events:
    none;

  opacity:
    0;

  transform:
    translate(
      -50%,
      -50%
    );
}

.world-label--martin {
  left:
    25%;

  top:
    48svh;
}

.world-label--simona {
  left:
    75%;

  top:
    52svh;
}

.world-label span,
.world-label strong {
  display:
    block;

  text-align:
    center;
}

.world-label span {
  margin-bottom:
    5px;

  font-size:
    9px;

  font-weight:
    400;

  letter-spacing:
    0.3em;

  text-transform:
    uppercase;

  color:
    rgba(
      255,
      248,
      235,
      0.68
    );
}

.world-label strong {
  font-family:
    "Cormorant Garamond",
    Georgia,
    serif;

  font-size:
    24px;

  font-weight:
    400;

  font-style:
    italic;

  letter-spacing:
    0.01em;

  color:
    rgba(
      255,
      248,
      237,
      0.96
    );

  text-shadow:
    0 2px 16px
    rgba(
      35,
      30,
      22,
      0.3
    );
}

/* =========================================================
   STORY
========================================================= */

.story {
  position:
    absolute;

  inset:
    0;

  z-index:
    10;

  pointer-events:
    none;
}

.chapter {
  position:
    relative;

  width:
    100%;

  height:
    100vh;

  min-height:
    100svh;

  display:
    flex;

  align-items:
    center;

  padding:
    clamp(
      26px,
      7vw,
      110px
    );
}

.chapter__inner {
  width:
    min(
      660px,
      88vw
    );

  opacity:
    0;

  transform:
    translateY(
      32px
    );

  text-shadow:
    0 3px 28px
    rgba(
      30,
      28,
      20,
      0.2
    );
}

.chapter__inner--center {
  margin:
    0 auto;

  text-align:
    center;
}

.chapter__inner--right {
  margin-left:
    auto;

  text-align:
    right;
}

/* =========================================================
   TYPOGRAPHY
========================================================= */

h1,
h2 {
  margin:
    0;

  font-family:
    "Cormorant Garamond",
    Georgia,
    serif;

  font-weight:
    400;

  letter-spacing:
    -0.045em;

  line-height:
    0.92;

  text-wrap:
    balance;

  color:
    #fff9ee;
}

h1 {
  font-size:
    clamp(
      72px,
      11vw,
      158px
    );
}

h2 {
  font-size:
    clamp(
      58px,
      8vw,
      118px
    );
}

p {
  margin:
    1.5rem 0 0;

  max-width:
    43ch;

  font-size:
    clamp(
      14px,
      1.1vw,
      17px
    );

  font-weight:
    300;

  line-height:
    1.75;

  color:
    rgba(
      255,
      248,
      236,
      0.74
    );
}

.chapter__inner--center p {
  margin-left:
    auto;

  margin-right:
    auto;
}

.chapter__inner--right p {
  margin-left:
    auto;
}

.eyebrow {
  margin:
    0 0 1.15rem;

  font-size:
    9px;

  font-weight:
    400;

  letter-spacing:
    0.35em;

  text-transform:
    uppercase;

  color:
    rgba(
      255,
      240,
      210,
      0.74
    );
}

.date {
  margin-top:
    1.7rem !important;

  font-size:
    11px;

  letter-spacing:
    0.3em;

  text-transform:
    uppercase;

  color:
    rgba(
      255,
      244,
      223,
      0.7
    );
}

.hint {
  position:
    relative;

  display:
    inline-flex;

  align-items:
    center;

  gap:
    10px;

  margin-top:
    3rem !important;

  font-size:
    9px;

  letter-spacing:
    0.25em;

  text-transform:
    uppercase;

  color:
    rgba(
      255,
      249,
      238,
      0.48
    );
}

.hint::after {
  content:
    "";

  width:
    36px;

  height:
    1px;

  background:
    linear-gradient(
      90deg,

      rgba(
        255,
        240,
        211,
        0.5
      ),

      transparent
    );
}

/* =========================================================
   CHAPTER SPECIFIC
========================================================= */

.chapter--1 {
  align-items:
    center;
}

.chapter--1
.chapter__inner {
  transform:
    translateY(
      14px
    );
}

.chapter--2 {
  align-items:
    center;
}

.chapter--3 {
  align-items:
    center;
}

.chapter--4 {
  align-items:
    center;
}

/* =========================================================
   NORMAL WEDDING SITE
========================================================= */

.wedding-site {
  position:
    relative;

  z-index:
    20;

  min-height:
    100svh;

  display:
    grid;

  place-items:
    center;

  padding:
    clamp(
      70px,
      10vw,
      150px
    );

  color:
    #2d2a22;

  background:

    radial-gradient(
      circle
      at 50% 0%,

      rgba(
        225,
        204,
        164,
        0.36
      ),

      transparent
      34%
    ),

    linear-gradient(
      180deg,

      #f4eee3
      0%,

      #ece3d4
      100%
    );
}

.wedding-site::before {
  content:
    "";

  position:
    absolute;

  top:
    0;

  left:
    50%;

  width:
    1px;

  height:
    80px;

  transform:
    translateX(
      -50%
    );

  background:
    linear-gradient(
      to bottom,

      transparent,

      rgba(
        70,
        61,
        47,
        0.28
      )
    );
}

.wedding-site__inner {
  width:
    min(
      920px,
      92vw
    );

  text-align:
    center;
}

.wedding-site h2 {
  color:
    #302c24;

  font-size:
    clamp(
      62px,
      9vw,
      128px
    );
}

.wedding-site p {
  margin-left:
    auto;

  margin-right:
    auto;

  color:
    rgba(
      48,
      44,
      36,
      0.68
    );
}

.wedding-site
.eyebrow {
  color:
    rgba(
      77,
      68,
      54,
      0.55
    );
}

/* =========================================================
   MOBILE
========================================================= */

@media
(max-width: 700px) {

  .experience {
    height:
      400svh;
  }

  .chapter {
    min-height:
      100svh;

    padding:
      8vw 7vw;
  }

  .chapter__inner,
  .chapter__inner--right {
    width:
      88vw;

    margin-left:
      0;

    text-align:
      left;
  }

  .chapter__inner--center {
    margin-left:
      auto;

    margin-right:
      auto;

    text-align:
      center;
  }

  h1 {
    font-size:
      clamp(
        70px,
        21vw,
        105px
      );
  }

  h2 {
    font-size:
      clamp(
        52px,
        16vw,
        82px
      );
  }

  p {
    max-width:
      34ch;

    font-size:
      14px;
  }

  .eyebrow {
    font-size:
      8px;

    letter-spacing:
      0.28em;
  }

  .world-label--martin {
    left:
      24%;
  }

  .world-label--simona {
    left:
      76%;
  }

  .world-label strong {
    font-size:
      20px;
  }

  .world-label span {
    font-size:
      8px;
  }

  .film-grain {
    opacity:
      0.075;
  }

}

/* =========================================================
   REDUCED MOTION
========================================================= */

@media
(prefers-reduced-motion: reduce) {

  html {
    scroll-behavior:
      auto;
  }

  .film-grain {
    animation:
      none;
  }

  .chapter__inner {
    transform:
      none !important;
  }

}