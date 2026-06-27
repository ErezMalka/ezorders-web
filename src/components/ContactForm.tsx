"use client";

import { useState } from "react";
import { CTAButton } from "./CTAButton";

export function ContactForm({ title = "Let’s chat" }: { title?: string }) {
  const [agree, setAgree] = useState(false);

  return (
    <form
      className="rounded-card bg-white p-8 shadow-lg"
      onSubmit={(e) => e.preventDefault()}
    >
      <h3 className="mb-6 text-center text-2xl font-semibold">{title}</h3>
      <div className="space-y-4">
        <input
          placeholder="Full name"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-indigo"
        />
        <input
          type="email"
          placeholder="Email"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-indigo"
        />
        <input
          placeholder="Phone"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-indigo"
        />
        <textarea
          placeholder="Message"
          rows={4}
          className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-brand-indigo"
        />
      </div>
      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
        />
        I read and approve{" "}
        <a href="/privacy" className="text-brand-pink underline">
          privacy policy.
        </a>
      </label>
      <button
        type="submit"
        className="mt-5 rounded-pill bg-brand-pink px-9 py-3 font-medium text-white transition hover:bg-brand-pinkDark"
      >
        Submit
      </button>
    </form>
  );
}