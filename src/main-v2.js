import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { gsap } from 'gsap'


/* =========================================================
   CONFIG
========================================================= */

const config =
  window.WeddingApp?.config || {}

const translations =
  config.translations?.sk || {}

const locations =
  config.locations || []

const GLOBE_RADIUS =
  config.GLOBE_RADIUS || 12

const BASE =
  import.meta.env.BASE_URL

const WEDDING_URL =
  'https://samsvadba.github.io/svadba/'


/* =========================================================
   DOM
========================================================= */

const body =
  document.body

const preloader =
  document.getElementById(
    'interactive-preloader'
  )

const loadingRing =
  document.getElementById(
    'loading-ring'
  )

const preloaderPercentage =
  document.getElementById(
    'preloader-percentage'
  )

const preloaderSkip =
  document.getElementById(
    'pl-skip-btn'
  )


const introOverlay =
  document.getElementById(
    'intro-overlay'
  )

const introOpening =
  document.getElementById(
    'intro-opening'
  )

const introStory =
  document.getElementById(
    'intro-story'
  )

const introPoster =
  document.getElementById(
    'intro-poster'
  )

const introVideo =
  document.getElementById(
    'intro-video-bg'
  )

const nextBtn =
  document.getElementById(
    'next-btn'
  )


const transitionScreen =
  document.getElementById(
    'transition-screen'
  )

const finalTransitionScreen =
  document.getElementById(
    'final-transition-screen'
  )

const journeyScene =
  document.getElementById(
    'journey-scene'
  )

const canvas =
  document.getElementById(
    'three-canvas'
  )

const svgCanvas =
  document.getElementById(
    'svg-canvas'
  )

const labelLayer =
  document.getElementById(
    'label-layer'
  )

const journeyInstruction =
  document.getElementById(
    'journey-instruction'
  )


const modal =
  document.getElementById(
    'modal'
  )

const modalImage =
  document.getElementById(
    'modal-image'
  )

const modalInstagram =
  document.getElementById(
    'modal-instagram'
  )

const modalCity =
  document.getElementById(
    'modal-city'
  )

const modalLocation =
  document.getElementById(
    'modal-location'
  )

const modalClose =
  document.getElementById(
    'video-stop-btn'
  )

const modalSkip =
  document.getElementById(
    'video-skip-btn'
  )


const weddingHandoff =
  document.getElementById(
    'wedding-handoff'
  )


const navIntro =
  document.getElementById(
    'nav-intro'
  )

const navJourney =
  document.getElementById(
    'nav-journey'
  )

const navWedding =
  document.getElementById(
    'nav-wedding'
  )

const navFill =
  document.getElementById(
    'nav-fill'
  )

const navDots = [
  document.getElementById('dot-1'),
  document.getElementById('dot-2'),
  document.getElementById('dot-3')
]


const headerHome =
  document.getElementById(
    'header-home'
  )

const muteBtn =
  document.getElementById(
    'mute-btn'
  )

const bgm =
  document.getElementById(
    'bgm'
  )


/* =========================================================
   STATE
========================================================= */

const reducedMotion =
  window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  ).matches

const mobileQuery =
  window.matchMedia(
    '(max-width: 767px)'
  )

let isMobile =
  mobileQuery.matches

let mode =
  'intro'

let transitionRunning =
  false

let introTimeline =
  null

let transitionTimeline =
  null

let finalTimeline =
  null

let selectedIndex =
  -1

let userMovedGlobe =
  false

const visited =
  new Set()


/* =========================================================
   TRANSLATIONS
========================================================= */

function applyTranslations() {

  document
    .querySelectorAll('[data-t]')
    .forEach(element => {

      const key =
        element.dataset.t

      if (
        key &&
        translations[key]
      ) {

        element.innerHTML =
          translations[key]

      }

    })

}

applyTranslations()


/* =========================================================
   ASSET PATH
========================================================= */

function resolveMedia(path) {

  if (!path)
    return ''

  if (
    /^https?:\/\//i.test(path)
  ) {

    return path

  }

  return (
    BASE +
    path.replace(/^\/+/, '')
  )

}


/* =========================================================
   PRELOADER
========================================================= */

let loadingFinished =
  false

let progress =
  0


const progressTimer =
  window.setInterval(() => {

    if (
      progress >= 91 ||
      loadingFinished
    )
      return

    progress +=
      1 + Math.random() * 4

    progress =
      Math.min(progress, 91)

    updatePreloader(progress)

  }, 60)


function updatePreloader(value) {

  const safe =
    Math.min(
      100,
      Math.max(0, value)
    )

  if (loadingRing) {

    loadingRing.style.setProperty(
      '--p',
      `${safe}%`
    )

  }

  if (preloaderPercentage) {

    preloaderPercentage.textContent =
      `${Math.floor(safe)}%`

  }

}


function waitForPoster() {

  if (
    !introPoster ||
    introPoster.complete
  ) {

    return Promise.resolve()

  }

  return new Promise(resolve => {

    const done =
      () => resolve()

    introPoster.addEventListener(
      'load',
      done,
      { once: true }
    )

    introPoster.addEventListener(
      'error',
      done,
      { once: true }
    )

    setTimeout(
      done,
      1600
    )

  })

}


