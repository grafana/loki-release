FROM golang:1.26@sha256:87a41d2539e5671777734e91f467499ed5eafb1fb1f77221dff2744db7a51775 AS build

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
