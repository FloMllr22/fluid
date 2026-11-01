#!/bin/sh
# Makes the Home key open fluid instead of LG Home, and takes that back. Runs on the TV as root,
# through the Homebrew Channel; see docs on undoing it in the README ("The Home key").
#
# LG Home is a program the app manager starts. A bind mount puts a small stand-in over that
# program, and LG Home is stopped once. From then on the app manager runs the stand-in as Home:
# it registers as Home and stays, which also ends the app manager's preloading, and opens fluid
# whenever Home is asked for, so LG Home never shows.
#
# No file of the firmware and no setting of the TV changes. The mount is in RAM: a restart brings
# LG Home back, until the file in init.d (BOOT_FILE) puts the stand-in over it again. Without that
# file, or without root after a firmware update, the TV is as it was.
#
# Should fluid not come up (it says so with the file `alive`), LG Home is opened instead. After
# MAX_FAILURES in a row the hook turns itself off for good, and fluid says so when it next runs.
#
# The TV can also start with fluid. What it opens first is up to bootd, long before any boot script
# runs: by a file of LG's (LG_START_FILE), or by a copy of that if there is one (START_FILE). The
# copy names fluid where LG Home and the last input would be. Nothing runs for it, and should fluid
# not be there the TV opens its last input. bootd reads it when it starts, so it counts from the next
# time the TV is switched on. Turning this off, or fluid not coming up, removes the copy again.
#
#   home-hook.sh status        on | off | gave-up | unsupported, and on a second line whether the
#                              TV starts with fluid (yes | no | unsupported)
#   home-hook.sh enable        as status, or failed
#   home-hook.sh disable       as status
#   home-hook.sh start yes|no  the TV starts with fluid, or no longer; as status
#   home-hook.sh open-lg       LG Home itself, until the user leaves it
#   home-hook.sh ack           fluid has told the user that the hook gave up
#   (boot, stand-in, watch, lg-session and forget are for this script itself)

APP_ID=io.github.flomllr22.fluid
APP_DIR=/media/developer/apps/usr/palm/applications/$APP_ID
LG_HOME_ID=com.webos.app.home
LG_HOME_DIR=/usr/palm/applications/$LG_HOME_ID
MOUNTS=/proc/mounts
# on disk, owned by root: the app's own folder is writable by anyone, so what runs as root at
# every key press is a copy kept here
STATE=/var/lib/webosbrew/fluid-home
# in RAM, gone with a restart
RUN=/run/fluid-home
BOOT_FILE=/var/lib/webosbrew/init.d/60-fluid-home
# bootd, and what it reads when the TV starts: START_FILE in place of LG's own, if it is there
BOOTD=/usr/sbin/bootd
LG_START_FILE=/etc/palm/bootd.json
START_FILE=/var/luna/preferences/bootd.json

# How long fluid has to say that it is up, in seconds: when it is opened, and at a cold start of
# the TV, when everything takes its time.
VERIFY_SECONDS=15
BOOT_VERIFY_SECONDS=45
MAX_FAILURES=3
# How long LG Home may take to come up when the user asks for it: it starts cold.
LG_HOME_WAIT_SECONDS=60

SELF=$0

log() {
	mkdir -p "$STATE"
	if [ -f "$STATE/home-hook.log" ] && [ "$(wc -c <"$STATE/home-hook.log")" -gt 32768 ]; then
		mv -f "$STATE/home-hook.log" "$STATE/home-hook.log.old"
	fi
	echo "$(date '+%Y-%m-%d %H:%M:%S') $*" >>"$STATE/home-hook.log"
}

luna() {
	luna-send -n 1 "luna://$1" "$2" 2>/dev/null
}

# Services differ in how they write JSON (some with spaces, the app manager without): without any
# spaces, a reply can be matched.
compact() {
	printf '%s' "$1" | tr -d ' 	'
}

# Without waiting, and with nothing left open for whoever called this script to wait for.
detach() {
	if command -v setsid >/dev/null 2>&1; then
		setsid "$@" </dev/null >/dev/null 2>&1 &
	else
		nohup "$@" </dev/null >/dev/null 2>&1 &
	fi
}

front_app() {
	luna com.webos.applicationManager/getForegroundAppInfo '{}' |
		sed -n 's/.*"appId"[ ]*:[ ]*"\([^"]*\)".*/\1/p' | head -n 1
}

# LG Home's program, if it is a program that can be stood in for: on newer TVs it is no native app.
home_program() {
	grep -q '"type"[ ]*:[ ]*"native"' "$LG_HOME_DIR/appinfo.json" 2>/dev/null || return 1
	sed -n 's/.*"main"[ ]*:[ ]*"file:\/\/\(\/[^"]*\)".*/\1/p' "$LG_HOME_DIR/appinfo.json" | head -n 1
}