async function preparePage() {

  const tasks = [
    waitForPoster()
  ]

  if (
    document.fonts?.ready
  ) {

    tasks.push(
      document.fonts.ready
    )

  }

  await Promise.race([

    Promise.all(tasks),

    new Promise(resolve => {

      setTimeout(
        resolve,
        1800
      )

    })

  ])

  finishLoading()

}


function finishLoading() {

  if (loadingFinished)
    return

  loadingFinished = true

  clearInterval(
    progressTimer
  )

  updatePreloader(100)

  setTimeout(() => {

    body.classList.remove(
      'loading'
    )

    if (preloader) {

      gsap.to(
        preloader,
        {
          opacity: 0,
          duration:
            reducedMotion
              ? 0.01
              : 0.45,

          ease:
            'power2.out',

          onComplete: () => {

            preloader.remove()

          }
        }
      )

    }

    playIntro()

  }, reducedMotion ? 10 : 180)

}


if (preloaderSkip) {

  setTimeout(() => {

    preloaderSkip
      .classList
      .add('visible')

  }, 700)


  preloaderSkip.addEventListener(
    'click',
    event => {

      event.stopPropagation()

      finishLoading()

    }
  )

}


preparePage()


/* =========================================================
   INTRO
========================================================= */

function killIntroTimeline() {

  if (introTimeline) {

    introTimeline.kill()

    introTimeline = null

  }

}


function resetIntroElements() {

  killIntroTimeline()

  gsap.killTweensOf(
    [
      introOverlay,
      introOpening,
      '.sub-line',
      '.title-layout'
    ]
  )

  gsap.set(
    introOverlay,
    {
      autoAlpha: 1
    }
  )

  gsap.set(
    introOpening,
    {
      autoAlpha: 1
    }
  )

  gsap.set(
    '.sub-line',
    {
      opacity: 0
    }
  )

  gsap.set(
    '.title-layout',
    {
      opacity: 0
    }
  )

  gsap.set(
    nextBtn,
    {
      pointerEvents: 'none'
    }
  )

}


function playIntro() {

  mode =
    'intro'

  transitionRunning =
    false

  body.classList.remove(
    'journey-mode',
    'section-transition-active',
    'wedding-trans-active'
  )

  body.classList.add(
    'intro-mode'
  )

  setActiveNav(
    'intro'
  )

  closeModal(
    false
  )

  journeyInstruction
    ?.classList
    .remove('blinking')

  resetIntroElements()


  if (reducedMotion) {

    gsap.set(
      introOpening,
      {
        autoAlpha: 0
      }
    )

    gsap.set(
      '.title-layout',
      {
        opacity: 1
      }
    )

    gsap.set(
      nextBtn,
      {
        pointerEvents: 'auto'
      }
    )

    return

  }


  const line1 =
    document.querySelector(
      '[data-t="introLine1"]'
    )

  const line2 =
    document.querySelector(
      '[data-t="introLine2"]'
    )


  introTimeline =
    gsap.timeline()


  introTimeline

    .fromTo(
      '.intro-main-title',
      {
        opacity: 0,
        y: 18
      },
      {
        opacity: 1,
        y: 0,
        duration: 1.25,
        ease: 'power3.out'
      }
    )

    .fromTo(
      '#intro-opening > p',
      {
        opacity: 0,
        y: 10
      },
      {
        opacity: 0.8,
        y: 0,
        duration: 0.9,
        ease: 'power2.out'
      },
      '-=0.75'
    )

    .to(
      {},
      {
        duration: 1.25
      }
    )

    .to(
      introOpening,
      {
        autoAlpha: 0,
        duration: 0.8,
        ease: 'power2.inOut'
      }
    )

    .to(
      line1,
      {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.inOut'
      }
    )

    .to(
      line1,
      {
        opacity: 0,
        duration: 0.7,
        delay: 0.85,
        ease: 'power2.inOut'
      }
    )

    .to(
      line2,
      {
        opacity: 1,
        duration: 0.8,
        ease: 'power2.inOut'
      }
    )

    .to(
      line2,
      {
        opacity: 0,
        duration: 0.7,
        delay: 0.85,
        ease: 'power2.inOut'
      }
    )

    .to(
      '.title-layout',
      {
        opacity: 1,
        duration: 1.25,
        ease: 'power2.out'
      }
    )

    .set(
      nextBtn,
      {
        pointerEvents: 'auto'
      },
      '<'
    )

}


/* =========================================================
   INTRO PARALLAX
========================================================= */

document.addEventListener(
  'pointermove',
  event => {

    if (
      mode !== 'intro' ||
      isMobile
    )
      return

    const x =
      (
        event.clientX /
        window.innerWidth -
        0.5
      ) * -14

    const y =
      (
        event.clientY /
        window.innerHeight -
        0.5
      ) * -10

    gsap.to(
      [
        introPoster,
        introVideo
      ],
      {
        x,
        y,
        duration: 1.1,
        ease: 'power2.out',
        overwrite: true
      }
    )

  }
)


/* =========================================================
   THREE.JS
========================================================= */

