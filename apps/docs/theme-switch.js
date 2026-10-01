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
