import {
	DOMAINS,
	ELEMENT_IDS,
	MESSAGE_TYPES,
	POSTHOG_EVENT_KEY,
	STORAGE_KEYS,
	UI_CONFIG,
} from "../../utils/constants"
import { trackEvent } from "../../utils/posthog"
import {
	createProjectSelectionModal,
	createSaveTweetElement,
	DOMUtils,
} from "../../utils/ui-components"

async function loadSpaceGroteskFonts(): Promise<void> {
	if (document.getElementById("supermemory-modal-styles")) {
		return Promise.resolve()
	}

	const style = document.createElement("style")
	style.id = "supermemory-modal-styles"
	style.textContent = `
     @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap');
    `
	document.head.appendChild(style)

	await document.fonts.ready
}

/**
 * Check if import intent is valid (exists and not expired)
 */
async function checkAndConsumeImportIntent(): Promise<boolean> {
	try {
		const result = await browser.storage.local.get(
			STORAGE_KEYS.TWITTER_BOOKMARKS_IMPORT_INTENT_UNTIL,
		)
		const intentUntil = result[
			STORAGE_KEYS.TWITTER_BOOKMARKS_IMPORT_INTENT_UNTIL
		] as number | undefined

		if (intentUntil && Date.now() < intentUntil) {
			await browser.storage.local.remove(
				STORAGE_KEYS.TWITTER_BOOKMARKS_IMPORT_INTENT_UNTIL,
			)
			return true
		}
		return false
	} catch (error) {
		console.error("Error checking import intent:", error)
		return false
	}
}

/**
 * Check if onboarding toast has been shown before
 */
async function hasOnboardingBeenShown(): Promise<boolean> {
	try {
		const result = await browser.storage.local.get(
			STORAGE_KEYS.TWITTER_BOOKMARKS_ONBOARDING_SEEN,
		)
		return !!result[STORAGE_KEYS.TWITTER_BOOKMARKS_ONBOARDING_SEEN]
	} catch (error) {
		console.error("Error checking onboarding status:", error)
		return true // Default to true to avoid showing toast on error
	}
}

/**
 * Mark onboarding toast as shown
 */
async function markOnboardingAsShown(): Promise<void> {
	try {
		await browser.storage.local.set({
			[STORAGE_KEYS.TWITTER_BOOKMARKS_ONBOARDING_SEEN]: true,
		})
	} catch (error) {
		console.error("Error marking onboarding as shown:", error)
	}
}

export async function initializeTwitter() {
	if (!DOMUtils.isOnDomain(DOMAINS.TWITTER)) {
		return
	}

	if (window.location.pathname === "/i/bookmarks") {
		setTimeout(async () => {
			if (window.location.pathname === "/i/bookmarks") {
				await handleBookmarksPageLoad()
			}
		}, 2000)
	} else {
		// Clean up any injected UI if navigating away
		removeAllTwitterUI()
	}
}

/**
 * Handle what to show when user lands on bookmarks page
 */
async function handleBookmarksPageLoad() {
	if (window.location.pathname !== "/i/bookmarks") {
		return
	}

	addTwitterImportButtonForFolders() // Add buttons to bookmark folders

	const hasIntent = await checkAndConsumeImportIntent()

	if (hasIntent) {
		await openImportModal()
		return
	}

	const onboardingShown = await hasOnboardingBeenShown()

	if (!onboardingShown) {
		await showOnboardingToast()
		await markOnboardingAsShown()
	}
}

/**
 * Opens the import modal and handles the import flow
 */