let scene
let camera
let renderer
let controls

let globeGroup
let gridGroup
let markerGroup

let globeReady =
  false

let animationFrame =
  null

const markerData =
  []

const raycaster =
  new THREE.Raycaster()

const pointer =
  new THREE.Vector2()

const worldTemp =
  new THREE.Vector3()


function latLonToVector3(
  lat,
  lon,
  radius = GLOBE_RADIUS
) {

  const phi =
    THREE.MathUtils.degToRad(
      90 - lat
    )

  const theta =
    THREE.MathUtils.degToRad(
      lon + 180
    )

  return new THREE.Vector3(

    -radius *
    Math.sin(phi) *
    Math.cos(theta),

    radius *
    Math.cos(phi),

    radius *
    Math.sin(phi) *
    Math.sin(theta)

  )

}


/* =========================================================
   GLOBE GRID
========================================================= */

function createGlobeGrid() {

  gridGroup =
    new THREE.Group()


  const normalMaterial =
    new THREE.LineBasicMaterial({
      color: 0x6f736b,
      transparent: true,
      opacity: 0.095,
      depthWrite: false
    })


  const strongMaterial =
    new THREE.LineBasicMaterial({
      color: 0x5c6058,
      transparent: true,
      opacity: 0.15,
      depthWrite: false
    })


  for (
    let latitude = -75;
    latitude <= 75;
    latitude += 15
  ) {

    const points = []

    for (
      let longitude = -180;
      longitude <= 180;
      longitude += 3
    ) {

      points.push(
        latLonToVector3(
          latitude,
          longitude,
          GLOBE_RADIUS + 0.012
        )
      )

    }

    const geometry =
      new THREE.BufferGeometry()
        .setFromPoints(points)

    const line =
      new THREE.Line(
        geometry,
        latitude === 0
          ? strongMaterial
          : normalMaterial
      )

    gridGroup.add(line)

  }


  for (
    let longitude = -165;
    longitude < 180;
    longitude += 15
  ) {

    const points = []

    for (
      let latitude = -90;
      latitude <= 90;
      latitude += 3
    ) {

      points.push(
        latLonToVector3(
          latitude,
          longitude,
          GLOBE_RADIUS + 0.012
        )
      )

    }

    const geometry =
      new THREE.BufferGeometry()
        .setFromPoints(points)

    const line =
      new THREE.Line(
        geometry,
        longitude === 0
          ? strongMaterial
          : normalMaterial
      )

    gridGroup.add(line)

  }


  globeGroup.add(
    gridGroup
  )

}


/* =========================================================
   COUNTRY OUTLINES
========================================================= */

async function createCountryOutlines() {

  try {

    const response =
      await fetch(
        'https://cdn.jsdelivr.net/gh/datasets/geo-countries@master/data/countries.geojson'
      )

    if (!response.ok)
      return

    const data =
      await response.json()

    const positions = []


    function addRing(ring) {

      if (
        !Array.isArray(ring) ||
        ring.length < 2
      )
        return


      const stride =
        Math.max(
          1,
          Math.floor(
            ring.length / 180
          )
        )


      for (
        let i = stride;
        i < ring.length;
        i += stride
      ) {

        const previous =
          ring[
            Math.max(
              0,
              i - stride
            )
          ]

        const current =
          ring[i]


        if (
          !previous ||
          !current
        )
          continue


        const lonA =
          previous[0]

        const latA =
          previous[1]

        const lonB =
          current[0]

        const latB =
          current[1]


        if (
          Math.abs(
            lonA - lonB
          ) > 100
        )
          continue


        const a =
          latLonToVector3(
            latA,
            lonA,
            GLOBE_RADIUS + 0.035
          )

        const b =
          latLonToVector3(
            latB,
            lonB,
            GLOBE_RADIUS + 0.035
          )


        positions.push(
          a.x,
          a.y,
          a.z,
          b.x,
          b.y,
          b.z
        )

      }

    }


    for (
      const feature
      of data.features || []
    ) {

      const geometry =
        feature.geometry

      if (!geometry)
        continue


      if (
        geometry.type ===
        'Polygon'
      ) {

        geometry.coordinates
          .forEach(addRing)

      }


      if (
        geometry.type ===
        'MultiPolygon'
      ) {

        geometry.coordinates
          .forEach(polygon => {

            polygon
              .forEach(addRing)

          })

      }

    }


    if (!positions.length)
      return


    const geometry =
      new THREE.BufferGeometry()

    geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(
        positions,
        3
      )
    )


    const material =
      new THREE.LineBasicMaterial({
        color: 0x555a52,
        transparent: true,
        opacity: 0.24,
        depthWrite: false
      })


    const countries =
      new THREE.LineSegments(
        geometry,
        material
      )


    globeGroup.add(
      countries
    )

  }
  catch (error) {

    console.warn(
      'Country outlines unavailable.',
      error
    )

  }

}


/* =========================================================
   BACKGROUND DOTS
========================================================= */

