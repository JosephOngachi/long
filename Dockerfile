FROM node:latest
WORKDIR /app
COPY . /app
RUN npm install
EXPOSE 5002
CMD ["npm","start"]