is_mounted() {
	grep -q " $1 " "$MOUNTS"
}

# LG Home runs as a program of its own name; the stand-in runs as a shell, and is not found here.
stop_lg_home() {
	pid=$(pidof "$LG_HOME_ID") || return 0
	# shellcheck disable=SC2086 # one number or several
	kill $pid 2>/dev/null
	n=0
	while [ "$n" -lt 3 ] && pidof "$LG_HOME_ID" >/dev/null; do
		sleep 1
		n=$((n + 1))
	done
	pid=$(pidof "$LG_HOME_ID") || return 0
	# shellcheck disable=SC2086
	kill -9 $pid 2>/dev/null
}

# Only ever what this script started: the process is asked what it is before it is stopped.
stop_process() {
	[ -f "$1" ] || return 0
	pid=$(cat "$1")
	rm -f "$1"
	case "$pid" in '' | *[!0-9]*) return 0 ;; esac
	if tr '\0' ' ' <"/proc/$pid/cmdline" 2>/dev/null | grep -q "home-hook.sh $2"; then
		kill "$pid" 2>/dev/null
		sleep 1
	fi
}

# The stand-in over LG Home's program. LG Home itself runs on until it is stopped.
cover() {
	program=$(home_program)
	[ -n "$program" ] && [ -f "$program" ] && [ -f "$STATE/stand-in" ] || return 1
	mkdir -p "$RUN"
	if ! is_mounted "$program"; then
		mount --bind "$STATE/stand-in" "$program" || return 1
		log "stand-in over $program"
	fi
}

take_over() {
	cover && stop_lg_home
}

# LG Home's program back. The app manager starts it again by itself.
release() {
	stop_process "$RUN/stand-in.pid" stand-in
	program=$(home_program)
	if [ -n "$program" ] && is_mounted "$program"; then
		umount "$program" 2>/dev/null || umount -l "$program"
		log "stand-in taken off $program"
	fi
}

# What runs as root is a copy in STATE. The stand-in only hands over to it, and gives LG Home back
# should that copy be gone.
install_files() {
	mkdir -p "$STATE" "$RUN"
	cp "$SELF" "$STATE/home-hook.sh.new" && chmod 755 "$STATE/home-hook.sh.new" &&
		mv -f "$STATE/home-hook.sh.new" "$STATE/home-hook.sh" || return 1
	program=$(home_program)
	cat >"$STATE/stand-in.new" <<EOF || return 1
#!/bin/sh
# fluid stands in for LG Home's program here, until the next restart: see $STATE/home-hook.sh
if [ -f "$STATE/home-hook.sh" ]; then
	exec sh "$STATE/home-hook.sh" stand-in "\$@"
fi
umount -l "$program"
exec "$program" "\$@"
EOF
	chmod 755 "$STATE/stand-in.new" && mv -f "$STATE/stand-in.new" "$STATE/stand-in"
}

write_boot_file() {
	mkdir -p "$(dirname "$BOOT_FILE")"
	cat >"$STATE/boot.new" <<EOF || return 1
#!/bin/sh
# fluid: the Home key opens fluid, and the TV may start with it (Settings, TV). To undo: delete this
# file and $START_FILE, and restart the TV.
if [ -f "$STATE/home-hook.sh" ] && [ -f "$APP_DIR/appinfo.json" ]; then
	exec sh "$STATE/home-hook.sh" boot
fi
# fluid is gone: nothing of this stays, and the TV is not left in front of nothing
if [ -f "$START_FILE" ] && grep -qx "\$(md5sum "$START_FILE" | cut -d' ' -f1)" "$STATE/start-file.md5"; then
	rm -f "$START_FILE"
fi
rm -rf "$STATE"
rm -f "\$0"
case "\$(luna-send -n 1 luna://com.webos.applicationManager/getForegroundAppInfo '{}' 2>/dev/null)" in
*'"appId":""'*) luna-send -n 1 luna://com.webos.applicationManager/launch '{"id":"$LG_HOME_ID"}' >/dev/null 2>&1 ;;
esac
EOF
	chmod 755 "$STATE/boot.new" && mv -f "$STATE/boot.new" "$BOOT_FILE"
}

md5_of() {
	md5sum "$1" 2>/dev/null | cut -d' ' -f1
}

# Does bootd on this TV read a copy, and is LG's file the kind this script knows?
can_start_with_fluid() {
	grep -q "$START_FILE" "$BOOTD" 2>/dev/null && grep -q firstAppByPowerOnReason "$LG_START_FILE" 2>/dev/null
}

