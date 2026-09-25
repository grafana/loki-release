ARG BUILD_IMAGE=golang:1.27.1@sha256:3680233e3204827fbdc66088528ae6d4b3d034f51d03a99d454f6de034888244
ARG GOARCH=amd64
# Directories in this file are referenced from the root of the project not this folder
# This file is intended to be called from the root like so:
# docker build -t grafana/loki-docker-driver -f clients/cmd/docker-driver/Dockerfile .

FROM $BUILD_IMAGE AS build
COPY . /src/loki
WORKDIR /src/loki

ARG GOARCH
RUN make clean && make BUILD_IN_CONTAINER=false GOARCH=${GOARCH} clients/cmd/docker-driver/docker-driver

FROM alpine:latest@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b AS temp

ARG GOARCH

RUN apk add --update --no-cache --arch=${GOARCH} ca-certificates tzdata

FROM --platform=linux/${GOARCH} alpine:latest@sha256:28bd5fe8b56d1bd048e5babf5b10710ebe0bae67db86916198a6eec434943f8b

COPY --from=temp /etc/ca-certificates.conf /etc/ca-certificates.conf
COPY --from=temp /usr/share/ca-certificates /usr/share/ca-certificates
COPY --from=temp /usr/share/zoneinfo /usr/share/zoneinfo

COPY --from=build /src/loki/clients/cmd/docker-driver/docker-driver /bin/docker-driver

WORKDIR /bin/
ENTRYPOINT [ "/bin/docker-driver" ]
