import { CTAButton } from "@/components/CTAButton";
import { SIGNUP_URL } from "@/data/content";

export function AboutUs() {
  return (
    <section className="bg-brand-grey py-20">
      <div className="mx-auto grid max-w-container items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <h2 className="text-4xl font-bold md:text-5xl">
            <span className="text-brand-indigo">About</span> Us
          </h2>
          <div className="mt-6 space-y-4 text-brand-muted">
            <p>
              At EZORDERS, we revolutionize restaurant operations with our
              top-notch ordering system solutions. With industry expertise and a
              customer-centric approach, we deliver innovative technology that
              simplifies ordering, enhances experiences, and drives business
              growth.
            </p>
            <p>
              Our comprehensive system offers digital menus, intuitive online
              ordering, and sleek kiosk stands. Customers can browse, customize,
              and pay securely from any device. Say goodbye to traditional
              order-taking with our direct ordering kiosks, reducing wait times
              and boosting satisfaction.
            </p>
            <p>
              We pride ourselves on exceptional customer service, tailoring
              solutions to meet specific needs. Whether you’re a small eatery or
              a large chain, our scalable and customizable system fits your
              requirements.
            </p>
            <p>
              Join satisfied clients and unlock streamlined operations, increased
              revenue, and happier customers. Contact us today to revolutionize
              your restaurant’s ordering process.
            </p>
          </div>
          <CTAButton href={SIGNUP_URL} className="mt-8">
            Try Free for 14 Days
          </CTAButton>
        </div>
        <div className="flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/about-chef.svg"
            alt="Chef"
            className="max-h-[460px] w-auto"
          />
        </div>
      </div>
    </section>
  );
}
