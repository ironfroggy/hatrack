# hatrack

A simple server for launching mini-apps temporarily.

hatrack will map URL prefixes to launch simple web service commands you
configure and proxy requests to them. They'll be terminated after 10 seconds,
but restarted if more requests come in to them.

hatrack is a prototype, but has a short and robust time line:

* Configurable timeout with keep-alive as requests come in
* Static file configuration for services
* Logging about worker lifespan
* Recycling ports when the max port number is reached

hatrack is useful if you build lots of mini-projects, want to host them all
somewhere, but none of them will get traffic often enough to support running
24/7.

## Usage

```
npm install -g hatrack
hatrack --config=hatrack.conf
```

Where `hatrack.conf` is a YAML file like this:

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


### Recommended with DNSMasq

The best way to use Hat Rack is combined with DNSMasq. You can configure your machine to route
any domain ending in `.dev` to your `localhost`, which gives me easy to remember hostnames for
all the local projects you run with Hat Rack. You'll be able to open your browser to
`myproject.dev:8080` and Hat Rack will automatically spin up a development server for `myproject`
to route the request to, and shut it down for you when it is no longer in use.

#### Install and configure DNSMasq on OSX

First, install DNSMasq via Brew.

```
brew up
brew install dnsmasq
```

Once installed, create a simple configuration to listen at your localhost and bind all `.dev`
domains to 127.0.0.1:

```
cat > /usr/local/etc/dnsmasq.conf
listen-address=127.0.0.1
bind-interfaces
address=/.dev/127.0.0.1
```

Press Ctrl+C after pasting this command to complete the configuration file.

Now, you'll want to configure DNSMasq to run at start up and to run it immediately:

```
sudo cp $(brew list dnsmasq | grep /homebrew.mxcl.dnsmasq.plist$) /Library/LaunchDaemons/
sudo launchctl load /Library/LaunchDaemons/homebrew.mxcl.dnsmasq.plist
```

Now that you've setup DNSMasq to respond to `.dev` domain resolutions, you need to tell your
machine to resolve them through DNSMasq.

```
sudo mkdir -p /etc/resolver
echo "nameserver 127.0.0.1" > /etc/resolver/dev
```

#### Install and configure DNSMasq for Ubuntu

Configure local wildcard DNS server

1. Install Dnsmasq: `sudo apt-get install dnsmasq`
2. Since Ubuntu's NetworkManager uses dnsmasq, and since that messes things up a little for us, open up `/etc/NetworkManager/NetworkManager.conf` and comment out (`#`) the line that reads `dns=dnsmasq`. Restart NetworkManager afterwards: `sudo restart network-manager`.
3. Make sure Dnsmasq listens to local DNS queries by editing `/etc/dnsmasq.conf`, and adding the line `listen-address=127.0.0.1`.
4. Create a new file in `/etc/dnsmasq.d` (eg. `/etc/dnsmasq.d/dev`), and add the line `address=/dev/127.0.0.1` to have dnsmasq resolve requests for *.dev domains. Restart Dnsmasq: `sudo /etc/init.d/dnsmasq restart`.


source: http://brunodbo.be/blog/2013/04/setting-up-wildcard-apache-virtual-host-wildcard-dns
