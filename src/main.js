import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './style.css'

gsap.registerPlugin(ScrollTrigger)

const experience = document.querySelector('#experience')
const story = document.querySelector('.story')

const world = document.createElement('div')
world.className = 'cinematic-world'

world.innerHTML = `
  <div class="florence-film" aria-hidden="true">
    <div class="florence-layer florence-layer--back"></div>
    <div class="florence-layer florence-layer--mid"></div>
    <div class="florence-layer florence-layer--front"></div>

    <div class="florence-light"></div>

    <div class="florence-cloud florence-cloud--a"></div>
    <div class="florence-cloud florence-cloud--b"></div>

    <div class="florence-bokeh"></div>
    <div class="florence-shade"></div>
  </div>

  <div class="night-dust"></div>

  <svg
    class="love-paths"
    viewBox="0 0 100 100"
    preserveAspectRatio="none"
    aria-hidden="true"
  >
    <path
      class="love-path love-path--martin"
      d="M 7 50 C 22 34, 34 31, 49 40"
    />

    <path
      class="love-path love-path--simona"
      d="M 93 54 C 78 36, 65 32, 51 40"
    />

    <path
      class="love-path love-path--together"
      d="M 50 40 C 57 31, 66 22, 76 20 C 84 19, 89 22, 94 27"
    />
  </svg>

  <div class="love-star love-star--martin">
    <span class="love-star__glow"></span>
    <span class="love-star__core"></span>

    <span class="love-star__label">
      <strong>Hlohovec</strong>
      <small>Martin</small>
    </span>
  </div>

  <div class="love-star love-star--simona">
    <span class="love-star__glow"></span>
    <span class="love-star__core"></span>

    <span class="love-star__label">
      <strong>Cífer</strong>
      <small>Simona</small>
    </span>
  </div>

  <div class="love-pulse"></div>
`

experience.insertBefore(
  world,
  story
)

const florenceUrl =
  'https://images.unsplash.com/photo-1758940886891-4ca718a3b1ff?auto=format&fit=crop&fm=jpg&q=86&w=2400'

world
  .querySelectorAll('.florence-layer')
  .forEach((el) => {
    el.style.backgroundImage =
      `url("${florenceUrl}")`
  })

const film =
  world.querySelector(
    '.florence-film'
  )

const back =
  world.querySelector(
    '.florence-layer--back'
  )

const mid =
  world.querySelector(
    '.florence-layer--mid'
  )

const front =
  world.querySelector(
    '.florence-layer--front'
  )

const light =
  world.querySelector(
    '.florence-light'
  )

const clouds =
  world.querySelectorAll(
    '.florence-cloud'
  )

const bokeh =
  world.querySelector(
    '.florence-bokeh'
  )

const martin =
  world.querySelector(
    '.love-star--martin'
  )

const simona =
  world.querySelector(
    '.love-star--simona'
  )

const labels =
  world.querySelectorAll(
    '.love-star__label'
  )

const pulse =
  world.querySelector(
    '.love-pulse'
  )

const pathMartin =
  world.querySelector(
    '.love-path--martin'
  )

const pathSimona =
  world.querySelector(
    '.love-path--simona'
  )

const pathTogether =
  world.querySelector(
    '.love-path--together'
  )

function preparePath(path) {
  const length =
    path.getTotalLength()

  path.style.strokeDasharray =
    length

  path.style.strokeDashoffset =
    length
}

[
  pathMartin,
  pathSimona,
  pathTogether
].forEach(
  preparePath
)

gsap.set(
  film,
  {
    autoAlpha: 0
  }
)

gsap.set(
  back,
  {
    scale: 1.03
  }
)

gsap.set(
  mid,
  {
    scale: 1.08,
    yPercent: 1.5
  }
)

gsap.set(
  front,
  {
    scale: 1.14,
    yPercent: 3
  }
)

gsap.set(
  [
    martin,
    simona
  ],
  {
    autoAlpha: 0,
    scale: 0.78
  }
)

gsap.set(
  martin,
  {
    left: '8%',
    top: '49%'
  }
)

gsap.set(
  simona,
  {
    left: '92%',
    top: '54%'
  }
)

gsap.set(
  pulse,
  {
    left: '50%',
    top: '40%',
    autoAlpha: 0,
    scale: 0.2
  }
)

/* =========================================
   TEXT
========================================= */

const chapters =
  gsap.utils.toArray(
    '.chapter__inner'
  )

chapters.forEach(
  (chapter) => {

    gsap.fromTo(
      chapter,

      {
        opacity: 0,
        y: 34
      },

      {
        opacity: 1,
        y: 0,
        ease: 'none',

        scrollTrigger: {
          trigger:
            chapter.parentElement,

          start:
            'top 74%',

          end:
            'center 53%',

          scrub: true
        }
      }
    )

    gsap.to(
      chapter,

      {
        opacity: 0,
        y: -24,
        ease: 'none',

        scrollTrigger: {
          trigger:
            chapter.parentElement,

          start:
            'center 43%',

          end:
            'bottom 20%',

          scrub: true
        }
      }
    )

  }
)

/* =========================================
   HLAVNÝ PRÍBEH
========================================= */

const tl =
  gsap.timeline({

    defaults: {
      ease:
        'power2.inOut'
    },

    scrollTrigger: {
      trigger:
        '#experience',

      start:
        'top top',

      end:
        'bottom bottom',

      scrub: 1.2
    }

  })