function createBackgroundDots() {

  const positions = []

  const count =
    isMobile
      ? 80
      : 150


  for (
    let i = 0;
    i < count;
    i++
  ) {

    const radius =
      28 +
      Math.random() * 55

    const theta =
      Math.random() *
      Math.PI * 2

    const phi =
      Math.acos(
        2 * Math.random() - 1
      )


    positions.push(

      radius *
      Math.sin(phi) *
      Math.cos(theta),

      radius *
      Math.cos(phi),

      radius *
      Math.sin(phi) *
      Math.sin(theta)

    )

  }


  const geometry =
    new THREE.BufferGeometry()

  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  )


  const material =
    new THREE.PointsMaterial({
      color: 0x74776f,
      size:
        isMobile
          ? 0.035
          : 0.045,

      transparent: true,
      opacity: 0.22,
      depthWrite: false
    })


  const points =
    new THREE.Points(
      geometry,
      material
    )


  scene.add(
    points
  )

}


/* =========================================================
   DESTINATION MARKERS
========================================================= */

function createMarkers() {

  markerGroup =
    new THREE.Group()

  globeGroup.add(
    markerGroup
  )


  const markerGeometry =
    new THREE.SphereGeometry(
      0.115,
      16,
      16
    )


  const hitGeometry =
    new THREE.SphereGeometry(
      0.48,
      12,
      12
    )


  locations.forEach(
    (location, index) => {

      const position =
        latLonToVector3(
          location.lat,
          location.lon,
          GLOBE_RADIUS + 0.11
        )


      const markerMaterial =
        new THREE.MeshBasicMaterial({
          color: 0x161812
        })


      const marker =
        new THREE.Mesh(
          markerGeometry,
          markerMaterial
        )

      marker.position.copy(
        position
      )

      marker.userData.index =
        index


      markerGroup.add(
        marker
      )


      const hit =
        new THREE.Mesh(
          hitGeometry,
          new THREE.MeshBasicMaterial({
            transparent: true,
            opacity: 0,
            depthWrite: false
          })
        )

      hit.position.copy(
        position
      )

      hit.userData.index =
        index

      markerGroup.add(
        hit
      )


      const label =
        document.createElement(
          'div'
        )

      label.className =
        'label'

      label.textContent =
        location.name

      label.tabIndex =
        0

      label.setAttribute(
        'role',
        'button'
      )

      label.setAttribute(
        'aria-label',
        location.name
      )


      label.addEventListener(
        'click',
        () => {

          selectLocation(
            index
          )

        }
      )


      label.addEventListener(
        'keydown',
        event => {

          if (
            event.key === 'Enter' ||
            event.key === ' '
          ) {

            event.preventDefault()

            selectLocation(
              index
            )

          }

        }
      )


      labelLayer.appendChild(
        label
      )


      markerData.push({
        location,
        marker,
        hit,
        label
      })

    }
  )

}


/* =========================================================
   THREE INITIALIZATION
========================================================= */

function ensureGlobe() {

  if (globeReady)
    return

  globeReady = true


  scene =
    new THREE.Scene()


  camera =
    new THREE.PerspectiveCamera(
      isMobile ? 34 : 31,
      window.innerWidth /
      window.innerHeight,
      0.1,
      400
    )


  camera.position.set(
  0,
  isMobile ? 1.2 : 0,
  isMobile ? 78 : 58
)


  renderer =
    new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    })


  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  )

  renderer.setSize(
    window.innerWidth,
    window.innerHeight,
    false
  )

  renderer.outputColorSpace =
    THREE.SRGBColorSpace


  globeGroup =
    new THREE.Group()

  scene.add(
    globeGroup
  )


  const globeFill =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        GLOBE_RADIUS,
        64,
        64
      ),
      new THREE.MeshBasicMaterial({
        color: 0xf0efe9,
        transparent: true,
        opacity: 0.16,
        depthWrite: false
      })
    )

  globeGroup.add(
    globeFill
  )


  const globeEdge =
    new THREE.Mesh(
      new THREE.SphereGeometry(
        GLOBE_RADIUS + 0.018,
        48,
        48
      ),
      new THREE.MeshBasicMaterial({
        color: 0x72766d,
        wireframe: true,
        transparent: true,
        opacity: 0.035,
        depthWrite: false
      })
    )

  globeGroup.add(
    globeEdge
  )


  createGlobeGrid()

  createMarkers()

  createBackgroundDots()

  createCountryOutlines()


  controls =
    new OrbitControls(
      camera,
      renderer.domElement
    )


  controls.enableDamping =
    true

  controls.dampingFactor =
    0.045

  controls.enablePan =
    false

  controls.enableZoom =
    false

  controls.rotateSpeed =
    isMobile
      ? 0.42
      : 0.34

  controls.autoRotate =
    !reducedMotion

  controls.autoRotateSpeed =
    0.38


  controls.addEventListener(
    'start',
    () => {

      userMovedGlobe =
        true

      controls.autoRotate =
        false

      journeyInstruction
        ?.classList
        .remove('blinking')

    }
  )


  addCanvasInteraction()

  updateSvgViewBox()

  animateThree()

}


/* =========================================================
   CANVAS CLICK
========================================================= */

