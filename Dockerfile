FROM node:6

## Make a directory for our app.
RUN mkdir -p /usr/src/app
WORKDIR /usr/src/app


## DO NPM Installs to cache the NPM layers
RUN mkdir /tmp/common
RUN mkdir /tmp/transform
RUN mkdir /tmp/search-common
RUN mkdir /tmp/search-api
RUN mkdir /tmp/search-index

ADD ./common/package.json /tmp/common
RUN cd /tmp/common && npm install

ADD ./import/transform/package.json /tmp/transform
RUN cd /tmp/transform && npm install

ADD ./search/common/package.json /tmp/search-common
RUN cd /tmp/search-common && npm install

ADD ./search/api/package.json /tmp/search-api
RUN cd /tmp/search-api && npm install

ADD ./search/index/package.json /tmp/search-index
RUN cd /tmp/search-index && npm install

## Copy the app into the container
COPY . /usr/src/app
VOLUME /usr/src/app/data

## Run all of our NPM installs
RUN cp -a /tmp/common/node_modules /usr/src/app/common
RUN cp -a /tmp/transform/node_modules /usr/src/app/import/transform
RUN cp -a /tmp/search-common/node_modules /usr/src/app/search/common
RUN cp -a /tmp/search-api/node_modules /usr/src/app/search/api
RUN cp -a /tmp/search-index/node_modules /usr/src/app/search/index

RUN ["chmod", "+x", "/usr/src/app/ctapi.sh"]

ENTRYPOINT ["/usr/src/app/ctapi.sh"]
CMD ["indexer"]