import type { ProductContent } from "@/components/ProductPageLayout";
import type { Locale } from "@/data/homeContent";

const en: ProductContent = {
  tag: "Website Service",
  titleParts: ["Be ", "exceptional", " through a website"],
  heroBody:
    "Experience convenience and efficiency with our restaurant ordering website. Explore a user-friendly platform to customize orders, make secure payments, and indulge in delectable dining. Embrace technology and unlock your restaurant’s potential with our online ordering website.",
  heroImage: "/images/website-hero.webp",
  featuresHeading: "Website Features",
  featuresIntro:
    "Upgrade your customer experience with our unique restaurant website services. Join us and unlock a range of innovative features that will set your restaurant apart",
  features: [
    { title: "Smart Up Sales System", icon: "sales", body: "Boost sales with our Smart Up Sales System. Utilizing data analytics and customer insights, this system optimizes upselling opportunities. Enjoy cross-selling, discounts, combos, and bonuses. Maximize profits with automatic upgrades, end-of-order promotions, and scratch coupons." },
    { title: "Feature Delivery System", icon: "couriers", body: "Introducing our streamlined Delivery System. Enjoy advanced tracking, optimized assignments, and real-time updates. Enhance customer satisfaction with customizable areas, requirements, fees, and ETAs." },
    { title: "Future ordering system", icon: "attendance", body: "Experience the future of ordering with our innovative Future ordering system. Customers can conveniently pre-order their meals for a specific date and time, allowing them to plan ahead and enjoy a seamless dining experience." },
    { title: "Feature Pizza System and pizza builder", icon: "products", body: "Attention pizzeria owners! Our Pizza System is tailored to meet your needs. With our Pizza Builder feature, customers can easily select their desired toppings, sizes, and even enjoy free toppings." },
    { title: "Feature Differentiation and splitting of working hour", icon: "employees", body: "Optimize your restaurant’s operations with our Work Hour Differentiation feature. Easily manage and allocate staff hours based on shifts and peak times to ensure optimal staffing levels and improved productivity." },
    { title: "Feature Customer Database include orders history", icon: "clients", body: "Access valuable insights with our Customer Database feature, including detailed order history. Leverage this data to personalize marketing, offer targeted promotions, and enhance customer retention." },
  ],
  benefitsHeading: "How it’s benefits your business?",
  benefitsIntro:
    "Get to know the unique benefits of our website and discover a new world of digital efficiency. Elevate your online presence and thrive in the digital landscape with our cutting-edge website.",
  benefits: [
    { title: "Reduce mistakes", body: "Streamline accuracy and eliminate errors. Our online ordering system for restaurants empowers customers to take their time in placing orders, reducing the likelihood of mistakes. They receive a detailed order summary, eliminating any confusion or miscommunication." },
    { title: "Improved customer experience", body: "Our online ordering system offers a convenient and contactless experience, ensuring the safety and comfort of your customers. It's fast and easy to use, allowing customers to place orders quickly and effortlessly." },
    { title: "Increased restaurant sales", body: "Boosted restaurant sales. Our online ordering system helps increase your sales by leveraging enticing features. With attractive dish photos, we catch customers' eyes and drive their appetite." },
  ],
  faq: [
    { q: "How does the ordering system work?", a: "The ordering system works by allowing customers to browse the restaurant’s menu, select their desired items, customize their orders if needed, and make payments securely online." },
    { q: "What is the ordering system?" },
    { q: "What is ordering management?" },
    { q: "What is digital ordering?" },
    { q: "Why is the ordering system important?" },
  ],
};

const he: ProductContent = {
  tag: "שירות אתר הזמנות",
  titleParts: ["אתר הזמנות למסעדה ", "שעובד בשבילכם", ""],
  heroBody:
    "אתר הזמנות אונליין ממותג משלכם, שמלווה את הלקוח מהעיון בתפריט ועד לתשלום המאובטח — בלי עמלות של פלטפורמות חיצוניות. הלקוחות מזמינים בקצב שלהם, בונים את ההזמנה בדיוק כרצונם, ואתם מקבלים כל הזמנה ישירות למטבח, מסודרת וברורה.",
  heroImage: "/images/website-hero.webp",
  featuresHeading: "יכולות מרכזיות",
  featuresIntro:
    "כל מה שמסעדה מודרנית צריכה כדי למכור יותר ולעבוד חכם — במקום אחד.",
  features: [
    { title: "מערכת אפסייל חכמה", icon: "sales", body: "המערכת מזהה הזדמנויות למכירה נוספת ומציעה ללקוח שדרוגים, קומבינציות ומבצעים ברגע הנכון — כך שהסל הממוצע גדל באופן טבעי, בלי לחץ ובלי מכירה אגרסיבית." },
    { title: "ניהול משלוחים מתקדם", icon: "couriers", body: "הגדרת אזורי חלוקה, דמי משלוח וזמני הגעה משוערים, עם מעקב בזמן אמת אחר כל הזמנה. הלקוח יודע בדיוק מתי המנה תגיע, והצוות שלכם שולט בכל שלב." },
    { title: "מסד נתוני לקוחות והיסטוריית הזמנות", icon: "clients", body: "כל הזמנה בונה תמונה מלאה על הלקוחות שלכם. השתמשו בהיסטוריית ההזמנות כדי להתאים מבצעים אישיים, להגביר נאמנות ולהחזיר לקוחות שוב ושוב." },
  ],
  benefitsHeading: "איך זה תורם לעסק שלכם?",
  benefitsIntro:
    "אתר הזמנות טוב לא רק מוכר — הוא מייעל את כל התפעול שלכם.",
  benefits: [
    { title: "פחות טעויות", body: "הלקוח מזמין בעצמו ומקבל סיכום הזמנה מפורט לפני התשלום. אין יותר אי-הבנות בטלפון ואין הזמנות שגויות שמבזבזות זמן וכסף." },
    { title: "חוויית לקוח משופרת", body: "הזמנה מהירה, נוחה וללא מגע, שזמינה מכל מכשיר בכל שעה. הלקוחות נהנים מתהליך פשוט וברור — וחוזרים." },
    { title: "יותר מכירות", body: "תמונות מנות מושכות, המלצות חכמות ותהליך הזמנה חלק — כולם עובדים יחד כדי להגדיל את היקף ההזמנות ואת ההכנסה שלכם." },
  ],
  faq: [],
};

export const orderingWebsiteContent = { en, he } as const;

export function getOrderingWebsiteContent(locale: Locale = "en") {
  return locale === "he" ? he : en;
}