function addCanvasInteraction() {

  let startX = 0
  let startY = 0


  renderer.domElement
    .addEventListener(
      'pointerdown',
      event => {

        startX =
          event.clientX

        startY =
          event.clientY

      }
    )


  renderer.domElement
    .addEventListener(
      'pointerup',
      event => {

        const distance =
          Math.hypot(
            event.clientX - startX,
            event.clientY - startY
          )


        if (
          distance > 7 ||
          transitionRunning
        )
          return


        const rect =
          renderer
            .domElement
            .getBoundingClientRect()


        pointer.x =
          (
            (
              event.clientX -
              rect.left
            ) /
            rect.width
          ) * 2 - 1


        pointer.y =
          -
          (
            (
              event.clientY -
              rect.top
            ) /
            rect.height
          ) * 2 + 1


        raycaster.setFromCamera(
          pointer,
          camera
        )


        const hits =
          raycaster.intersectObjects(
            markerData.map(
              item => item.hit
            ),
            false
          )


        if (!hits.length)
          return


        selectLocation(
          hits[0]
            .object
            .userData
            .index
        )

      }
    )

}


/* =========================================================
   LABEL PROJECTION
========================================================= */

function updateLabels() {

  if (
    !camera ||
    !markerData.length
  )
    return


  const cameraDirection =
    camera.position
      .clone()
      .normalize()


  markerData.forEach(
    item => {

      item.marker
        .getWorldPosition(
          worldTemp
        )


      const surfaceDirection =
        worldTemp
          .clone()
          .normalize()


      const visible =
        surfaceDirection.dot(
          cameraDirection
        ) > 0.08


      if (!visible) {

        item.label.style.opacity =
          '0'

        item.label.style.pointerEvents =
          'none'

        return

      }


      const projected =
        worldTemp
          .clone()
          .project(camera)


      const x =
        (
          projected.x * 0.5 +
          0.5
        ) *
        window.innerWidth


      const y =
        (
          -projected.y * 0.5 +
          0.5
        ) *
        window.innerHeight


    const rect =
  journeyScene.getBoundingClientRect()

const labelX =
  item.location.side === 'left'
    ? rect.width * parseFloat(item.location.x) / 100
    : rect.width * (1 - parseFloat(item.location.x) / 100)

const labelY =
  rect.height * parseFloat(item.location.top) / 100

item.label.style.left =
  `${labelX}px`

item.label.style.top =
  `${labelY}px`

item.label.style.transform =
  item.location.side === 'left'
    ? 'translate(0, -50%)'
    : 'translate(-100%, -50%)'

      item.label.style.opacity =
        '1'

      item.label.style.pointerEvents =
        'auto'

    }
  )

}


/* =========================================================
   SVG CONNECTOR
========================================================= */

let connectorPath =
  null

let connectorDot =
  null


function ensureConnector() {

  if (
    connectorPath &&
    connectorDot
  )
    return


  const ns =
    'http://www.w3.org/2000/svg'


  connectorPath =
    document.createElementNS(
      ns,
      'path'
    )


  connectorDot =
    document.createElementNS(
      ns,
      'circle'
    )


  connectorDot.setAttribute(
    'r',
    '2.2'
  )


  connectorPath.style.opacity =
    '0'

  connectorDot.style.opacity =
    '0'


  svgCanvas.append(
    connectorPath,
    connectorDot
  )

}


function hideConnector() {

  if (connectorPath) {

    connectorPath.style.opacity =
      '0'

  }

  if (connectorDot) {

    connectorDot.style.opacity =
      '0'

  }

}


function updateConnector() {

  if (
    selectedIndex < 0 ||
    !modal.classList.contains(
      'active'
    ) ||
    !camera
  ) {

    hideConnector()

    return

  }


  ensureConnector()


  const data =
    markerData[
      selectedIndex
    ]


  if (!data)
    return


  data.marker
    .getWorldPosition(
      worldTemp
    )


  const projected =
    worldTemp
      .clone()
      .project(camera)


  if (
    projected.z > 1
  ) {

    hideConnector()

    return

  }


  const startX =
    (
      projected.x * 0.5 +
      0.5
    ) *
    window.innerWidth


  const startY =
    (
      -projected.y * 0.5 +
      0.5
    ) *
    window.innerHeight


  const rect =
    modal
      .getBoundingClientRect()


  let endX
  let endY


  if (isMobile) {

    endX =
      rect.left +
      rect.width * 0.5

    endY =
      rect.top

  }
  else {

    endX =
      rect.right

    endY =
      rect.top +
      rect.height * 0.47

  }


  const controlX =
    startX +
    (
      endX - startX
    ) * 0.56


  const controlY =
    startY +
    (
      endY - startY
    ) * 0.22


  connectorPath.setAttribute(
    'd',
    `
      M ${startX} ${startY}
      Q ${controlX} ${controlY}
        ${endX} ${endY}
    `
  )


  connectorDot.setAttribute(
    'cx',
    startX
  )

  connectorDot.setAttribute(
    'cy',
    startY
  )


  connectorPath.style.opacity =
    '1'

  connectorDot.style.opacity =
    '1'

}


/* =========================================================
   RENDER LOOP
========================================================= */

