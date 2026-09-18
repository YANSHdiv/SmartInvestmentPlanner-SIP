# Smart Investment Planner — production image.
# Standard Node runtime: the same artefact runs on Railway, Render, Fly, a VM
# or any container host. No platform-specific package or runtime required.
FROM node:22-slim AS build
WORKDIR /app
COPY package.json ./
RUN npm install --no-audit --no-fund
COPY . .

# Client-safe backend settings. These are compiled INTO the browser bundle at
# build time, so they must be present during `npm run build` — a container
# build does not inherit runtime variables. Railway passes matching service
# variables in as build args automatically once declared as ARG here.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID

# Fail the build loudly instead of shipping a bundle that cannot reach the
# backend (that produced the generic "This page didn't load" screen).
RUN test -n "$VITE_SUPABASE_URL" || (echo "ERROR: VITE_SUPABASE_URL is required at build time" && exit 1)
RUN test -n "$VITE_SUPABASE_PUBLISHABLE_KEY" || (echo "ERROR: VITE_SUPABASE_PUBLISHABLE_KEY is required at build time" && exit 1)

# node-server preset -> dist/server/index.mjs + dist/client
ENV NITRO_PRESET=node-server
RUN npm run build

FROM node:22-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
# Railway injects PORT; the Nitro node-server listens on it.
ENV PORT=3000
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["node", "dist/server/index.mjs"]
