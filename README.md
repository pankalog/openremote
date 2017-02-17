# OpenRemote v3

[Source](https://github.com/openremote/openremote) **·** [Documentation](https://github.com/openremote/openremote/wiki) **·** [Community](https://groups.google.com/forum/#!forum/openremotecommunity) **·** [Issues](https://github.com/openremote/openremote/issues) **·** [Docker Images](https://hub.docker.com/u/openremote/) **·** [OpenRemote Inc.](http://openremote.com)

## Getting started with OpenRemote

We are currently working on v3 of the OpenRemote platform.

*No installable released versions are available at this time.*

If you want to try OpenRemote v2, [read the OpenRemote v2 documentation](https://github.com/openremote/Documentation/wiki).

## Contributing to OpenRemote

We work with Java, Groovy, JavaScript, Gradle, Docker, and a wide range of APIs and protocol implementations. Clone or checkout this project and send us pull requests.

A demo preview can be started with Docker Compose (install [Docker Toolbox](https://www.docker.com/products/docker-toolbox)):

```
docker-compose -p openremote \
    -f profile/dependencies/postgresql.yml \
    -f profile/dependencies/keycloak.yml \
    -f profile/manager.yml \
    up
```

Access the manager UI and API on http://192.168.99.100:8080/ with username `admin` and password `secret`. Configuration options of the images are documented in the compose profiles.

You can build the Docker images from source with:

```
./gradlew prepareImage
docker build -t openremote/postgresql:latest postgresql
docker build -t openremote/keycloak:latest keycloak
docker build -t openremote/manager:latest manager/build/install
```

Push images to [Docker Hub](https://hub.docker.com/u/openremote):

```
docker push openremote/postgresql:latest
docker push openremote/keycloak:latest
docker push openremote/manager:latest
```

For more information and how to set up a development environment, see the [Developer Guide](https://github.com/openremote/openremote/wiki).

## Discuss OpenRemote

Join us on the [community group](https://groups.google.com/forum/#!forum/openremotecommunity).

## OpenRemote Projects

* [Agent](https://github.com/openremote/openremote/tree/master/agent) - Connects sensors and actuators to an IoT network and provides intelligence at the edge of the network. Co-locate agents with backend services or install agents on gateways, close to devices.

* [Manager](https://github.com/openremote/openremote/tree/master/manager) - Provides IoT backend services and a web-based operations frontend and management application for agents and domain assets. Design custom data flow, rules, notifications, and build end-user interfaces.

* [Console](https://github.com/openremote/openremote/tree/master/console) - Render and deploy custom end-user interfaces as applications for Web, iOS and Android.

TBC...
