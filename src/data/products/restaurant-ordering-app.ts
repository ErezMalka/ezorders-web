import type { ProductContent } from "@/components/ProductPageLayout";
import type { Locale } from "@/data/homeContent";

const en: ProductContent = {
  tag: "Applications Service",
  titleParts: ["Add your ", "restaurant", " to the Mobile world"],
  heroBody:
    "Revolutionize your restaurant business with our user-friendly ordering app. Effortlessly manage online orders, streamline operations, and boost customer satisfaction. Customize your menu, track orders and inventory, and gain valuable business insights. Elevate your restaurant to new heights by joining our app today and unlocking its full potential.",
  heroImage: "/images/app-hero.webp",
  featuresHeading: "Applications Features",
  featuresIntro:
    "Discover a range of powerful features with our all-in-one solution. From Order History to Scratch Coupons and personalized Push Notifications, our app has it all. Enhance customer engagement, boost loyalty, and elevate your business with our feature-rich solution.",
  features: [
    { title: "Push Notifications", icon: "feedback", body: "Boost customer engagement with our Push Notifications feature. Keep them informed and drive sales with targeted messages. Elevate your marketing efforts effortlessly." },
    { title: "Order tracking", icon: "orders", body: "Track orders in real-time with our convenient Order Tracking feature. Keep customers informed about the progress of their orders, from preparation to delivery." },
    { title: "Discount for first order or more", icon: "loyalty", body: "Enjoy exclusive discounts on your first order and beyond with our special offers. Experience the benefits of being a new customer with our enticing promotions." },
    { title: "Order History", icon: "reports", body: "Access your complete Order History at your fingertips. Easily review past orders, reorder your favorites, and keep track of your dining journey." },
    { title: "Scratch coupon", icon: "credit", body: "Unleash the element of surprise with our Scratch Coupon feature. Scratch and reveal exciting discounts, special offers, and rewards." },
    { title: "Online payments", icon: "payments", body: "Experience seamless and secure online payments with our convenient feature. Say goodbye to cash transactions and enjoy the convenience of paying digitally." },
  ],
  benefitsHeading: "How it’s benefits your business?",
  benefitsIntro:
    "Experience benefits like low-cost marketing, improved profitability, and increased average spend per person with our solution. Maximize success and streamline operations effortlessly.",
  benefits: [
    { title: "Low-Cost Marketing", body: "Experience the power of low-cost marketing with our solution. Reach a wider audience and promote your restaurant effectively without breaking the bank." },
    { title: "Improving Profitability", body: "Boost profitability with our solution. Streamline operations, reduce costs, and optimize efficiency to maximize your restaurant's bottom line." },
    { title: "Increase Average Spend Per Person", body: "Increase average spend per person with our solution. Leverage upselling and cross-selling opportunities to encourage customers to explore additional menu items." },
  ],
  faq: [
    { q: "How can push notifications benefit my restaurant?", a: "Push notifications are a powerful marketing tool that allows you to engage customers, keep them informed about special promotions, and ultimately drive sales." },
    { q: "How does the order tracking feature improve the dining experience for customers?" },
    { q: "What discounts or special offers are available for first-time customers and beyond?" },
    { q: "How does the Order History feature benefit restaurant owners?" },
    { q: "What is the Scratch Coupon feature and how does it enhance the dining experience?" },
  ],
};

const he: ProductContent = {
  tag: "שירות אפליקציות",
  titleParts: ["הכניסו את המסעדה שלכם ל", "עולם המובייל", ""],
  heroBody:
    "אפליקציית הזמנות ידידותית שמאפשרת לכם לנהל הזמנות אונליין ללא מאמץ, לייעל את התפעול ולהגביר את שביעות רצון הלקוחות. התאימו את התפריט, עקבו אחר הזמנות ומלאי, וקבלו תובנות עסקיות חשובות — הכל ממקום אחד.",
  heroImage: "/images/app-hero.webp",
  featuresHeading: "יכולות האפליקציה",
  featuresIntro:
    "פתרון הכל-באחד שמעמיק את הקשר עם הלקוחות ומחזיר אותם שוב ושוב.",
  features: [
    { title: "התראות פוש", icon: "feedback", body: "שמרו על הלקוחות מעודכנים והגדילו מכירות באמצעות הודעות ממוקדות ישירות לטלפון. כלי שיווק חזק שמשלב מבצעים ועדכונים ברגע הנכון — בלי מאמץ." },
    { title: "מעקב הזמנות בזמן אמת", icon: "orders", body: "הלקוחות עוקבים אחר ההזמנה שלהם בכל שלב, מההכנה ועד המסירה. שקיפות שמפחיתה פניות שירות ומעלה את רמת האמון והשביעות." },
    { title: "מועדון נאמנות ותשלום מאובטח", icon: "loyalty", body: "היסטוריית הזמנות, הזמנה חוזרת בלחיצה, קופוני גירוד ומבצעי הצטרפות — לצד תשלום דיגיטלי מאובטח ונוח שהופך כל הזמנה לחלקה." },
  ],
  benefitsHeading: "איך זה תורם לעסק שלכם?",
  benefitsIntro:
    "שיווק בעלות נמוכה, רווחיות משופרת וסל ממוצע גבוה יותר — הכל בפתרון אחד.",
  benefits: [
    { title: "שיווק בעלות נמוכה", body: "הגיעו לקהל רחב וקדמו את המסעדה שלכם בצורה אפקטיבית — ישירות דרך האפליקציה, בלי תקציבי מדיה גדולים." },
    { title: "רווחיות משופרת", body: "ייעול התפעול, הפחתת עלויות ואופטימיזציה של יעילות — כדי למקסם את השורה התחתונה של המסעדה שלכם." },
    { title: "סל ממוצע גבוה יותר", body: "מנגנוני אפסייל וקרוס-סייל מעודדים את הלקוחות לגלות פריטים נוספים בתפריט ולהגדיל את היקף ההזמנה בכל רכישה." },
  ],
  faq: [],
};

export const orderingAppContent = { en, he } as const;

export function getOrderingAppContent(locale: Locale = "en") {
  return locale === "he" ? he : en;
}
