// Enhancements are scoped to the research homepage and cleaned up on SPA navigation.
function initResearchHomepage() {
  const home = document.querySelector<HTMLElement>(".pramana-home")
  if (!home || home.dataset.enhanced === "true") return
  home.dataset.enhanced = "true"
  const button = home.querySelector<HTMLButtonElement>(".home-motion-toggle")
  const label = button?.querySelector<HTMLElement>(".motion-label")
  const media = window.matchMedia("(prefers-reduced-motion: reduce)")
  let paused = false
  try {
    paused = window.localStorage.getItem("pramana-motion-paused") === "true"
  } catch {}
  const applyState = () => {
    const reduced = media.matches
    home.dataset.motion = paused || reduced ? "paused" : "running"
    if (button) {
      button.hidden = false
      button.disabled = reduced
      button.setAttribute("aria-pressed", String(paused || reduced))
      const text = reduced ? "静かな表示" : paused ? "動きを再開" : "動きを止める"
      button.setAttribute("aria-label", reduced ? "端末の設定に合わせて動きを減らしています" : text)
      if (label) label.textContent = text
    }
  }
  const toggleMotion = () => {
    paused = !paused
    try {
      window.localStorage.setItem("pramana-motion-paused", String(paused))
    } catch {}
    applyState()
  }
  const handleVisibility = () => home.classList.toggle("tab-inactive", document.hidden)
  applyState()
  handleVisibility()
  button?.addEventListener("click", toggleMotion)
  media.addEventListener("change", applyState)
  document.addEventListener("visibilitychange", handleVisibility)
  let observer: IntersectionObserver | undefined
  if ("IntersectionObserver" in window && !media.matches) {
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add("is-visible")
        observer?.unobserve(entry.target)
      }
    }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" })
    const reveals = home.querySelectorAll<HTMLElement>("[data-reveal]")
    reveals.forEach((node) => observer?.observe(node))
    home.classList.add("motion-ready")
  }
  const cleanup = () => {
    observer?.disconnect()
    button?.removeEventListener("click", toggleMotion)
    media.removeEventListener("change", applyState)
    document.removeEventListener("visibilitychange", handleVisibility)
    home.classList.remove("motion-ready", "tab-inactive")
    delete home.dataset.enhanced
  }
  window.addCleanup?.(cleanup)
}
document.addEventListener("nav", initResearchHomepage)

