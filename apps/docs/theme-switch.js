// Theme switches should snap, not smear. Every control eases its colours on hover, so
// when light/dark flips, all of those transitions would fire at once. For the frame the
// theme class changes, turn transitions off, force a reflow, then restore them.
;(() => {
	var root = document.documentElement
	var wasDark = root.classList.contains("dark")

	new MutationObserver(() => {
		var isDark = root.classList.contains("dark")
		if (isDark === wasDark) return
		wasDark = isDark

		var style = document.createElement("style")
		style.textContent = "*,*::before,*::after{transition:none !important}"
		document.head.appendChild(style)
		void root.offsetHeight
		requestAnimationFrame(() => {
			style.remove()
		})
	}).observe(root, { attributes: true, attributeFilter: ["class"] })
})()