function animateThree() {

  if (!renderer)
    return


  controls?.update()

  updateLabels()

  updateConnector()


  renderer.render(
    scene,
    camera
  )


  animationFrame =
    requestAnimationFrame(
      animateThree
    )

}


/* =========================================================
   SELECT LOCATION
========================================================= */

function resetSelectedMarker() {

  markerData.forEach(
    item => {

      gsap.to(
        item.marker.scale,
        {
          x: 1,
          y: 1,
          z: 1,
          duration: 0.3,
          overwrite: true
        }
      )

      item.label
        .classList
        .remove('active')

    }
  )

}


function selectLocation(
  index
) {

  if (
    transitionRunning ||
    mode !== 'journey' ||
    !locations[index]
  )
    return


  ensureGlobe()

  closeModal(
    false
  )

  selectedIndex =
    index


  visited.add(
    index
  )


  updateJourneyProgress()


  journeyInstruction
    ?.classList
    .remove('blinking')


  controls.autoRotate =
    false


  resetSelectedMarker()


  const item =
    markerData[index]


  item.label
    .classList
    .add('active')


  gsap.to(
    item.marker.scale,
    {
      x: 1.8,
      y: 1.8,
      z: 1.8,
      duration: 0.4,
      ease: 'back.out(2)'
    }
  )


  item.marker
    .getWorldPosition(
      worldTemp
    )


  const targetDirection =
    worldTemp
      .clone()
      .normalize()


  const distance =
    isMobile
      ? 40
      : 37


  const targetCamera =
    targetDirection
      .clone()
      .multiplyScalar(
        distance
      )


  transitionRunning =
    true

  controls.enabled =
    false


  gsap.to(
    camera.position,
    {
      x: targetCamera.x,
      y: targetCamera.y,
      z: targetCamera.z,

      duration:
        reducedMotion
          ? 0.01
          : 1.35,

      ease:
        'power3.inOut',

      onUpdate: () => {

        camera.lookAt(
          0,
          0,
          0
        )

      },

      onComplete: () => {

        camera.lookAt(
          0,
          0,
          0
        )

        controls.target.set(
          0,
          0,
          0
        )

        controls.update()

        controls.enabled =
          true

        transitionRunning =
          false

        openMemory(
          index
        )

      }
    }
  )

}


/* =========================================================
   MEMORY CARD
========================================================= */

function openMemory(
  index
) {

  const location =
    locations[index]

  if (!location)
    return


  modalCity.textContent =
    location.name || ''


  modalLocation.textContent =
    location.subname || ''


  modal.classList.remove(
    'instagram-mode'
  )


  modalImage.style.display =
    'block'

  modalInstagram.style.display =
    'none'


  modalInstagram.removeAttribute(
    'src'
  )


  if (
    location.type ===
    'instagram'
  ) {

    modal.classList.add(
      'instagram-mode'
    )

    modalImage.style.display =
      'none'

    modalInstagram.style.display =
      'block'

    modalInstagram.src =
      location.media

  }
  else {

    modalImage.src =
      resolveMedia(
        location.media
      )

    modalImage.alt =
      location.name || ''

  }


  modal.setAttribute(
    'aria-hidden',
    'false'
  )


  requestAnimationFrame(
    () => {

      modal
        .classList
        .add('active')

    }
  )

}


function closeModal(
  clearSelection = true
) {

  modal
    ?.classList
    .remove(
      'active',
      'instagram-mode'
    )


  modal
    ?.setAttribute(
      'aria-hidden',
      'true'
    )


  if (
    modalInstagram
  ) {

    modalInstagram
      .removeAttribute(
        'src'
      )

  }


  hideConnector()


  if (
    clearSelection
  ) {

    selectedIndex =
      -1

    resetSelectedMarker()

  }

}


modalClose
  ?.addEventListener(
    'click',
    () => {

      closeModal()

    }
  )


modalSkip
  ?.addEventListener(
    'click',
    () => {

      closeModal()

      goWedding()

    }
  )


document.addEventListener(
  'keydown',
  event => {

    if (
      event.key === 'Escape' &&
      modal.classList.contains(
        'active'
      )
    ) {

      closeModal()

    }

  }
)


/* =========================================================
   NAVIGATION PROGRESS
========================================================= */

function updateJourneyProgress() {

  if (
    mode !== 'journey'
  )
    return


  const ratio =
    locations.length
      ? visited.size /
        locations.length
      : 0


  const width =
    50 +
    ratio * 45


  navFill.style.width =
    `${width}%`

}


function setActiveNav(
  active
) {

  navIntro.classList.remove(
    'active'
  )

  navJourney.classList.remove(
    'active'
  )

  navWedding.classList.remove(
    'active'
  )


  navDots.forEach(
    dot => {

      dot?.classList
        .remove('active')

    }
  )


  if (
    active === 'intro'
  ) {

    navIntro.classList.add(
      'active'
    )

    navDots[0]
      ?.classList
      .add('active')

    navFill.style.width =
      '0%'

  }


  if (
    active === 'journey'
  ) {

    navJourney.classList.add(
      'active'
    )

    navDots[0]
      ?.classList
      .add('active')

    navDots[1]
      ?.classList
      .add('active')

    updateJourneyProgress()

  }


  if (
    active === 'wedding'
  ) {

    navWedding.classList.add(
      'active'
    )

    navDots.forEach(
      dot => {

        dot?.classList
          .add('active')

      }
    )

    navFill.style.width =
      '100%'

  }

}


