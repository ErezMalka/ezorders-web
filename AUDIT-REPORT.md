# דו"ח סריקת עומק — ezorders-web

> **סטטוס:** שלב אבחון בלבד. לא שונה/נמחק שום קובץ קוד — הקובץ היחיד שנוצר הוא דו"ח זה.
> **תאריך:** 22.07.2026
> **גרסת קוד שנבדקה:** `origin/main` @ `86adc2f` (לאחר משיכת 69 קומיטים עדכניים).
> **סטאק:** Next.js 15.5.x (App Router), React 18.3, TypeScript 5, Tailwind 3.4, Resend. דו-לשוני — **עברית ברירת מחדל תחת `/he`, אנגלית תחת `/en`**.

---

## תקציר מנהלים

הבסיס ההנדסי **בריא**: `next build` עובר נקי (34 עמודים), `tsc` נקי, אזהרת lint אחת בלבד, ואפס פגיעויות critical. מאז הגרסה הקודמת בוצעו שיפורים משמעותיים שסגרו רבים מהפערים: הוחל **ניתוב מבוסס locale** (`middleware.ts` מפנה `/`→`/he`, עברית ברירת מחדל), **טופס הלידים עבר ל-Resend** עם הגבלת קצב ו-CAPTCHA רדום (Turnstile), נוספו **sitemap.ts / robots.ts / opengraph-image / JSON-LD**, נבנה **מחשבון מחירים אמיתי בשקלים** (`PricingCalculator`), ונוספו עמודי `platform` ו-`pos` עשירים ומתורגמים היטב.

עם זאת נותרו כמה בעיות מהותיות. **החמורה ביותר:** למרות שעברית היא כעת שפת ברירת המחדל, כל עמוד עברי עדיין מוגש עם `<html lang="en">` וללא `dir="rtl"` ברמת המסמך — כך שדווקא החוויה הראשית של האתר משדרת שפה שגויה למנועי החיפוש וחסרה סימון RTL תקין. שנית, **האסימטריה בין השפות נמשכת**: עמודי המוצר באנגלית משתמשים בקומפוננטה משותפת (`ProductPageLayout`) עם טבלת מחירים/FAQ/ContactBand, בעוד עמודי המוצר בעברית נכתבו ידנית ב-`createElement` עם סגנונות inline — חסרים סקשנים שלמים, וה-`he` data שכבר קיים בקבצים **לא בשימוש (קוד מת)**. שלישית, נותרו **באגי תוכן באנגלית** (H1 שבור בקיוסק, כותרת "How it's benefits" שגויה, תשובות FAQ ריקות, ו-`’` שמרונדר מילולית בעמוד צור-קשר).

מבחינת **נגישות** (תקן 5568 / WCAG 2.0 AA): הוורוד `#F05D86` עדיין נכשל בניגודיות (3.17:1) ככפתור ה-CTA הראשי, ואין `focus-visible` כמעט בשום מקום. **אבטחה:** 4 high + 1 moderate transitive (רובן דרך Next/sharp), בסיכון נמוך לאתר סטטי; חסרים security headers. **עדיפויות:** (1) תיקון lang/dir ל-Hebrew, (2) יישור עמודי המוצר בעברית לאנגלית, (3) באגי תוכן שנותרו + עמוד `/en/price` הישן, (4) נגישות (ניגודיות+פוקוס), (5) hreflang דו-כיווני, (6) ניקוי קוד מת.

---

## מה כבר תוקן מאז הגרסה הקודמת ✅

