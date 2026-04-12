import nextConfig from "eslint-config-next";

const eslintConfig = [
  // Ignore auto-generated Prisma client output.
  { ignores: ["src/generated/**"] },
  ...nextConfig,
];

export default eslintConfig;