/* =========================================================
   INTRO -> JOURNEY
========================================================= */

function goJourney() {

  if (
    transitionRunning
  )
    return


  if (
    mode === 'journey'
  ) {

    closeModal()

    return

  }


  killIntroTimeline()

  ensureGlobe()


  transitionRunning =
    true

  mode =
    'journey'


  body.classList.remove(
    'intro-mode'
  )

  body.classList.add(
    'journey-mode',
    'section-transition-active'
  )


  setActiveNav(
    'journey'
  )


  transitionScreen
    .classList
    .add('is-active')


  transitionScreen.setAttribute(
    'aria-hidden',
    'false'
  )


  gsap.set(
    '.transition-screen .trans-line',
    {
      opacity: 0
    }
  )


  gsap.set(
    labelLayer,
    {
      opacity: 0
    }
  )


  camera.position.set(
    0,
    0,
    isMobile ? 58 : 52
  )

  camera.lookAt(
    0,
    0,
    0
  )


  if (
    transitionTimeline
  ) {

    transitionTimeline.kill()

  }


  transitionTimeline =
    gsap.timeline({

      onComplete: () => {

        transitionScreen
          .classList
          .remove('is-active')

        transitionScreen.setAttribute(
          'aria-hidden',
          'true'
        )

        body.classList.remove(
          'section-transition-active'
        )

        transitionRunning =
          false

        if (
          !userMovedGlobe
        ) {

          journeyInstruction
            ?.classList
            .add('blinking')

        }

      }

    })


  const lines =
    transitionScreen
      .querySelectorAll(
        '.trans-line'
      )


  transitionTimeline

    .to(
      introOverlay,
      {
        autoAlpha: 0,
        duration:
          reducedMotion
            ? 0.01
            : 1.05,

        ease:
          'power2.inOut'
      }
    )

    .to(
      camera.position,
      {
        z:
          isMobile
            ? 40
            : 37,

        duration:
          reducedMotion
            ? 0.01
            : 2.1,

        ease:
          'power3.inOut',

        onUpdate: () => {

          camera.lookAt(
            0,
            0,
            0
          )

        }
      },
      '-=0.7'
    )

    .to(
      lines[0],
      {
        opacity: 1,
        duration:
          reducedMotion
            ? 0.01
            : 0.75
      },
      '-=1.2'
    )

    .to(
      lines[0],
      {
        opacity: 0,
        duration:
          reducedMotion
            ? 0.01
            : 0.55,

        delay:
          reducedMotion
            ? 0
            : 0.65
      }
    )

    .to(
      lines[1],
      {
        opacity: 1,
        duration:
          reducedMotion
            ? 0.01
            : 0.75
      }
    )

    .to(
      lines[1],
      {
        opacity: 0,
        duration:
          reducedMotion
            ? 0.01
            : 0.55,

        delay:
          reducedMotion
            ? 0
            : 0.65
      }
    )

    .to(
      labelLayer,
      {
        opacity: 1,
        duration:
          reducedMotion
            ? 0.01
            : 0.8
      },
      '-=0.35'
    )

}


/* =========================================================
   JOURNEY -> INTRO
========================================================= */

function goIntro() {

  if (
    transitionRunning
  )
    return


  transitionRunning =
    true


  closeModal()

  journeyInstruction
    ?.classList
    .remove('blinking')


  controls &&
    (
      controls.autoRotate =
        false
    )


  gsap.to(
    journeyScene,
    {
      opacity: 0,
      duration:
        reducedMotion
          ? 0.01
          : 0.55,

      ease:
        'power2.inOut',

      onComplete: () => {

        body.classList.remove(
          'journey-mode',
          'section-transition-active',
          'wedding-trans-active'
        )

        body.classList.add(
          'intro-mode'
        )

        gsap.set(
          journeyScene,
          {
            clearProps:
              'opacity'
          }
        )

        transitionRunning =
          false

        playIntro()

      }
    }
  )

}


/* =========================================================
   WEDDING TRANSITION
========================================================= */

