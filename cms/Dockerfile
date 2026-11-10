FROM node:24-alpine
WORKDIR /app
COPY lib.mjs translations.mjs forms.mjs ./
COPY studio ./studio
ENV NODE_ENV=production
EXPOSE 8080
USER node
CMD ["node", "studio/server.mjs"]