export async function openImportModal() {
	try {
		const response = await browser.runtime.sendMessage({
			action: MESSAGE_TYPES.FETCH_PROJECTS,
		})

		const projects = response.success && response.data ? response.data : xëOm¢G§²ÚîÆ­yÚYˆ
Ú[™İË›ØØ][Û‹œ]˜[YHOOH‹ÚKØ›ÛÚÛX\šÜÈŠHÂ‚B\™]\›‚‚_B‚‚XÛÛœİ\™Ù][[Y[ÈHØİ[Y[œ]Y\TÙ[XİÜ[
‚BH‹˜ÜÜËLMÍ[ÚLœ‹œ‹L]İŒ\œ‹LMY\ÍKœ‹L[[XYLÛ‹œ‹[ÍŞ[œXËœ‹MM™YËœ‹L[MÛœ‹L[Ü]ŒH‹‚JB‚‚]\™Ù][[Y[Ë™›Ü‘XXÚ

[[Y[
HOˆÂ‚BXY]Û•Ñ[[Y[
[[Y[\ÈS[[Y[
B‚_JBŸB‚‹ÊŠ‚ˆ
ˆYÈ[ˆ[\Ü]ÛˆÈH›ÛÚÛX\šÈ›Û\ˆ[[Y[ˆ
‹Â™[˜İ[ÛˆY]Û•Ñ[[Y[
[[Y[ˆS[[Y[
HÂ‚ZYˆ
[[Y[œ]Y\TÙ[XİÜŠ–Ù]K\İ\\›Y[[ÜKX]Û—HŠJHÂ‚B\™]\›‚‚_B‚‚[ØYÜXÙQÜ›İ\ÚÑ›ÛÊ
B‚‚XÛÛœİ]ÛˆHÜ™X]TØ]™UÙY][[Y[
\Ş[˜È

HOˆÂ‚BXÛÛœİ\›H[[Y[™Ù]]šX]Jš™YˆŠB‚BXÛÛœİ›ÛÚÛX\šĞÛÛXİ[Û’YH\›ËœÜ]
‹ÈŠKœÜ

B‚BZYˆ
›ÛÚÛX\šĞÛÛXİ[Û’Y
HÂ‚BBX]ØZ]ÚİÑ›Û\”›Ú™XİÙ[Xİ[Û“[Ù[
›ÛÚÛX\šĞÛÛXİ[Û’Y
B‚B_B‚_JB‚‚X]Û‹œÙ]]šX]J™]K\İ\\›Y[[ÜKX]Ûˆ‹YHŠB‚‚Y[[Y[˜\[™Ú[
]ÛŠB‚Y[[Y[œİ[K™›^\™Xİ[ÛˆHœ›İÈ‚‚Y[[Y[œİ[K˜[YÛ’][\ÈH˜Ù[\ˆ‚‚Y[[Y[œİ[Kš\İYPÛÛ[H˜Ù[\ˆ‚‚Y[[Y[œİ[K™Ø\HŒL‚‚Y[[Y[œİ[KœY[™ÈHŒL‚ŸB‚‹ÊŠ‚ˆ
ˆÚİÜÈH›Ú™XİÙ[Xİ[Ûˆ[Ù[›Üˆ›Û\ˆ[\ÜÂˆ
‹Â˜\Ş[˜È[˜İ[ÛˆÚİÑ›Û\”›Ú™XİÙ[Xİ[Û“[Ù[
›ÛÚÛX\šĞÛÛXİ[Û’Yˆİš[™ÊHÂ‚X]ØZ]ØYÜXÙQÜ›İ\ÚÑ›ÛÊ
B‚‚XÛÛœİ[Ù[HÜ™X]T›Ú™XİÙ[Xİ[Û“[Ù[
‚BV×K‚BX\Ş[˜È
Ù[XİY›Ú™Xİ
HOˆÂ‚BB[[Ù[œ™[[İ™J
B‚‚BB]HÂ‚BBBX]ØZ]œ›İÜÙ\‹œ[[YKœÙ[™Y\ÜØYÙJÂ‚BBBB]\NˆQTÔĞQÑWÕTTËUÒÒSTÔ•ĞS‚BBBBZ\Ñ›Û\’[\ÜˆYK‚BBBBX›ÛÚÛX\šĞÛÛXİ[Û’Yˆ›ÛÚÛX\šĞÛÛXİ[Û’Y‚BBBB\Ù[XİY›Ú™XİˆÙ[XİY›Ú™Xİ‚BBB_JB‚BB_HØ]Ú
\œ›ÜŠHÂ‚BBBXÛÛœÛÛK™\œ›ÜŠ‘\œ›Üˆ[\Ü[™È›ÛÚÛX\šÜÎˆ‹\œ›ÜŠB‚BB_B‚B_K‚BJ
HOˆÂ‚BB[[Ù[œ™[[İ™J
B‚B_K‚JB‚‚YØİ[Y[˜›ÙK˜\[™Ú[
[Ù[
B‚‚]HÂ‚BXÛÛœİ™\ÜÛœÙHH]ØZ]œ›İÜÙ\‹œ[[YKœÙ[™Y\ÜØYÙJÂ‚BBXXİ[ÛˆQTÔĞQÑWÕTTË‘‘UÒÔ“Ò‘PÕË‚B_JB‚‚BZYˆ
™\ÜÛœÙKœİXØÙ\ÜÈ	‰ˆ™\ÜÛœÙK™]JHÂ‚BBXÛÛœİ›Ú™XİÈH™\ÜÛœÙK™]B‚BB]\]S[Ù[Ú]›Ú™XİÊ[Ù[›Ú™XİÊB‚B_H[ÙHÂ‚BBXÛÛœÛÛK™\œ›ÜŠ‘˜Z[YÈ™]Ú›Ú™XİÎˆ‹™\ÜÛœÙK™\œ›ÜŠB‚BB]\]S[Ù[Ú]›Ú™XİÊ[Ù[×JB‚B_B‚_HØ]Ú
\œ›ÜŠHÂ‚BXÛÛœÛÛK™\œ›ÜŠ‘\œ›Üˆ™]Ú[™È›Ú™XİÎˆ‹\œ›ÜŠB‚B]\]S[Ù[Ú]›Ú™XİÊ[Ù[×JB‚_BŸB‚‹ÊŠ‚ˆ
ˆ\]\ÈH[Ù[Ú]™]ÚY›Ú™XİÂˆ
‹Â™[˜İ[Ûˆ\]S[Ù[Ú]›Ú™XİÊ‚[[Ù[ˆS[[Y[‚\›Ú™XİÎˆ\œ˜^OÈYˆİš[™ÎÈ˜[YNˆİš[™ÎÈÛÛZ[™\•YÎˆİš[™ÈO‹ŠHÂ‚XÛÛœİÙ[XİH[Ù[œ]Y\TÙ[XİÜŠˆÜ›Ú™Xİ\Ù[XİŠH\ÈSÙ[Xİ[[Y[‚ZYˆ
\Ù[Xİ
H™]\›‚‚‚]Ú[H
Ù[Xİ˜Ú[™[‹›[™İˆJHÂ‚B\Ù[Xİœ™[[İ™PÚ[
Ù[Xİ˜Ú[™[–ÌWJB‚_B‚‚ZYˆ
›Ú™XİË›[™İOOH
HÂ‚BXÛÛœİ›Ô›Ú™XİÓÜ[ÛˆHØİ[Y[˜Ü™X]Q[[Y[
›Ü[ÛˆŠB‚B[›Ô›Ú™XİÓÜ[Û‹˜[YHHˆ‚‚B[›Ô›Ú™XİÓÜ[Û‹^ÛÛ[H“›È›Ú™XİÈ]˜Z[X›H‚‚B[›Ô›Ú™XİÓÜ[Û‹™\ØX›YHYB‚B\Ù[Xİ˜\[™Ú[
›Ô›Ú™XİÓÜ[ÛŠB‚‚BXÛÛœİ[\Ü]ÛˆH[Ù[œ]Y\TÙ[XİÜŠ‚BBH˜]Û›\İXÚ[‹‚BJH\ÈS]Û‘[[Y[‚BZYˆ
[\Ü]ÛŠHÂ‚BBZ[\Ü]Û‹™\ØX›YHYB‚BBZ[\Ü]Û‹œİ[K˜ÜÜÕ^H‚BBB\Y[™ÎˆLMœÂ‚BBBX›Ü™\ˆ\ÛÛY™Ø˜JMKMKMKŒJNÂ‚BBBX›Ü™\‹\˜Y]\ÎˆLœÂ‚BBBX˜XÚÙÜ›İ[™ˆ™Ø˜JMKMKMKŒJNÂ‚BBBXÛÛÜˆ™Ø˜JMKMKMKŒÊNÂ‚BBBY›Û\Ú^™NˆMÂ‚BBBY›Û]ÙZYÚˆLÂ‚BBBXİ\œÛÜˆ›İX[İÙYÂ‚BBB]˜[œÚ][Ûˆ[ŒœÈX\ÙNÂ‚BBX‚B_B‚_H[ÙHÂ‚B\›Ú™XİË™›Ü‘XXÚ

›Ú™Xİ
HOˆÂ‚BBXÛÛœİÜ[ÛˆHØİ[Y[˜Ü™X]Q[[Y[
›Ü[ÛˆŠB‚BB[Ü[Û‹˜[YHH›Ú™XİšY‚BB[Ü[Û‹^ÛÛ[H›Ú™Xİ›˜[YB‚BB[Ü[Û‹™]\Ù]˜ÛÛZ[™\•YÈH›Ú™Xİ˜ÛÛZ[™\•YÂ‚BB\Ù[Xİ˜\[™Ú[
Ü[ÛŠB‚B_JB‚_BŸB