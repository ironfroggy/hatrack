tempwork
########

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
