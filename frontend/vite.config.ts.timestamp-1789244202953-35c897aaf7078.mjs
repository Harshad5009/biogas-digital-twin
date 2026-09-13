// vite.config.ts
import { defineConfig } from "file:///C:/Users/HARSHAD%20THOK/Downloads/biogas-digital-twin-ESP8266-MQ2-UPDATED/biogas-digital-twin/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/HARSHAD%20THOK/Downloads/biogas-digital-twin-ESP8266-MQ2-UPDATED/biogas-digital-twin/frontend/node_modules/@vitejs/plugin-react/dist/index.js";
import tailwindcss from "file:///C:/Users/HARSHAD%20THOK/Downloads/biogas-digital-twin-ESP8266-MQ2-UPDATED/biogas-digital-twin/frontend/node_modules/@tailwindcss/vite/dist/index.mjs";
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8001",
        changeOrigin: true
      },
      "/ws": {
        target: "ws://localhost:8001",
        ws: true
      }
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxIQVJTSEFEIFRIT0tcXFxcRG93bmxvYWRzXFxcXGJpb2dhcy1kaWdpdGFsLXR3aW4tRVNQODI2Ni1NUTItVVBEQVRFRFxcXFxiaW9nYXMtZGlnaXRhbC10d2luXFxcXGZyb250ZW5kXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxIQVJTSEFEIFRIT0tcXFxcRG93bmxvYWRzXFxcXGJpb2dhcy1kaWdpdGFsLXR3aW4tRVNQODI2Ni1NUTItVVBEQVRFRFxcXFxiaW9nYXMtZGlnaXRhbC10d2luXFxcXGZyb250ZW5kXFxcXHZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9IQVJTSEFEJTIwVEhPSy9Eb3dubG9hZHMvYmlvZ2FzLWRpZ2l0YWwtdHdpbi1FU1A4MjY2LU1RMi1VUERBVEVEL2Jpb2dhcy1kaWdpdGFsLXR3aW4vZnJvbnRlbmQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xuaW1wb3J0IHRhaWx3aW5kY3NzIGZyb20gJ0B0YWlsd2luZGNzcy92aXRlJ1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xuICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG4gIHNlcnZlcjoge1xuICAgIHBvcnQ6IDUxNzMsXG4gICAgcHJveHk6IHtcbiAgICAgICcvYXBpJzoge1xuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vbG9jYWxob3N0OjgwMDEnLFxuICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICB9LFxuICAgICAgJy93cyc6IHtcbiAgICAgICAgdGFyZ2V0OiAnd3M6Ly9sb2NhbGhvc3Q6ODAwMScsXG4gICAgICAgIHdzOiB0cnVlLFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBOGUsU0FBUyxvQkFBb0I7QUFDM2dCLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUV4QixJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztBQUFBLEVBQ2hDLFFBQVE7QUFBQSxJQUNOLE1BQU07QUFBQSxJQUNOLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxRQUNOLFFBQVE7QUFBQSxRQUNSLGNBQWM7QUFBQSxNQUNoQjtBQUFBLE1BQ0EsT0FBTztBQUFBLFFBQ0wsUUFBUTtBQUFBLFFBQ1IsSUFBSTtBQUFBLE1BQ047QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
