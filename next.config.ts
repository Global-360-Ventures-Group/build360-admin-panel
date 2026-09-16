import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // `forbidden()` is how every screen turns a missing permission into a 403
    // instead of a blank page. It is still gated behind this flag, and without
    // it the call throws "forbidden() is experimental..." — so the permission
    // check produced a crash rather than the denial UI.
    authInterrupts: true,
    serverActions: {
      // Images are uploaded through Server Actions, whose body defaults to a
      // 1MB cap — small enough that a single phone photo failed the whole
      // submission with a 413. The client shrinks pictures before sending
      // (see `@/lib/images`), so this is headroom rather than the budget:
      // `MAX_BATCH_BYTES` there keeps a submission near 3MB, and the rest
      // absorbs multipart overhead and the form's other fields.
      //
      // Not raised further on purpose. Most serverless hosts refuse request
      // bodies over about 4.5MB before Next.js ever sees them, so a larger
      // number here would work locally and fail once deployed.
      bodySizeLimit: "4mb",
    },
  },
  images: {
    remotePatterns: [
      // Brand, category and product images live in the API's R2 bucket and are
      // served publicly from here. next/image refuses unlisted hosts, so
      // logos would render as broken without this entry.
      {
        protocol: "https",
        hostname: "storage.build360bd.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
