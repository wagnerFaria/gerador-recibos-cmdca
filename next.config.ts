import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export", // Necessário para compilar o app e ser carregado pelo Electron
  assetPrefix: "./", // Garante que o Electron ache o CSS/JS usando caminho relativo
  images: {
    unoptimized: true, // Necessário quando se exporta um arquivo estático para desktop offline
  },
};

export default nextConfig;