function goWedding() {

  if (
    transitionRunning
  )
    return


  if (
    mode === 'intro'
  ) {

    goJourney()

    return

  }


  transitionRunning =
    true

  mode =
    'wedding'


  closeModal()


  journeyInstruction
    ?.classList
    .remove('blinking')


  body.classList.add(
    'wedding-trans-active'
  )


  setActiveNav(
    'wedding'
  )


  finalTransitionScreen
    .classList
    .add('is-active')


  finalTransitionScreen
    .setAttribute(
      'aria-hidden',
      'false'
    )


  weddingHandoff
    .classList
    .remove('active')


  weddingHandoff
    .setAttribute(
      'aria-hidden',
      'true'
    )


  const lines =
    finalTransitionScreen
      .querySelectorAll(
        '.trans-line'
      )


  gsap.set(
    lines,
    {
      opacity: 0
    }
  )


  if (
    finalTimeline
  ) {

    finalTimeline.kill()

  }


  finalTimeline =
    gsap.timeline()


  finalTimeline

    .to(
      lines[0],
      {
        opacity: 1,
        duration:
          reducedMotion
            ? 0.01
            : 0.8,

        ease:
          'power2.inOut'
      }
    )

    .to(
      lines[0],
      {
        opacity: 0,
        duration:
          reducedMotion
            ? 0.01
            : 0.65,

        delay:
          reducedMotion
            ? 0
            : 0.75
      }
    )

    .to(
      lines[1],
      {
        opacity: 1,
        duration:
          reducedMotion
            ? 0.01
            : 0.85,

        ease:
          'power2.inOut'
      }
    )

    .to(
      lines[1],
      {
        opacity: 0,
        duration:
          reducedMotion
            ? 0.01
            : 0.65,

        delay:
          reducedMotion
            ? 0
            : 0.9
      }
    )

    .call(
      showWeddingHandoff
    )

}


/* =========================================================
   WEDDING HANDOFF
========================================================= */

function showWeddingHandoff() {

  finalTransitionScreen
    .classList
    .remove('is-active')


  finalTransitionScreen
    .setAttribute(
      'aria-hidden',
      'true'
    )


  weddingHandoff
    .classList
    .add('active')


  weddingHandoff
    .setAttribute(
      'aria-hidden',
      'false'
    )


  const date =
    weddingHandoff
      .querySelector('p')

  const title =
    weddingHandoff
      .querySelector('h2')

  const mark =
    weddingHandoff
      .querySelector(
        '.wedding-handoff-mark'
      )


  gsap.set(
    [
      date,
      title,
      mark
    ],
    {
      opacity: 0,
      y: 16
    }
  )


  gsap.timeline({

    onComplete: () => {

      window.setTimeout(
        () => {

          window.location.assign(
            WEDDING_URL
          )

        },
        reducedMotion
          ? 50
          : 900
      )

    }

  })

    .to(
      date,
      {
        opacity: 1,
        y: 0,
        duration:
          reducedMotion
            ? 0.01
            : 0.7
      }
    )

    .to(
      title,
      {
        opacity: 1,
        y: 0,
        duration:
          reducedMotion
            ? 0.01
            : 1.05,

        ease:
          'power3.out'
      },
      '-=0.35'
    )

    .to(
      mark,
      {
        opacity: 1,
        y: 0,
        duration:
          reducedMotion
            ? 0.01
            : 0.7
      },
      '-=0.4'
    )

}


/* =========================================================
   BUTTONS
========================================================= */

nextBtn
  ?.addEventListener(
    'click',
    goJourney
  )


navIntro
  ?.addEventListener(
    'click',
    goIntro
  )


navJourney
  ?.addEventListener(
    'click',
    goJourney
  )


navWedding
  ?.addEventListener(
    'click',
    goWedding
  )


headerHome
  ?.addEventListener(
    'click',
    goIntro
  )


/* =========================================================
   AUDIO
========================================================= */

let muted =
  false


muteBtn
  ?.addEventListener(
    'click',
    () => {

      muted =
        !muted

      if (bgm) {

        bgm.muted =
          muted

      }

      muteBtn.style.opacity =
        muted
          ? '0.4'
          : '1'

      muteBtn.setAttribute(
        'aria-label',
        muted
          ? 'Zapnúť zvuk'
          : 'Vypnúť zvuk'
      )

    }
  )


/* =========================================================
   SVG VIEWBOX
========================================================= */

function updateSvgViewBox() {

  if (!svgCanvas)
    return

  svgCanvas.setAttribute(
    'viewBox',
    `0 0 ${window.innerWidth} ${window.innerHeight}`
  )

}


/* =========================================================
   RESIZE
========================================================= */

function handleResize() {

  const wasMobile =
    isMobile

  isMobile =
    mobileQuery.matches


  updateSvgViewBox()


  if (
    !globeReady ||
    !camera ||
    !renderer
  )
    return


  camera.aspect =
    window.innerWidth /
    window.innerHeight


  camera.fov =
    isMobile
      ? 34
      : 31


  camera.updateProjectionMatrix()


  renderer.setSize(
    window.innerWidth,
    window.innerHeight,
    false
  )


  renderer.setPixelRatio(
    Math.min(
      window.devicePixelRatio,
      2
    )
  )


  if (
    wasMobile !== isMobile &&
    selectedIndex < 0
  ) {

    camera.position
      .normalize()
      .multiplyScalar(
        isMobile
          ? 40
          : 37
      )

    camera.lookAt(
      0,
      0,
      0
    )

  }

}


window.addEventListener(
  'resize',
  handleResize
)


mobileQuery.addEventListener(
  'change',
  handleResize
)


/* =========================================================
   DIRECT VIEW SUPPORT
========================================================= */

function handleInitialHash() {

  const hash =
    window.location.hash
      .toLowerCase()


  if (
    hash.includes(
      'journey'
    )
  ) {

    setTimeout(
      goJourney,
      50
    )

  }

}


window.addEventListener(
  'load',
  handleInitialHash
)