# A copy is ours if its sum is noted here. Anyone else's is left alone.
start_file_is_ours() {
	[ -f "$START_FILE" ] && grep -qx "$(md5_of "$START_FILE")" "$STATE/start-file.md5" 2>/dev/null
}

# LG's file with fluid where LG Home and the last input would be: when the TV is switched on with the
# remote or its own button, and after a restart or a power cut. Why else it may start (a phone casting
# to it, HDMI-CEC, a timer) stays as it is. bootd reads this file early in every start, so it is
# written aside, read back and moved into place in one step.
write_start_file() {
	can_start_with_fluid || return 1
	if [ -e "$START_FILE" ] && ! start_file_is_ours; then
		log "$START_FILE is not fluid's: left alone"
		return 1
	fi
	node -e '
		var fs = require("fs");
		var config = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
		var app = process.argv[3];
		["remoteKey", "localKey", "upDownKey", "micomPower"].forEach(function (reason) {
			config.common.firstAppByPowerOnReason[reason] = app;
		});
		if (config.common.firstApp && config.common.firstApp.firstAppInHome) config.common.firstApp.firstAppInHome = app;
		fs.writeFileSync(process.argv[2], JSON.stringify(config, null, 4) + "\n");
		JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
	' "$LG_START_FILE" "$START_FILE.new" "$APP_ID" 2>/dev/null || {
		log "cannot write $START_FILE"
		rm -f "$START_FILE.new"
		return 1
	}
	# both sums while it changes, so that a power cut at any moment leaves a copy known to be ours
	mkdir -p "$STATE"
	md5_of "$START_FILE.new" >>"$STATE/start-file.md5"
	md5_of "$LG_START_FILE" >"$STATE/lg-start-file.md5"
	sync
	mv -f "$START_FILE.new" "$START_FILE" || return 1
	md5_of "$START_FILE" >"$STATE/start-file.md5"
	sync
	log "the TV starts with fluid"
}

remove_start_file() {
	if start_file_is_ours; then
		rm -f "$START_FILE"
		log "the TV starts as it did before"
	fi
	rm -f "$STATE/start-file.md5" "$STATE/lg-start-file.md5"
	sync
}

# A firmware update may bring a new file of LG's: an old copy must not hide it. And a copy someone
# else has changed or removed is theirs from then on.
refresh_start_file() {
	[ -f "$STATE/start-file.md5" ] || return 0
	if ! start_file_is_ours; then
		log "$START_FILE is not fluid's any more: left alone"
		rm -f "$STATE/start-file.md5" "$STATE/lg-start-file.md5"
		return 0
	fi
	[ "$(md5_of "$LG_START_FILE")" = "$(cat "$STATE/lg-start-file.md5" 2>/dev/null)" ] && return 0
	log "LG's file for the start of the TV has changed: writing fluid's copy anew"
	write_start_file || remove_start_file
}

open_lg_home() {
	luna com.webos.applicationManager/launch "{\"id\":\"$LG_HOME_ID\"}" >/dev/null
}

# Opens fluid, which then has to say that it is up.
open_fluid() {
	if [ ! -f "$APP_DIR/appinfo.json" ]; then
		detach sh "$SELF" forget
		return 0
	fi
	mkdir -p "$RUN"
	rm -f "$RUN/alive"
	reply=$(luna com.webos.applicationManager/launch "{\"id\":\"$APP_ID\",\"params\":{\"homeKey\":true}}")
	case "$(compact "$reply")" in
	*'"returnValue":true'*) detach sh "$SELF" watch "$1" ;;
	*)
		log "launching fluid refused: $reply"
		detach sh "$SELF" watch 0
		;;
	esac
}

# Has fluid said that it is up? One watcher at a time, whatever the number of key presses.
watch_fluid() {
	if [ -f "$RUN/watch.pid" ] && tr '\0' ' ' <"/proc/$(cat "$RUN/watch.pid")/cmdline" 2>/dev/null | grep -q 'home-hook.sh watch'; then
		return 0
	fi
	echo $$ >"$RUN/watch.pid"
	n=0
	while [ "$n" -lt "$1" ]; do
		if [ -e "$RUN/alive" ]; then
			rm -f "$STATE/failures" "$RUN/watch.pid"
			return 0
		fi
		sleep 1
		n=$((n + 1))
	done
	rm -f "$RUN/watch.pid"
	[ -e "$RUN/alive" ] && return 0
	fluid_failed "$1"
}

