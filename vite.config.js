import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import themePlugin from "@replit/vite-plugin-shadcn-theme-json";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
const manualChunks = (id) => {
    if (!id.includes("node_modules")) {
        return;
    }
    const modulePath = id.split("node_modules/")[1] ?? id;
    if (modulePath.startsWith("react/") ||
        modulePath.startsWith("react-dom/") ||
        modulePath.startsWith("scheduler/")) {
        return "vendor-react-core";
    }
    if (modulePath.startsWith("wouter/"))
        return "vendor-routing";
    if (modulePath.startsWith("@tanstack/react-query/"))
        return "vendor-query";
    if (modulePath.startsWith("@radix-ui/"))
        return "vendor-radix";
    if (modulePath.startsWith("recharts/") ||
        modulePath.startsWith("recharts-scale/") ||
        modulePath.startsWith("victory-vendor/") ||
        modulePath.startsWith("d3-"))
        return "vendor-charts";
    if (modulePath.startsWith("framer-motion/"))
        return "vendor-motion";
    if (modulePath.startsWith("lucide-react/") || modulePath.startsWith("react-icons/"))
        return "vendor-icons";
    if (modulePath.startsWith("react-hook-form/") || modulePath.startsWith("@hookform/")) {
        return "vendor-forms";
    }
    if (modulePath.startsWith("date-fns/") || modulePath.startsWith("react-day-picker/")) {
        return "vendor-dates";
    }
    // Let Rollup place remaining vendor modules automatically to avoid chunk cycles.
    return;
};
export default defineConfig({
    plugins: [
        react(),
        runtimeErrorOverlay(),
        themePlugin(),
        ...(process.env.NODE_ENV !== "production" &&
            process.env.REPL_ID !== undefined
            ? [
                await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer()),
            ]
            : []),
    ],
    resolve: {
        alias: {
            "@": path.resolve(import.meta.dirname, "client", "src"),
            "@shared": path.resolve(import.meta.dirname, "shared"),
            "@assets": path.resolve(import.meta.dirname, "attached_assets"),
        },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
        outDir: path.resolve(import.meta.dirname, "dist/public"),
        emptyOutDir: true,
        rollupOptions: {
            output: {
                manualChunks,
            },
        },
    },
});
