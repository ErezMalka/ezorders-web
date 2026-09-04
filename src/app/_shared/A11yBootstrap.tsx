/**
 * Re-applies the visitor's saved accessibility settings before the page
 * paints, so someone who chose high contrast yesterday does not get a flash
 * of the default page while React hydrates the widget.
 *
 * Inline and synchronous on purpose: it is ~300 bytes, reads one localStorage
 * key, and must run before first paint — a deferred module would not. The
 * class names and the font-scale table must match AccessibilityWidget.tsx.
 */
const SCRIPT = `(function(){try{var s=JSON.parse(localStorage.getItem("ezorders-a11y")||"{}");var r=document.documentElement;var m={contrast:"a11y-contrast",links:"a11y-links",readableFont:"a11y-font",noMotion:"a11y-no-motion",bigCursor:"a11y-cursor",lineHeight:"a11y-line-height"};for(var k in m){if(s[k])r.classList.add(m[k]);}var f=[1,1.15,1.3,1.5][s.fontScale||0];if(f&&f!==1)r.style.setProperty("--a11y-font-scale",String(f));}catch(e){}})();`;

export function A11yBootstrap() {
  return <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />;
}
