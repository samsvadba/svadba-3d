import './style.css'

const root = document.documentElement

const hero = document.querySelector('.hero')
const editorial = document.querySelector('.editorial')
const florence = document.querySelector('.florence')
const wedding = document.querySelector('.wedding')

const heroPhotos = document.querySelectorAll('.hero-photo')
const editorialPhotos = document.querySelectorAll('.editorial-photo')

const reducedMotion = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
)

let ticking = false
let pointerX = 0
let pointerY = 0

/* =========================================================
   HELPERS
========================================================= */

function clamp(value, min = 0, max = 1) {
  return Math.min(
    Math.max(value, min),
    max
  )
}

function getSectionProgress(section) {
  if (!section) return 0

  const rect =
    section.getBoundingClientRect()

  const scrollable =
    section.offsetHeight -
    window.innerHeight

  if (scrollable <= 0) {
    return 0
  }

  const travelled =
    -rect.top

  return clamp(
    travelled / scrollable
  )
}

/* =========================================================
   CSS VARIABLES
========================================================= */

function updateProgress() {
  ticking = false

  const heroProgress =
    getSectionProgress(hero)

  const editorialProgress =
    getSectionProgress(editorial)

  const florenceProgress =
    getSectionProgress(florence)

  const weddingProgress =
    wedding
      ? clamp(
          (
            window.innerHeight -
            wedding.getBoundingClientRect().top
          ) /
          (
            window.innerHeight +
            wedding.offsetHeight
          )
        )
      : 0

  root.style.setProperty(
    '--hero-progress',
    heroProgress.toFixed(4)
  )

  root.style.setProperty(
    '--editorial-progress',
    editorialProgress.toFixed(4)
  )

  root.style.setProperty(
    '--florence-progress',
    florenceProgress.toFixed(4)
  )

  root.style.setProperty(
    '--wedding-progress',
    weddingProgress.toFixed(4)
  )

  if (
    !reducedMotion.matches &&
    window.innerWidth > 700
  ) {
    updatePointerMotion()
  }
}

function requestUpdate() {
  if (ticking) return

  ticking = true

  requestAnimationFrame(
    updateProgress
  )
}

/* =========================================================
   POINTER PARALLAX
========================================================= */

function updatePointerMotion() {
  const x =
    pointerX * 14

  const y =
    pointerY * 10

  heroPhotos.forEach(
    (photo, index) => {

      const depth =
        index + 1

      photo.style.setProperty(
        '--pointer-x',
        `${x * depth * 0.22}px`
      )

      photo.style.setProperty(
        '--pointer-y',
        `${y * depth * 0.18}px`
      )
    }
  )

  editorialPhotos.forEach(
    (photo, index) => {

      const depth =
        index + 1

      photo.style.setProperty(
        '--pointer-x',
        `${x * depth * 0.12}px`
      )

      photo.style.setProperty(
        '--pointer-y',
        `${y * depth * 0.1}px`
      )
    }
  )
}

window.addEventListener(
  'pointermove',
  event => {

    pointerX =
      (
        event.clientX /
        window.innerWidth
      ) * 2 - 1

    pointerY =
      (
        event.clientY /
        window.innerHeight
      ) * 2 - 1

    requestUpdate()
  },
  {
    passive: true
  }
)

/* =========================================================
   IMAGE REVEAL
========================================================= */

const revealTargets =
  document.querySelectorAll(
    [
      '.hero-photo',
      '.editorial-photo',
      '.story-intro',
      '.chapter-transition',
      '.wedding-photo',
      '.wedding-details article'
    ].join(',')
  )

const revealObserver =
  new IntersectionObserver(
    entries => {

      entries.forEach(
        entry => {

          if (
            entry.isIntersecting
          ) {
            entry.target.classList.add(
              'is-visible'
            )
          }

        }
      )

    },
    {
      threshold: 0.15
    }
  )

revealTargets.forEach(
  element => {
    revealObserver.observe(
      element
    )
  }
)

/* =========================================================
   HEADER STATE
========================================================= */

const header =
  document.querySelector(
    '.site-header'
  )

function updateHeader() {
  if (!header) return

  const florenceRect =
    florence?.getBoundingClientRect()

  const footer =
    document.querySelector(
      '.footer'
    )

  const footerRect =
    footer?.getBoundingClientRect()

  const insideDarkSection =
    (
      florenceRect &&
      florenceRect.top <
        window.innerHeight * 0.35 &&
      florenceRect.bottom >
        window.innerHeight * 0.35
    )
    ||
    (
      footerRect &&
      footerRect.top <
        window.innerHeight * 0.35
    )

  header.classList.toggle(
    'over-dark',
    Boolean(
      insideDarkSection
    )
  )
}

/* =========================================================
   SMOOTH ANCHORS
========================================================= */

document
  .querySelectorAll(
    'a[href^="#"]'
  )
  .forEach(link => {

    link.addEventListener(
      'click',
      event => {

        const targetId =
          link.getAttribute(
            'href'
          )

        if (
          !targetId ||
          targetId === '#'
        ) {
          return
        }

        const target =
          document.querySelector(
            targetId
          )

        if (!target) return

        event.preventDefault()

        target.scrollIntoView({
          behavior:
            reducedMotion.matches
              ? 'auto'
              : 'smooth',

          block:
            'start'
        })

      }
    )

  })

/* =========================================================
   SCROLL LOOP
========================================================= */

function onScroll() {
  requestUpdate()
  updateHeader()
}

window.addEventListener(
  'scroll',
  onScroll,
  {
    passive: true
  }
)

window.addEventListener(
  'resize',
  requestUpdate,
  {
    passive: true
  }
)

reducedMotion.addEventListener(
  'change',
  requestUpdate
)

/* =========================================================
   INITIAL STATE
========================================================= */

updateProgress()
updateHeader()

window.addEventListener(
  'load',
  () => {

    document.body.classList.add(
      'is-loaded'
    )

    updateProgress()

  }
)
