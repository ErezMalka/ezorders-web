import type { Metadata } from "next";
import { BlogIndex } from "@/components/article/BlogIndex";
import { blogIndexMetadata } from "@/lib/content/metadata";

export const metadata: Metadata = blogIndexMetadata("en");

export default function EnBlogIndexPage() {
  return <BlogIndex locale="en" />;
}
