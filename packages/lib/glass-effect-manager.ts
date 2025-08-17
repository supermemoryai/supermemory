// Singleton WebGL context manager for glass effects
class GlassEffectManager {
	private static instance: GlassEffectManager | null = null
	private canvas: HTMLCanvasElement | null = null
	private gl: WebGLRenderingContext | null = null
	private program: WebGLProgram | null = null
	private uniforms: Record<string, WebGLUniformLocation | null> = {}
	private effects: Map<string, EffectInstance> = new Map()
	private animationFrame: number | null = null
	private startTime: number = performance.now()
	private mousePositions: Map<string, { x: number; y: number }> = new Map()

	static getInstance(): GlassEffectManager {
		if (!GlassEffectManager.instance) {
			GlassEffectManager.instance = new GlassEffectManager()
		}
		return GlassEffectManager.instance
	}

	private constructor() {
		this.initializeContext()
	}

	private initializeContext() {
		// Create offscreen canvas
		this.canvas = document.createElement("canvas")
		this.canvas.width = 1024 // Default size, will be adjusted
		this.canvas.height = 1024

		this.gl = this.canvas.getContext("webgl", {
			alpha: true,
			premultipliedAlpha: false,
			preserveDrawingBuffer: true,
		})

		if (!this.gl) {
			console.error("WebGL not supported")
			return
		}

		this.setupShaders()
		this.startRenderLoop()
	}

	private setupShaders() {
		if (!this.gl) return

		const vsSource = `
			attribute vec2 position;
			void main() {
				gl_Position = vec4(position, 0.0, 1.0);
			}
		`

		const fsSource = `
			precision mediump float;

			uniform vec2 iResolution;
			uniform float iTime;
			uniform vec2 iMouse;
			uniform float iExpanded;

			float noise(vec2 p) {
				return sin(p.x * 10.0) * sin(p.y * 10.0);
			}

			void main() {
				vec2 uv = gl_FragCoord.xy / iResolution.xy;
				vec2 mouse = iMouse / iResolution.xy;

				float dist = length(uv - mouse);

				vec2 distortion = vec2(
					sin(iTime * 2.0 + uv.y * 10.0) * 0.0025,
					cos(iTime * 1.5 + uv.x * 10.0) * 0.0025
				);

				vec2 refractedUV = uv + distortion * (1.0 - dist);

				vec3 glassColor = mix(
					vec3(0.1, 0.1, 0.12),
					vec3(0.16, 0.16, 0.19),
					1.0 - length(uv - vec2(0.5))
				);

				float glow = exp(-dist * 5.0) * 0.35;
				glassColor += vec3(glow);

				float edge = 1.0 - smoothstep(0.0, 0.02, min(
					min(uv.x, 1.0 - uv.x),
					min(uv.y, 1.0 - uv.y)
				));
				glassColor += edge * 0.3;

				float edgeGlow = 1.0 - smoothstep(0.0, 0.05, min(
					min(uv.x, 1.0 - uv.x),
					min(uv.y, 1.0 - uv.y)
				));
				glassColor += vec3(edgeGlow * 0.1, edgeGlow * 0.1, edgeGlow * 0.2);

				float n = noise(refractedUV * 50.0 + vec2(iTime)) * 0.025;
				glassColor += vec3(n);

				float alpha = 0.25 + edge * 0.2 + glow * 0.2;
				alpha *= mix(0.8, 1.0, iExpanded);

				gl_FragColor = vec4(glassColor, alpha);
			}
		`

		const createShader = (type: number, source: string) => {
			const shader = this.gl!.createShader(type)
			if (!shader) return null

			this.gl!.shaderSource(shader, source)
			this.gl!.compileShader(shader)

			if (!this.gl!.getShaderParameter(shader, this.gl!.COMPILE_STATUS)) {
				console.error("Shader error:", this.gl!.getShaderInfoLog(shader))
				this.gl!.deleteShader(shader)
				return null
			}
			return shader
		}

		const vs = createShader(this.gl.VERTEX_SHADER, vsSource)
		const fs = createShader(this.gl.FRAGMENT_SHADER, fsSource)
		if (!vs || !fs) return

		this.program = this.gl.createProgram()
		if (!this.program) return

		this.gl.attachShader(this.program, vs)
		this.gl.attachShader(this.program, fs)
		this.gl.linkProgram(this.program)
		// biome-ignore  lint/correctness/useHookAtTopLevel: Well, not a hook
		this.gl.useProgram(this.program)

		// Buffer setup
		const buffer = this.gl.createBuffer()
		this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer)
		this.gl.bufferData(
			this.gl.ARRAY_BUFFER,
			new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
			this.gl.STATIC_DRAW,
		)

