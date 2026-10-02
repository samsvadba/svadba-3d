import * as THREE from 'three'
import { galleryData } from './galleryData.js'
import './style.css'

const root = document.querySelector('#experience')
const chapters = document.querySelector('#chapters')
const toggle = document.querySelector('#view-toggle')
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
const base = import.meta.env.BASE_URL
chapters.innerHTML = galleryData.map((item, index) => `
  <article class="chapter" id="memory-${index + 1}">
    <div class="chapter-copy"><span class="eyebrow">${String(index + 1).padStart(2, '0')} / ${item.place}</span>
    <${index === 0 ? 'h1' : 'h2'}>${item.title}</${index === 0 ? 'h1' : 'h2'}>
    <p>${item.text}</p>${index === 0 ? '<a class="scroll-hint" href="#memory-2">Objavte náš príbeh <span>↓</span></a>' : ''}${index === 8 ? '<a class="scroll-hint" href="#wedding">Naša svadba <span>↗</span></a>' : ''}</div>
    <figure><img src="${base}photos/${item.file}" alt="${item.alt}" ${index > 0 ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"><figcaption>${item.place}</figcaption></figure>
  </article>`).join('')

let renderer, scene, camera, frame = 0, position = 0, previousTime = 0, active = -1
let staticView = reduced.matches
let unavailable = false
const planes = []
const pointer = new THREE.Vector2()
const targetColor = new THREE.Color(galleryData[0].color)
const backgroundColor = targetColor.clone()

function updateMode() {
  const calm = staticView || unavailable
  root.classList.toggle('is-3d', !calm && Boolean(renderer))
  root.classList.toggle('is-static', calm)
  toggle.setAttribute('aria-pressed', String(calm))
  toggle.textContent = calm ? 'Priestorové zobrazenie' : 'Pokojné zobrazenie'
  toggle.disabled = unavailable
  if (calm) cancelAnimationFrame(frame)
  else if (renderer) { previousTime = 0; frame = requestAnimationFrame(render) }
}

function resize() {
  if (!renderer) return
  const width = window.innerWidth, height = window.innerHeight
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1.25 : 1.75))
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  const viewHeight = 2 * Math.tan(THREE.MathUtils.degToRad(42 / 2)) * 8
  const viewWidth = viewHeight * camera.aspect
  planes.forEach(({ mesh, ratio }, index) => {
    const mobile = width < 700
    const maxHeight = viewHeight * (mobile ? 0.43 : 0.66)
    const maxWidth = viewWidth * (mobile ? 0.82 : 0.40)
    const height = Math.min(maxHeight, maxWidth / ratio)
    mesh.scale.set(height * ratio, height, 1)
    mesh.position.set(mobile ? 0 : viewWidth * 0.235, mobile ? viewHeight * 0.115 : 0, -index * 10)
  })
}

async function init() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas: document.querySelector('#scene'), antialias: true, alpha: true })
    renderer.outputColorSpace = THREE.SRGBColorSpace
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 130)
    camera.position.z = 8
    const loader = new THREE.TextureLoader()
    await Promise.all(galleryData.map(async (item, index) => {
      const texture = await loader.loadAsync(`${base}photos/${item.file}`)
      texture.colorSpace = THREE.SRGBColorSpace
      texture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false })
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1, 12, 12), material)
      planes[index] = { mesh, ratio: texture.image.width / texture.image.height }
      scene.add(mesh)
    }))
    resize()
    position = getProgress()
    updateMode()
  } catch (error) {
    console.warn('Priestorová galéria nie je dostupná. Zobrazuje sa fotoalbum.', error)
    unavailable = true
    renderer?.dispose()
    renderer = null
    updateMode()
  }
}

function getProgress() {
  const first = chapters.children[0]
  const last = chapters.children[galleryData.length - 1]
  const start = window.scrollY + first.getBoundingClientRect().top
  const end = window.scrollY + last.getBoundingClientRect().top
  return THREE.MathUtils.clamp((window.scrollY - start) / Math.max(1, end - start) * (galleryData.length - 1), 0, galleryData.length - 1)
}

function render(time) {
  if (staticView || unavailable) return
  const dt = Math.min((time - (previousTime || time)) / 1000, 0.05)
  previousTime = time
  const target = getProgress()
  const old = position
  position = THREE.MathUtils.lerp(position, target, 1 - Math.exp(-dt * 9))
  const velocity = THREE.MathUtils.clamp((position - old) / Math.max(dt, 0.001), -3, 3)
  camera.position.set(pointer.x * 0.10, -pointer.y * 0.08, 8 - position * 10)
  const current = Math.min(galleryData.length - 1, Math.round(position))
  if (current !== active) {
    active = current
    targetColor.set(galleryData[current].color)
    root.style.setProperty('--accent', galleryData[current].accent)
    document.querySelector('#chapter-count').textContent = `${String(current + 1).padStart(2, '0')} / 09`
  }
  backgroundColor.lerp(targetColor, 1 - Math.exp(-dt * 3))
  root.style.setProperty('--mood', `#${backgroundColor.getHexString()}`)
  document.querySelector('#progress-fill').style.width = `${position / (galleryData.length - 1) * 100}%`
  planes.forEach(({ mesh }, index) => {
    const distance = index - position
    mesh.visible = distance > -0.65 && distance < 5
    mesh.material.opacity = distance < 0 ? THREE.MathUtils.clamp(1 + distance * 1.6, 0, 1) : Math.max(0.12, 1 - distance * 0.25)
    mesh.rotation.z = velocity * 0.008
    mesh.rotation.y = pointer.x * 0.025 + velocity * 0.012
  })
  renderer.render(scene, camera)
  frame = requestAnimationFrame(render)
}

toggle.addEventListener('click', () => {
  const index = staticView ? [...chapters.children].reduce((best, child, i) => Math.abs(child.getBoundingClientRect().top) < Math.abs(chapters.children[best].getBoundingClientRect().top) ? i : best, 0) : Math.round(getProgress())
  staticView = !staticView
  updateMode()
  chapters.children[index].scrollIntoView({ behavior: 'instant' })
  position = getProgress()
})
reduced.addEventListener('change', event => { staticView = event.matches; updateMode() })
window.addEventListener('resize', resize)
window.addEventListener('pointermove', event => {
  pointer.set(event.clientX / window.innerWidth * 2 - 1, event.clientY / window.innerHeight * 2 - 1)
}, { passive: true })
document.querySelector('#scene').addEventListener('webglcontextlost', event => {
  event.preventDefault(); unavailable = true; updateMode()
})
updateMode()
init()
