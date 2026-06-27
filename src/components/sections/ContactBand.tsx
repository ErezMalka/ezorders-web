import { ContactForm } from "@/components/ContactForm";

export function ContactBand() {
  return (
    <section className="mx-auto max-w-container px-6 py-20">
      <div className="grid items-center gap-10 rounded-card bg-brand-indigo p-10 md:grid-cols-2 md:p-16">
        <div className="text-white">
          <h2 className="mb-6 text-4xl font-bold md:text-5xl">Let’s Talk</h2>
          <p className="text-lg text-white/90">
            Ready to take your restaurant to the next level? Whether you have
            questions or want to see how EZorders can help grow your business,
            we’re here to chat. Contact us today and let’s start building your
            success together!
          </p>
        </div>
        <ContactForm />
      </div>
    </section>
  );
}