		const position = this.gl.getAttribLocation(this.program, "position")
		this.gl.enableVertexAttribArray(position)
		this.gl.vertexAttribPointer(position, 2, this.gl.FLOAT, false, 0, 0)

		// Store uniform locations
		this.uniforms = {
			resolution: this.gl.getUniformLocation(this.program, "iResolution"),
			time: this.gl.getUniformLocation(this.program, "iTime"),
			mouse: this.gl.getUniformLocation(this.program, "iMouse"),
			expanded: this.gl.getUniformLocation(this.program, "iExpanded"),
		}

		// Enable blending
		this.gl.enable(this.gl.BLEND)
		this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA)
	}

	registerEffect(
		id: string,
		targetCanvas: HTMLCanvasElement,
		isExpanded: boolean,
	): () => void {
		// Ensure minimum dimensions
		const width = Math.max(1, targetCanvas.width)
		const height = Math.max(1, targetCanvas.height)

		const effect: EffectInstance = {
			id,
			targetCanvas,
			isExpanded,
			width,
			height,
		}

		this.effects.set(id, effect)
		this.mousePositions.set(id, { x: 0, y: 0 })

		// Return cleanup function
		return () => {
			this.effects.delete(id)
			this.mousePositions.delete(id)
			if (this.effects.size === 0 && this.animationFrame) {
				cancelAnimationFrame(this.animationFrame)
				this.animationFrame = null
			}
		}
	}

	updateMousePosition(id: string, x: number, y: number) {
		this.mousePositions.set(id, { x, y })
	}

	updateExpanded(id: string, isExpanded: boolean) {
		const effect = this.effects.get(id)
		if (effect) {
			effect.isExpanded = isExpanded
		}
	}

	updateSize(id: string, width: number, height: number) {
		const effect = this.effects.get(id)
		if (effect) {
			// Ensure minimum dimensions
			effect.width = Math.max(1, width)
			effect.height = Math.max(1, height)
		}
	}

	private startRenderLoop() {
		const render = () => {
			if (!this.gl || !this.program || this.effects.size === 0) {
				this.animationFrame = requestAnimationFrame(render)
				return
			}

			const currentTime = (performance.now() - this.startTime) / 1000

			// Render each effect
			for (const [id, effect] of Array.from(this.effects)) {
				const mousePos = this.mousePositions.get(id) || { x: 0, y: 0 }

				// Skip rendering if dimensions are invalid
				if (effect.width <= 0 || effect.height <= 0) {
					continue
				}

				// Set canvas size if needed
				if (
					this.canvas!.width !== effect.width ||
					this.canvas!.height !== effect.height
				) {
					this.canvas!.width = effect.width
					this.canvas!.height = effect.height
					this.gl.viewport(0, 0, effect.width, effect.height)
				}

				// Clear and render
				this.gl.clearColor(0, 0, 0, 0)
				this.gl.clear(this.gl.COLOR_BUFFER_BIT)

				// Set uniforms
				if (this.uniforms.resolution) {
					this.gl.uniform2f(
						this.uniforms.resolution,
						effect.width,
						effect.height,
					)
				}
				if (this.uniforms.time) {
					this.gl.uniform1f(this.uniforms.time, currentTime)
				}
				if (this.uniforms.mouse) {
					this.gl.uniform2f(this.uniforms.mouse, mousePos.x, mousePos.y)
				}
				if (this.uniforms.expanded) {
					this.gl.uniform1f(
						this.uniforms.expanded,
						effect.isExpanded ? 1.0 : 0.0,
					)
				}

				// Draw
				this.gl.drawArrays(this.gl.TRIANGLE_STRIP, 0, 4)

				// Copy to target canvas
				const targetCtx = effect.targetCanvas.getContext("2d")
				if (targetCtx) {
					targetCtx.clearRect(0, 0, effect.width, effect.height)
					targetCtx.drawImage(this.canvas!, 0, 0)
				}
			}

			this.animationFrame = requestAnimationFrame(render)
		}

		render()
	}

	// Clean up method (optional, for when the app unmounts)
	destroy() {
		if (this.animationFrame) {
			cancelAnimationFrame(this.animationFrame)
		}
		if (this.gl && this.program) {
			this.gl.deleteProgram(this.program)
		}
		this.effects.clear()
		this.mousePositions.clear()
		GlassEffectManager.instance = null
	}
}

interface EffectInstance {
	id: string
	targetCanvas: HTMLCanvasElement
	isExpanded: boolean
	width: number
	height: number
}

export default GlassEffectManager