# fluid did not come up, so that the user is not left in front of nothing: LG Home instead, and
# after MAX_FAILURES in a row LG Home for good. Unless the user has moved on to another app by now:
# then only this is noted. fluid refused at once (no time waited) means Home was asked for just now.
fluid_failed() {
	[ -f "$BOOT_FILE" ] || return 0
	failures=$(($(cat "$STATE/failures" 2>/dev/null || echo 0) + 1))
	echo "$failures" >"$STATE/failures"
	log "fluid did not come up ($failures of $MAX_FAILURES)"
	front=$(front_app)
	close_fluid=no
	case "$front" in
	"$APP_ID")
		close_fluid=yes
		show_lg=yes
		;;
	"" | "$LG_HOME_ID") show_lg=yes ;;
	*) [ "$1" = 0 ] && show_lg=yes || show_lg=no ;;
	esac
	if [ "$failures" -ge "$MAX_FAILURES" ]; then
		log "giving up: LG Home again"
		rm -f "$BOOT_FILE" "$STATE/failures"
		echo fluid-not-starting >"$STATE/gave-up"
		sync
		release
		rm -f "$STATE/stand-in" "$STATE/home-hook.sh"
		remove_start_file
		[ "$close_fluid" = yes ] && close_fluid
		[ "$show_lg" = yes ] && open_lg_home
		return 0
	fi
	[ "$show_lg" = yes ] && lg_session "$close_fluid"
}

close_fluid() {
	luna com.webos.applicationManager/closeByAppId "{\"id\":\"$APP_ID\"}" >/dev/null
}

# LG Home itself, as if nothing had happened to it, until the user leaves it; then the stand-in
# again. Should this end early, LG Home just stays until the next restart or fluid's next start.
# LG Home's program comes back first: the TV itself asks for Home when the app in front closes.
lg_session() {
	mkdir -p "$RUN"
	touch "$RUN/lg-session"
	release
	[ "$1" = yes ] && close_fluid
	open_lg_home
	rm -f "$RUN/lg-seen" "$RUN/front.$$"
	mkfifo "$RUN/front.$$"
	luna-send -i luna://com.webos.applicationManager/getForegroundAppInfo '{"subscribe":true}' >"$RUN/front.$$" 2>/dev/null &
	reports=$!
	(
		sleep "$LG_HOME_WAIT_SECONDS"
		[ -e "$RUN/lg-seen" ] || kill "$reports" 2>/dev/null
	) &
	timer=$!
	while IFS= read -r report; do
		case "$(compact "$report")" in
		*"\"appId\":\"$LG_HOME_ID\""*)
			touch "$RUN/lg-seen"
			;;
		*'"appId":""'*) ;;
		*'"appId":"'*) [ -e "$RUN/lg-seen" ] && break ;;
		esac
	done <"$RUN/front.$$"
	kill "$reports" "$timer" 2>/dev/null
	rm -f "$RUN/front.$$" "$RUN/lg-seen" "$RUN/lg-session"
	[ -f "$BOOT_FILE" ] && take_over
}

# Home asked for, in the words of the app manager.
home_asked() {
	case "$(compact "$1")" in
	*'"reason":"preload"'* | *'"snapshot":true'*) ;;
	*'"fluidCheck"'*) touch "$RUN/checked" ;;
	*) open_fluid "$VERIFY_SECONDS" ;;
	esac
}

# Run by the app manager as LG Home's program.
stand_in() {
	mkdir -p "$RUN"
	echo $$ >"$RUN/stand-in.pid"
	home_asked "$*"
	events="$RUN/events.$$"
	rm -f "$events"
	mkfifo "$events"
	luna-send -i -a "$LG_HOME_ID" luna://com.webos.applicationManager/registerApp '{}' >"$events" 2>/dev/null &
	registration=$!
	trap 'kill "$registration" 2>/dev/null; rm -f "$events"; exit 0' TERM INT
	while IFS= read -r event; do
		case "$(compact "$event")" in
		*'"event":"relaunch"'*) home_asked "$event" ;;
		*'"event":"close"'*) break ;;
		esac
	done <"$events"
	kill "$registration" 2>/dev/null
	rm -f "$events"
}

# fluid has been uninstalled: nothing of this stays.
forget() {
	log "fluid is gone"
	rm -f "$BOOT_FILE"
	release
	remove_start_file
	open_lg_home
	rm -rf "$STATE" "$RUN"
}

