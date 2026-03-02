import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export", // Necessário para compilar o app e ser carregado pelo Electron
};

export default nextConfig;
