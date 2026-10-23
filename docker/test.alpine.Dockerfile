FROM node:26.12.1-alpine@sha256:40cd011b55415bc894e45b02fdd5a5dfde056921b7d23a64c74f80497af48797

ARG NPM_VERSION
ENV REWRITER=datadog-wasm-js-rewriter-${NPM_VERSION}.tgz

RUN apk add python3 make g++ curl

WORKDIR /test
COPY ./package.json .
COPY ./package-lock.json .
COPY ./${REWRITER} .

RUN npm ci --ignore-scripts
RUN npm i --verbose ${REWRITER}

COPY . .

ENV NPM_REWRITER=true

CMD ["npm", "run", "test:junit"]
