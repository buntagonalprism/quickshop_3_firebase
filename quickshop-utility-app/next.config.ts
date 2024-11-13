import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Output to a static html + js bundle */
  output: 'export',

  /* Required due to this issue: https://stackoverflow.com/questions/65487914/error-image-optimization-using-next-js-default-loader-is-not-compatible-with-n */
  images: {
    unoptimized: true,
  }
};

export default nextConfig;