/* dve hviezdy */

tl.to(
  [
    martin,
    simona
  ],
  {
    autoAlpha: 1,
    scale: 1,
    duration: 0.3
  },
  0.62
)

/* ich dve cesty */

.to(
  [
    pathMartin,
    pathSimona
  ],
  {
    strokeDashoffset: 0,
    duration: 0.85,
    ease: 'none'
  },
  0.88
)

/* Martin ide zo svojho smeru */

.to(
  martin,
  {
    left: '48.2%',
    top: '39%',
    duration: 1
  },
  1.02
)

/* Simona zo svojho */

.to(
  simona,
  {
    left: '51.8%',
    top: '41%',
    duration: 1
  },
  1.02
)

/* Hlohovec/Cífer zmiznú */

.to(
  labels,
  {
    autoAlpha: 0,
    y: 9,
    duration: 0.3
  },
  1.48
)

/* stretnutie */

.to(
  pulse,
  {
    autoAlpha: 0.9,
    scale: 1,
    duration: 0.3
  },
  1.64
)

.to(
  pulse,
  {
    autoAlpha: 0,
    scale: 2.2,
    duration: 0.48
  },
  1.84
)

/* =========================================
   FLORENCIA
========================================= */

.to(
  film,
  {
    autoAlpha: 1,
    duration: 0.72
  },
  1.72
)

/* najvzdialenejšia vrstva */

.to(
  back,
  {
    scale: 1.09,
    xPercent: -1,
    yPercent: -1,

    duration: 1.75,

    ease:
      'power1.inOut'
  },
  1.74
)

/* stred mesta */

.to(
  mid,
  {
    scale: 1.15,
    xPercent: 1.3,
    yPercent: -2.5,

    duration: 1.75,

    ease:
      'power1.inOut'
  },
  1.74
)

/* popredie */

.to(
  front,
  {
    scale: 1.23,
    xPercent: 2.2,
    yPercent: -4.2,

    duration: 1.75,

    ease:
      'power1.inOut'
  },
  1.74
)

/* zapadajúce slnko */

.to(
  light,
  {
    opacity: 0.66,
    duration: 0.7
  },
  1.82
)

/* oblaky */

.to(
  clouds,
  {
    opacity: 0.8,
    duration: 0.9
  },
  1.82
)

/* svetielka */

.to(
  bokeh,
  {
    opacity: 0.66,
    duration: 0.85
  },
  1.9
)

/* obe hviezdy už idú spolu */

.to(
  martin,
  {
    left: '43%',
    top: '25%',
    scale: 0.82,
    duration: 0.9
  },
  2
)

.to(
  simona,
  {
    left: '47%',
    top: '27%',
    scale: 0.82,
    duration: 0.9
  },
  2
)

/* spoločná dráha */

.to(
  pathTogether,
  {
    strokeDashoffset: 0,
    duration: 1,
    ease: 'none'
  },
  2
)

/* let nad Florenciou */

.to(
  martin,
  {
    left: '74%',
    top: '19%',
    scale: 0.68,
    duration: 1
  },
  2.42
)

.to(
  simona,
  {
    left: '78%',
    top: '22%',
    scale: 0.68,
    duration: 1
  },
  2.42
)

/* =========================================
   POVEDALA ÁNO
========================================= */

.set(
  pulse,
  {
    left: '76%',
    top: '21%',
    scale: 0.2
  },
  2.75
)

.to(
  pulse,
  {
    autoAlpha: 0.95,
    scale: 0.9,
    duration: 0.28
  },
  2.78
)

.to(
  pulse,
  {
    autoAlpha: 0,
    scale: 2.7,
    duration: 0.55
  },
  3
)

/* =========================================
   ODCHOD Z FLORENCIE
========================================= */

.to(
  film,
  {
    autoAlpha: 0,
    scale: 1.02,
    duration: 0.72
  },
  3.08
)

.to(
  [
    martin,
    simona
  ],
  {
    left: '50%',
    top: '45%',
    autoAlpha: 0.18,
    scale: 0.5,
    duration: 0.72
  },
  3.08
)

.to(
  [
    pathMartin,
    pathSimona,
    pathTogether
  ],
  {
    opacity: 0,
    duration: 0.5
  },
  3.08
)

/* priestor pre ďalšie kapitoly */

.to(
  {},
  {
    duration: 2.2
  },
  3.7
)

/* =========================================
   JEMNÝ POHYB MYŠOU NA PC
========================================= */

if (
  window.matchMedia(
    '(pointer: fine)'
  ).matches
) {

  window.addEventListener(
    'pointermove',
    (e) => {

      const x =
        (
          e.clientX /
          window.innerWidth -
          0.5
        ) * 2

      const y =
        (
          e.clientY /
          window.innerHeight -
          0.5
        ) * 2

      world.style.setProperty(
        '--mx',
        `${x * 5}px`
      )

      world.style.setProperty(
        '--my',
        `${y * 4}px`
      )

    }
  )

}

window.addEventListener(
  'resize',
  () => {
    ScrollTrigger.refresh()
  }
)

const preload =
  new Image()

preload.src =
  florenceUrl

preload.onload =
  () => {
    ScrollTrigger.refresh()
  }