| נושא | סטטוס |
|------|-------|
| ניתוב שפות + עברית ברירת מחדל | ✅ `middleware.ts` — `/`→`/he`, `/en` לאנגלית |
| ערוץ לידים | ✅ עבר ל-Resend + rate-limit (5/10 דק') + Turnstile רדום + honeypot |
| sitemap / robots / OG image / JSON-LD | ✅ נוספו (`sitemap.ts`, `robots.ts`, `opengraph-image.tsx`, Organization schema בלייאאוט) |
| מחשבון מחירים | ✅ `PricingCalculator` אמיתי בשקלים עם מדרגות הנחה והעתקת הצעה |
| CTA "קבעו דמו" | ✅ קיים (`homeContent.ts` — "קבעו דמו עכשיו") |
| אימייל צור-קשר לא עקבי | ✅ תוקן — `contact@ezorders.com` בשתי השפות |
| עמודי platform/pos | ✅ חדשים, תוכן אמיתי ומתורגם בשתי השפות |

---

## 🔴 ממצאים קריטיים (לתקן מיד)

### C1. עמודי עברית (השפה הראשית!) מוגשים עם `<html lang="en">` ובלי `dir="rtl"`
**קבצים:** `src/app/layout.tsx:67` (`<html lang="en">` קבוע, בלי dir) + `src/app/he/layout.tsx:9-13` (מגדיר `lang`/`dir` רק על `<div>` פנימי).
כעת שעברית היא ברירת המחדל, זו הבעיה החמורה ביותר: השורש `/` מפנה ל-`/he`, אך המסמך עדיין `lang="en"` ללא `dir="rtl"`. מנועי חיפוש קוראים את התוכן הראשי כאנגלית, וחוסר dir ברמת ה-`<html>` פוגע ב-bidi/scrollbars/פיסוק. גם `src/i18n/config.ts:5` עדיין `defaultLocale = "en"` — לא עקבי עם הניתוב.
**תיקון:** לעבור למבנה `app/[locale]/layout.tsx` שמגדיר `<html lang dir>` דינמית לפי ה-locale (או, כפתרון ביניים, להזריק `lang`/`dir` נכונים דרך הלייאאוט של `/he`). זהו השורש של רבות מבעיות ה-RTL/SEO.

### C2. כותרת H1 שבורה בעמוד kiosk-stands (אנגלית)
**קובץ:** `src/data/products/kiosk-stands.ts:6` → `titleParts: ["The area of ", "lines", " has over."]`
מרונדר כ-H1 "The area of lines has over." — חסר פשר. העברית תקינה (`:40` "עידן התורים הארוכים נגמר").
**תיקון:** `["The era of ", "long lines", " is over."]`.

### C3. עמודי המוצר בעברית חסרי סקשנים ואינם שקולים לאנגלית
**קבצים:** `src/app/he/{digital-menus,kiosk-stands,restaurant-ordering-app,restaurant-ordering-website}/page.tsx` — כולם `createElement` עם סגנונות inline (`#e5306f`, `#555`).
האנגלית משתמשת ב-`ProductPageLayout` הכולל hero image, כרטיסי תכונות עם אייקונים, כרטיסי יתרונות, **PricingTable**, **FAQ** ו-**ContactBand** (`ProductPageLayout.tsx:114,117,120`). העברית = section יחיד עם h1/lead + תמונה + פסקאות + קישור CTA. **חסרים בעברית: טבלת מחירים, FAQ, אייקונים/כרטיסים, ContactBand.** בנוסף, ה-`he` data ב-`src/data/products/*.ts` שכבר מכיל את כל התוכן **אינו בשימוש כלל** (הטקסט משוכפל קשיח בתוך ה-page) — קוד מת.
**תיקון:** להכליל את `ProductPageLayout` שיקבל `locale` ולצרוך `getXContent(locale)`, ולהעביר את עמודי העברית לאותה קומפוננטה. פותר במכה אחת את הפער התוכני, את הכפילות ואת ה-data המת.

---

## 🟡 ממצאים חשובים (לתקן בקרוב)

### I1. hreflang לא-הדדי — 9 מ-12 עמודי אנגלית ללא `alternates`
**קבצים:** כל עמודי `/he` מגדירים `alternates.languages`, אך בצד האנגלי רק `en/platform`, `en/pos`, `en/privacy` מגדירים. חסרים: `en/`(בית), `en/about`, `en/contact`, `en/digital-menus`, `en/kiosk-stands`, `en/price`, `en/restaurant-ordering-app`, `en/restaurant-ordering-website`, `en/solutions`.
hreflang דורש הדדיות; תיוג חד-צדדי (he→en בלבד) מנוטרל ע"י Google. רק 3 מ-12 הזוגות תקינים. (ה-sitemap כן פולט hreflang הדדי, אך Google מטפל בתגי-עמוד ו-sitemap בנפרד.)
**תיקון:** להוסיף `alternates.languages` לכל עמודי האנגלית, מקבילים לעברית. שקול קומפוננטת metadata משותפת שמייצרת את ה-alternates אוטומטית מהנתיב.

### I2. `/en/price` עדיין משתמש ב-PricingTable הישן — מתג שבור, דולרים, סטטיסטיקות אפס
**קבצים:** `src/app/en/price/page.tsx:18` (משתמש ב-`PricingTable`), `src/components/sections/PricingTable.tsx:11,62`.
בעוד `/he/price` קיבל את המחשבון החדש (₪, עובד), עמוד המחירים באנגלית נותר עם הקומפוננטה הישנה: (א) המתג חודשי/שנתי (`:11,26-44`) — ה-state `yearly` לא נקרא, המחיר לא משתנה; (ב) מחירים ב-`$` (`:62`); (ג) `StatsStrip` מתחתיו מציג "0M / 0h / 0k+ / 0+".
**תיקון:** להתאים ל-`PricingCalculator` (עם locale/EN + מטבע), או לפחות לתקן את המתג ולמלא סטטיסטיקות. ראה I3/I8.

### I3. ניגודיות צבעים נכשלת ב-WCAG AA (תקן 5568)
**קבצים:** `src/components/CTAButton.tsx:17` (`bg-brand-pink text-white`, כפתור ראשי בכל האתר), וכן טקסט ורוד קטן ב-`PricingCalculator.tsx:190,240,437,444,603`, `Hero.tsx:52`, `PricingTable.tsx:15`, `PosPage.tsx:19,54,108`, `PlatformPage.tsx:49,60,98…`, `ProductPageLayout.tsx:42`, `TrustedUsers` (הוסר) / `ConnectedRestaurant.tsx:122`.
לבן על `#F05D86` ו-`#F05D86` על לבן ≈ **3.17:1** — נכשל בסף 4.5:1 לטקסט רגיל. (`brand-muted #5F6575` ≈ 5.8:1 — עובר.)
**תיקון:** להכהות ורוד לטקסט/כפתורים ל-`~#D6336C` (≈4.6:1) או להשתמש ב-`brand-pinkDark`, ולוודא ≥4.5:1.

### I4. אין `focus-visible` כמעט בשום מקום — ניווט מקלדת
**קבצים:** היחיד שמצא הוא `ContactForm.tsx:89`. חסר ב-`CTAButton.tsx`, `FAQ.tsx:16`, `SampleApps.tsx:33-68`, `PricingCalculator.tsx` (צ'קבוקסים/steppers/כפתורים), `Header.tsx` (ניווט+המבורגר+drawer), `LanguageSwitcher.tsx:47`.
כשל WCAG 2.4.7 / חוסם 5568.
**תיקון:** להוסיף `focus-visible:ring-2 focus-visible:ring-brand-indigo` (או outline) לכל אלמנט אינטראקטיבי.

### I5. ה-drawer במובייל נשאר ב-DOM ובסדר ה-Tab כשהוא סגור, ובלי מלכודת פוקוס
**קובץ:** `src/components/Header.tsx:150-166`.
הפאנל תמיד מרונדר; כשסגור הוא רק מוזז מהמסך ב-`translateX(100%)`, אך אין עליו `pointerEvents:none`/`inert` — משתמשי מקלדת נכנסים בטאב לקישורים בלתי-נראים, וקוראי מסך מכריזים `role="dialog" aria-modal` שקיים תמיד. בנוסף אין העברת פוקוס לתוך ה-drawer בפתיחה/החזרתו בסגירה ואין focus-trap (למרות שיש Escape + נעילת גלילה + aria-expanded — טוב).
**תיקון:** למסך/`inert` את הפאנל כשסגור; בפתיחה להעביר פוקוס פנימה ולכלוא אותו; בסגירה להחזיר לכפתור.

### I6. תשובות FAQ ריקות בכל 4 קובצי המוצר (אנגלית)
**קבצים:** `digital-menus.ts:31-34`, `kiosk-stands.ts:31-34`, `restaurant-ordering-app.ts:31-34`, `restaurant-ordering-website.ts:31-34` — רק פריט 1 עם `a`; ארבעה נוספים `q` בלבד, מרונדרים ככותרות עם תשובה ריקה (`ProductPageLayout.tsx:117`). (בעברית `faq: []` — אין FAQ כלל.)
**תיקון:** למלא תשובות, ולהוסיף FAQ גם לעברית (במסגרת C3).

### I7. כותרת יתרונות שבורה דקדוקית — 4 קובצי מוצר + homeContent
**קבצים:** `digital-menus.ts:21`, `kiosk-stands.ts:21`, `restaurant-ordering-app.ts:21`, `restaurant-ordering-website.ts:21`, וגם `src/data/homeContent.ts:52` — כולם "How it's benefits your business?" (צ"ל "How does it benefit…"). העברית נכונה.
**תיקון:** לתקן את הניסוח האנגלי בכל המופעים.

### I8. StatsStrip מציג "0" וטסטימוניאלים גנריים
**קבצים:** `src/data/pricingContent.ts:44-47,77-80` (כל הערכים "0" → "0M/0h/0k+/0+", ולייבל "0M Client Satisfaction" חסר פשר) ו-`:52-55,85-88` (Sarah/Mark/Amanda/David — נראים מומצאים). מרונדר ב-`/en/price` ו-`/he/price`.
**תיקון:** למלא מספרים אמיתיים או להסתיר; להחליף לטסטימוניאלים אמיתיים.

### I9. `’` מרונדר מילולית בעמוד צור-קשר (אנגלית)
**קובץ:** `src/app/en/contact/page.tsx:39-40` — הטקסט "…and we’ll get back…" הוא **טקסט JSX**, כך ש-`’` אינו מפוענח ומוצג מילולית "we’ll".
**תיקון:** להחליף ל-`we'll` (גרש רגיל) או `{"’"}`.

### I10. מחרוזות ואיזורים לא-מתורגמים / hardcoded
**קבצים:** `PricingCalculator.tsx` (כולו עברית קשיחה + `dir="rtl"` קבוע + CTA ל-`/he/contact` — לא שמיש תחת `/en`), `ConnectedRestaurant.tsx:119` (`dir="rtl"` קבוע, תוכן עברי בלבד), `FAQ.tsx:12` (כותרת "FAQ" קשיחה), `Logo.tsx:8-10` (תגית "Digital in one click" באנגלית), aria-labels באנגלית ב-`Header.tsx:96,193` ("Open/Close menu") ו-`SampleApps.tsx:35,52,64` ("Previous/Next/Go to slide").
**תיקון:** להעביר מחרוזות לשכבת locale ולהזרים `locale`/`dir`.

### I11. חסרים security headers
**קובץ:** `next.config.js` (רק `reactStrictMode`). אין CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
**תיקון:** להוסיף `async headers()` עם הכותרות הנ"ל.

### I12. פגיעויות תלויות (npm audit)
**תוצאה:** 4 high + 1 moderate, **0 critical**. `sharp <0.35.0` (high, דרך next/image, CVE-2026 ב-libvips), `postcss <8.5.10` (moderate, דרך next), `brace-expansion`+`js-yaml` (high, dev בלבד — לא ב-production). סיכון בפועל נמוך לאתר סטטי ללא העלאות משתמש.
**תיקון:** `npm update next sharp postcss` (לא `npm audit fix --force` — מציע downgrade ל-next@9). לוודא build עובר אחרי.

---

## 🟢 שיפורים מומלצים (nice to have)

### G1. redirect של `/` צריך להיות 307 ולא 308
**קובץ:** `src/middleware.ts:33` — ההחלטה תלוית-cookie (`NEXT_LOCALE`) אך מוחזר 308 (permanent). דפדפנים/CDN מקאשים 308 בתוקפנות, כך שמבקר ראשון (בלי cookie) עלול "להינעל" על `/he` גם אחרי מעבר לאנגלית. redirect תלוי-cookie צריך 307 (temporary). (ה-308 של הנתיבים הישנים ב-`:39` תקין.)

### G2. ניקוי קוד מת וקבצי זבל
- **`src/data/content.ts`** — רק `SIGNUP_URL` בשימוש; כל השאר מת (`nav`, `footer*`, `homeServices/Benefits/Process`, `pricingPlans`, `testimonials`, `stats`) והוחלף ע"י `homeContent.ts`/`pricingContent.ts`/dictionaries. הקובץ עדיין מכיל את טקסט ה-placeholder הישן של השליחים (`:45,49,54,80`) — לא מרונדר, אך זבל בריפו. לצמצם ל-`SIGNUP_URL` בלבד.
- **ה-`he` exports** ב-`src/data/products/*.ts` — מתים (עמודי העברית hardcoded). ייפתר עם C3.
- **קבצי זבל:** `src.zip`, `src/app/1.txt` (ריק), `public/images/1.txt` (ריק), `src/i18n/_wf_test_delete_me.txt`, `assets/homepage/hero-image-prompt.md`.
- **עמוד `/connected`** — עמוד preview יתום שלא מקושר משום מקום, מרנדר את `ConnectedRestaurant`. גרוע יותר: הוא כעת **רשום ב-`sitemap.ts:31-33`** וניתן לאינדוקס (`robots.ts` מתיר הכל) — כלומר עמוד preview פנימי נחשף למנועי חיפוש. להסיר את שניהם (או להוציא מה-sitemap ולהוסיף noindex).

### G3. RTL — מחלקות פיזיות במקום לוגיות
`SampleApps.tsx:33-56` (`left-0`/`right-0` + חצים `‹`/`›` שלא מתהפכים ב-RTL — שגוי בשפה הראשית), `ProcessStep.tsx:11` (`left-6`), `FriendlyProcess.tsx:15` (`text-left`), `FAQ.tsx:17` (`text-left`), `PricingCalculator.tsx:317` (`text-left`). (חיובי: ה-Header כבר עבר לרובו ללוגי — `start-0`, `ps-5`.)
**תיקון:** `start`/`end`/`ms`/`me`/`text-start`.

### G4. metadata ונקודות SEO משניות
- `robots.ts:12` — `host` הוא דיירקטיבה של Yandex בלבד (Google/Bing מתעלמים) וכולל scheme; לא מזיק אך חסר ערך.
- תבנית הכותרת `template: "%s"` (`layout.tsx:18`) היא no-op; כל עמוד מזין `" - ezorders"` ידנית. `title.default` הוא `"ezorders"` באותיות קטנות.
- `openGraph.locale` הוא `en_US` (`layout.tsx:41`) — כדאי `he_IL` כשעברית ראשית.
- אין `alternates.canonical` בשום עמוד — כדאי canonical עצמי לכל עמוד.

### G5. ביצועים — תמונות ופונט עברי
- `ProductPageLayout.tsx:52` ו-`solutions/page.tsx` משתמשים ב-`<img>` גולמי במקום `next/image` (מפספסים אופטימיזציה/srcset). עמודי המוצר בעברית משתמשים ב-`<img loading="lazy">` ידני (`he/digital-menus/page.tsx:30`).
- **פונט:** נטען רק **Poppins** subset `latin` (`layout.tsx:5-10`). אין פונט/subset עברי — לטקסט עברי אין גליפים ב-Poppins והוא נופל ל-system font. מומלץ `next/font` עברי (Assistant/Heebo, `subsets:["hebrew"]`) מקושר ל-`<html>` בעברית.

### G6. נגישות — פרטים
- גדלי מגע: המבורגר `Header.tsx:187` (~24px) וכפתור הסגירה `:91` (36px) מתחת ל-44px.
- `FAQ.tsx:16` — חסר `aria-expanded`/`aria-controls`.
- טלפון קיים בעמוד צור-קשר בעברית (`he/contact:39`) אך חסר באנגלית (`en/contact`).
- `LanguageSwitcher` מבחין בין פעיל ללא-פעיל בעיקר ב-opacity 0.6 (ניגודיות נמוכה ללא-פעיל).

### G7. אזהרת lint
`src/components/sections/ConnectedRestaurant.tsx:92` — `useEffect` עם תלות חסרה (`autoCycle.length`).

---

## טבלת סיכום והערכת מאמץ

מקרא: **S** = עד שעה · **M** = כמה שעות · **L** = יום+.

| # | ממצא | חומרה | תחום | מאמץ |
|---|------|:-----:|------|:----:|
| C1 | עברית מוגשת כ-`<html lang="en">` בלי `dir="rtl"` | 🔴 | SEO/RTL/מבנה | M |
| C2 | H1 שבור ב-kiosk-stands (en) | 🔴 | תוכן | S |
| C3 | עמודי מוצר בעברית חסרי סקשנים + data מת | 🔴 | ארכיטקטורה/דו-לשוני | L |
| I1 | hreflang לא-הדדי ב-9 עמודי אנגלית | 🟡 | SEO | M |
| I2 | `/en/price` — מתג שבור + $ + סטטיסטיקות 0 | 🟡 | UX/מחירים | M |
| I3 | ניגודיות ורוד נכשלת ב-WCAG AA | 🟡 | נגישות | S |
| I4 | אין focus-visible | 🟡 | נגישות | S |
| I5 | drawer במובייל ב-DOM כשסגור + אין focus-trap | 🟡 | נגישות | M |
| I6 | תשובות FAQ ריקות (4 קבצים, en) | 🟡 | תוכן | S |
| I7 | "How it's benefits" שגוי (5 מופעים) | 🟡 | תוכן | S |
| I8 | StatsStrip "0" + טסטימוניאלים גנריים | 🟡 | תוכן/אמינות | S |
| I9 | `’` מרונדר מילולית (en/contact) | 🟡 | תוכן | S |
| I10 | מחרוזות/dir קשיחים לא-מתורגמים | 🟡 | דו-לשוני | M |
| I11 | חסרים security headers | 🟡 | אבטחה | S |
| I12 | פגיעויות תלויות (4 high/1 mod, 0 critical) | 🟡 | אבטחה | S |
| G1 | `/` redirect 308 במקום 307 | 🟢 | SEO/ניתוב | S |
| G2 | קוד מת + `/connected` ב-sitemap | 🟢 | איכות/SEO | S |
| G3 | RTL — מחלקות פיזיות | 🟢 | RTL | M |
| G4 | metadata/robots/canonical משניים | 🟢 | SEO | S |
| G5 | next/image + פונט עברי | 🟢 | ביצועים | M |
| G6 | נגישות — גדלי מגע/aria/טלפון | 🟢 | נגישות | S |
| G7 | אזהרת lint useEffect | 🟢 | איכות | S |

---

## נספח — תוצאות הרצה בפועל

| בדיקה | תוצאה |
|-------|-------|
| `next build` | ✅ עובר — 34 עמודים (סטטיים + `/api/contact` דינמי + middleware), כולל `sitemap.xml`/`robots.txt`/`opengraph-image` |
| `tsc --noEmit` | ✅ נקי (לאחר build נקי; שים לב: `.next/types` מתיישן — יש לרוץ אחרי `rm -rf .next && next build` כדי למנוע שגיאות רפאים) |
| `next lint` | ⚠️ אזהרה אחת — `ConnectedRestaurant.tsx:92` |
| `npm audit` | 4 high + 1 moderate, **0 critical** |

**הערה על ערוץ הלידים:** `src/app/api/contact/route.ts` מיושם היטב — Resend לשליחת אימייל, honeypot (`company_url`), rate-limit בזיכרון (5/10 דק'), Turnstile CAPTCHA אופציונלי (רדום עד הגדרת מפתח), הגבלת body 10KB, ולידציה, ו-`replyTo` נכון. **חולשה שנותרה:** ערוץ יחיד ללא fallback — אם Resend מחזיר שגיאה (`:196-199`) הליד אובד והמשתמש מקבל שגיאה גנרית. וכן ה-rate-limit בזיכרון-פר-instance לא אפקטיבי גלובלית ב-serverless (כפי שמצוין בהערה בקוד). מומלץ ערוץ גיבוי (למשל רישום/תור מתמיד או webhook משני) שנכנס לפעולה כשה-send נכשל, ו-store משותף (KV) ל-rate-limit אם נדרשת אכיפה קשיחה.
