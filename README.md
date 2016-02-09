# tempwork

A simple server for launching mini-apps temporarily.

tempwork will map URL prefixes to launch simple web service commands you
configure and proxy requests to them. They'll be terminated after 10 seconds,
but restarted if more requests come in to them.

tempwork is a prototype, but has a short and robust time line:

* Configurable timeout with keep-alive as requests come in
* Static file configuration for services
* Logging about worker lifespan
* Recycling ports when the max port number is reached

tempwork is useful if you build lots of mini-projects, want to host them all
somewhere, but none of them will get traffic often enough to support running
24/7.

## Usage

```
npm install -g tempwork
tempwork --config=tempwork.conf
```

Where `tempwork.conf` is a YAML file like this:

```
workers:
  test_worker:
    command: "node"
    arguments:
      - "testworker.js"
    prefix: "test"
    port_env: "PORT"
  someproject:
    host: "www.someproject.local"
    cwd: "~/projects/someproject/"
    env:
      PATH: "~/.virtualenvs/someproject/bin/:~/projects/someproject/node_modules/.bin/"
    command: "~/.virtualenvs/someproject/bin/python manage.py runserver $PORT"
  default:
    static: "noservice.html"
```

`workers` defines one or more workers and must define a `"default"` worker.

`command` is a command to run to launch the worker if it is not working, and
will be run with the list of defined `arguments`. If the command has space-separated
arguments, it will be run with a shell and ignores the `arguments` option.

`prefix` is the URL prefix that will be routed to this worker. The worker will
not see the prefix.

`port_env` is an environment variable to launch the worker with defining what
port number it should listen to.

`host` defines a hostname to route traffic from to the worker.

`env` defines one or more environment variables for the command.

`cwd` defines a current working directory to change to when running the worker.

`static` defines a file the service should read instead of launching a worker.