# At every start of the TV, from BOOT_FILE. If the TV started with fluid, this is the first time that
# anyone looks whether fluid is really up; it says so by itself, and opening it again would close
# whatever the user has opened by now. Otherwise LG Home is up by now, and in front unless the TV
# started on an input. fluid comes first and LG Home goes after, so that nothing goes dark in between.
boot_job() {
	front=$(front_app)
	log "boot, $(cut -d' ' -f1 /proc/uptime) s after the start of the TV: $front in front"
	refresh_start_file
	cover || {
		log "cannot stand in at boot: LG Home stays"
		return 0
	}
	case "$front" in
	"$APP_ID") detach sh "$SELF" watch "$BOOT_VERIFY_SECONDS" ;;
	"$LG_HOME_ID" | "")
		open_fluid "$BOOT_VERIFY_SECONDS"
		n=0
		while [ "$n" -lt 10 ] && [ "$(front_app)" != "$APP_ID" ]; do
			sleep 1
			n=$((n + 1))
		done
		;;
	esac
	stop_lg_home
}

state() {
	if [ -f "$STATE/gave-up" ]; then
		echo gave-up
	elif [ -f "$BOOT_FILE" ]; then
		echo on
	elif [ -z "$(home_program)" ]; then
		echo unsupported
	else
		echo off
	fi
	if start_file_is_ours; then
		echo yes
	elif can_start_with_fluid && [ ! -e "$START_FILE" ]; then
		echo no
	else
		echo unsupported
	fi
}

status() {
	if [ ! -f "$STATE/gave-up" ] && [ -f "$BOOT_FILE" ]; then
		mkdir -p "$RUN"
		touch "$RUN/alive"
		# after an update of fluid, its newer script takes over at the next press of the key
		if [ "$SELF" = "$APP_DIR/home-hook.sh" ] && ! cmp -s "$SELF" "$STATE/home-hook.sh"; then
			install_files
			write_boot_file
			stop_process "$RUN/stand-in.pid" stand-in
		fi
		# not at boot yet, or fluid opened by hand before that
		[ -e "$RUN/lg-session" ] || take_over
	fi
	state
}

enable() {
	program=$(home_program)
	if [ -z "$program" ] || [ ! -f "$program" ]; then
		echo unsupported
		return 0
	fi
	rm -f "$STATE/gave-up" "$STATE/failures"
	install_files || {
		log "cannot write $STATE"
		echo failed
		return 0
	}
	rm -f "$RUN/checked"
	take_over || {
		log "cannot mount over $program"
		release
		echo failed
		return 0
	}
	# Does the app manager really run the stand-in now? A firmware may bring LG Home back another way.
	luna com.webos.applicationManager/launch "{\"id\":\"$LG_HOME_ID\",\"params\":{\"fluidCheck\":true}}" >/dev/null
	n=0
	while [ "$n" -lt 6 ] && [ ! -e "$RUN/checked" ]; do
		sleep 1
		n=$((n + 1))
	done
	if [ ! -e "$RUN/checked" ]; then
		log "the stand-in did not run: LG Home stays"
		release
		luna com.webos.applicationManager/launch "{\"id\":\"$APP_ID\"}" >/dev/null
		echo unsupported
		return 0
	fi
	write_boot_file || {
		log "cannot write $BOOT_FILE"
		release
		echo failed
		return 0
	}
	write_start_file
	sync
	log "on"
	state
}

disable() {
	rm -f "$BOOT_FILE"
	stop_process "$RUN/lg-session.pid" lg-session
	release
	remove_start_file
	rm -rf "$RUN"
	rm -f "$STATE/gave-up" "$STATE/failures" "$STATE/stand-in" "$STATE/home-hook.sh" "$STATE/boot.new"
	log "off"
	state
}

# Only while the Home key opens fluid: that is what looks after fluid not coming up.
set_start() {
	if [ "$1" = no ]; then
		remove_start_file
	elif [ -f "$BOOT_FILE" ]; then
		write_start_file
	fi
	state
}

case "$1" in
status) status ;;
enable) enable ;;
disable) disable ;;
start) set_start "$2" ;;
open-lg)
	if [ -f "$BOOT_FILE" ]; then
		detach sh "$SELF" lg-session
	else
		open_lg_home
	fi
	;;
ack) rm -f "$STATE/gave-up" ;;
boot)
	# hands back at once: the Homebrew Channel waits for its boot scripts before it counts a start
	# as good
	detach sh "$SELF" boot-job
	;;
boot-job) boot_job ;;
stand-in)
	shift
	stand_in "$@"
	;;
watch) watch_fluid "$2" ;;
lg-session)
	mkdir -p "$RUN"
	echo $$ >"$RUN/lg-session.pid"
	lg_session
	rm -f "$RUN/lg-session.pid"
	;;
forget) forget ;;
*)
	echo "usage: home-hook.sh status | enable | disable | open-lg | ack" >&2
	exit 2
	;;
esac
exit 0
