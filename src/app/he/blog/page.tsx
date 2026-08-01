import type { Metadata } from "next";
import { BlogIndex } from "@/components/article/BlogIndex";
import { blogIndexMetadata } from "@/lib/content/metadata";

export const metadata: Metadata = blogIndexMetadata("he");

export default function HeBlogIndexPage() {
  return <BlogIndex locale="he" />;
}
