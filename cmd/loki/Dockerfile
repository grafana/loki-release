FROM golang:1.26@sha256:3aff6657219a4d9c14e27fb1d8976c49c29fddb70ba835014f477e1c70636647 AS build

COPY . /src/loki
WORKDIR /src/loki
RUN make clean && make loki

FROM alpine:latest

COPY --from=build /src/loki/cmd/loki/loki /usr/bin/loki

RUN addgroup -g 10001 -S loki && \
    adduser -u 10001 -S loki -G loki

USER 10001
EXPOSE 3100
CMD ["/usr/bin/loki"]
