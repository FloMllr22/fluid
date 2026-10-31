// Measures fluid on the TV against its performance budgets (the wheel turning, in each of a
// few looks), over the Web Inspector the TV offers to a rooted developer. Run it with fluid
// installed and nobody using the TV: it opens fluid and presses the arrow keys.
//
//   npm run measure                      every look
//   npm run measure -- dark              only the look "dark" (or, without one of that name,
//                                        those whose name contains it)
//   npm run measure -- dark --layers     and list the layers
//   npm run measure -- dark --trace=FILE and keep the trace, to open in Chrome's DevTools
//   npm run measure -- dark --css=FILE   with this stylesheet added, to try a change without
//                                        installing it
//   npm run measure -- dark --js=FILE    and with this script run in fluid's page
//
// Two runs per look, as one would disturb the other: the time from key press to frame
// (fluidPerf.report), and the frames the compositor drew with the work per key press (a trace;
// this is what reaches the screen). Frames counted in the page with requestAnimationFrame would
// say little: they are the main thread's, and asking for them wakes it on every frame. First a
// small box moving by itself shows how fast this TV draws at all (see frameLimit).
//
// The settings are changed for the looks and put back at the end, even after a failure on the
// next run (kept in localStorage as BACKUP_KEY meanwhile). Nothing leaves the local network.
import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync} from 'node:fs';
import {frameLimit, lostPercent, summarizeLayers, summarizeTrace} from './lib/trace.mjs';
import {APP_ID_PATTERN, loadTarget, readAppInfo, sshArgs} from './lib/tv.mjs';

const INSPECTOR_PORT = 9998;
const SETTINGS_KEY = 'fluid-settings';
const BACKUP_KEY = 'fluid-settings-before-measuring';
/** The screen in the unit of the layers (CSS pixels). */
const SCREEN = {width: 1920, height: 1080};

const KEY_DOWN = {code: 40, name: 'ArrowDown'};
const KEY_UP = {code: 38, name: 'ArrowUp'};
/** The turning measured in ADR 0016: 6 steps, a pause, 6 back. */
const STEPS_EACH_WAY = 6;
const STEP_MS = 170;
const PAUSE_MS = 700;
const DRIVE_MS = 10000;
/** Long enough for a p95 that does not hang on one key press. */
const KEYS_MS = 30000;
const LIMIT_MS = 5000;
/** How long the wheel moves after a key press (MOTION.wheelTurnMs). */
const WHEEL_MOVES_MS = 500;
/** After loading: the apps are read from the TV, and the first turn would pay for their icons. */
const SETTLE_MS = 3000;

const TRACE_CATEGORIES = [
	'devtools.timeline',
	'disabled-by-default-devtools.timeline',
	'disabled-by-default-devtools.timeline.frame'
];

const LOOKS = [
	{name: 'dark', color: 'dark', glow: 0},
	{name: 'dark, reduced motion', color: 'dark', glow: 0, reduceMotion: true},
	{name: 'dark, glow 15', color: 'dark', glow: 15},
	{name: 'dusk', color: 'dusk', glow: 0},
	{name: 'dusk moving, glow 15', color: 'duskMoving', glow: 15},
	{name: 'dusk moving, glow 50', color: 'duskMoving', glow: 50}
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** One connection to the Inspector of a page. */
async function connect(url) {
	const socket = new WebSocket(url);
	await new Promise((resolve, reject) => {
		socket.addEventListener('open', resolve, {once: true});
		socket.addEventListener('error', () => reject(new Error(`Could not connect to ${url}`)), {once: true});
	});
	let lastId = 0;
	const waiting = new Map();
	const listeners = {};
	socket.addEventListener('message', (message) => {
		const data = JSON.parse(message.data);
		if (data.id && waiting.has(data.id)) {
			waiting.get(data.id)(data);
			waiting.delete(data.id);
		} else if (data.method && listeners[data.method]) listeners[data.method](data.params);
	});
	const send = (method, params = {}) =>
		new Promise((resolve, reject) => {
			const id = ++lastId;
			waiting.set(id, (data) =>
				data.error ? reject(new Error(`${method}: ${data.error.message}`)) : resolve(data.result)
			);
			socket.send(JSON.stringify({id, method, params}));
		});
	const evaluate = async (expression) => {
		const reply = await send('Runtime.evaluate', {expression, returnByValue: true, awaitPromise: true});
		if (reply.exceptionDetails) throw new Error(`${expression}: ${JSON.stringify(reply.exceptionDetails)}`);
		return reply.result.value;
	};
	const on = (method, listener) => {
		listeners[method] = listener;
	};
	return {send, evaluate, on, close: () => socket.close()};
}

/** Opens fluid on the TV. */
function launch(target, appId) {
	if (!APP_ID_PATTERN.test(appId)) throw new Error(`appinfo.json: "${appId}" is not a valid app ID.`);
	const command = `luna-send -n 1 luna://com.webos.applicationManager/launch '${JSON.stringify({id: appId})}'`;
	const reply = spawnSync('ssh', [...sshArgs(target, {tty: true}), command], {stdio: ['ignore', 'pipe', 'inherit']});
	if (reply.status !== 0) throw new Error(`Could not open fluid over ssh (exit code ${reply.status}).`);
}

/** The Inspector's address for fluid's page. */
async function findPage(host, appId) {
	const list = await fetch(`http://${host}:${INSPECTOR_PORT}/json`).then((reply) => reply.json());
	const page = list.find((item) => item.url.indexOf(appId) !== -1);
	return page ? page.webSocketDebuggerUrl : undefined;
}

async function openPage(target, appId) {
	launch(target, appId);
	for (let tries = 0; tries < 20; tries++) {
		await sleep(500);
		const url = await findPage(target.host, appId);
		if (url) return connect(url);
	}
	throw new Error('fluid does not show in the Web Inspector. Is it installed?');
}

async function press(page, key) {
	const event = {windowsVirtualKeyCode: key.code, nativeVirtualKeyCode: key.code, key: key.name, code: key.name};
	await page.send('Input.dispatchKeyEvent', {type: 'rawKeyDown', ...event});
	await page.send('Input.dispatchKeyEvent', {type: 'keyUp', ...event});
}

/** Turns the wheel to and fro for `ms`, at an even pace whatever the connection takes. Resolves
 *  with the number of key presses. */
async function drive(page, ms) {
	const end = Date.now() + ms;
	let steps = 0;
	while (Date.now() < end) {
		for (const key of [KEY_DOWN, KEY_UP]) {
			for (let i = 0; i < STEPS_EACH_WAY; i++) {
				const next = Date.now() + STEP_MS;
				await press(page, key);
				steps++;
				await sleep(Math.max(0, next - Date.now()));
			}
			await sleep(PAUSE_MS);
		}
	}
	return steps;
}

/** Puts on a look and starts fluid anew, so that its numbers start from nothing. */
async function putOn(page, look, css, script) {
	await page.evaluate(`(() => {
		const stored = JSON.parse(localStorage.getItem(${JSON.stringify(BACKUP_KEY)}));
		stored.settings.background = {kind: 'color', color: ${JSON.stringify(look.color)}};
		stored.settings.appearance = Object.assign({}, stored.settings.appearance, {
			glow: ${look.glow},
			reduceMotion: ${look.reduceMotion === true}
		});
		localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, JSON.stringify(stored));
		location.reload();
	})()`);
	await sleep(SETTLE_MS);
	if (css) {
		await page.evaluate(`(() => {
			const style = document.createElement('style');
			style.textContent = ${JSON.stringify(css)};
			document.head.appendChild(style);
		})()`);
	}
	if (script) await page.evaluate(script);
	if (!(await page.evaluate(`document.querySelectorAll('.wheel__row').length > 0`)))
		throw new Error('fluid shows no apps on the wheel, so there is nothing to turn.');
	if (await page.evaluate('document.hidden')) throw new Error('fluid is not in front on the TV.');
}

/** The events of a trace taken while `during` runs, and what it resolved with. */
async function trace(page, during) {
	const events = [];
	page.on('Tracing.dataCollected', (params) => events.push(...params.value));
	const done = new Promise((resolve) => page.on('Tracing.tracingComplete', resolve));
	await page.send('Tracing.start', {
		traceConfig: {includedCategories: TRACE_CATEGORIES},
		transferMode: 'ReportEvents'
	});
	const result = await during();
	await page.send('Tracing.end');
	await done;
	return {events, result};
}

async function traceTurning(page, moveMs, file) {
	const {events, result: steps} = await trace(page, () => drive(page, DRIVE_MS));
	if (file) writeFileSync(file, JSON.stringify({traceEvents: events}));
	return summarizeTrace(events, steps, moveMs);
}

/** How fast this TV draws at all, with one small box moving and nothing else. */
async function measureLimit(page) {
	await page.evaluate(`(() => {
		const style = document.createElement('style');
		style.id = 'measure-box-style';
		style.textContent = '@keyframes measure-box{from{transform:translateY(0)}to{transform:translateY(400px)}}';
		document.head.appendChild(style);
		const box = document.createElement('div');
		box.id = 'measure-box';
		box.style.cssText = 'position:absolute;right:40px;top:300px;width:60px;height:60px;background:#345;z-index:9;will-change:transform;animation:measure-box 2s linear infinite';
		document.body.appendChild(box);
	})()`);
	await sleep(500);
	const {events} = await trace(page, () => sleep(LIMIT_MS));
	await page.evaluate(`(() => {
		document.getElementById('measure-box').remove();
		document.getElementById('measure-box-style').remove();
	})()`);
	return frameLimit(events);
}

/** The layers while the wheel turns. */
async function readLayers(page, details) {
	let layers = [];
	page.on('LayerTree.layerTreeDidChange', (params) => {
		if (params.layers) layers = params.layers;
	});
	await page.send('LayerTree.enable');
	await press(page, KEY_DOWN);
	await sleep(250);
	const turning = layers;
	await press(page, KEY_UP);
	await sleep(1500);
	const summary = summarizeLayers(turning, SCREEN);
	if (details) {
		for (const layer of summary.layers) {
			const reasons = await page.send('LayerTree.compositingReasons', {layerId: layer.layerId}).catch(() => undefined);
			const node = layer.backendNodeId
				? await page.send('DOM.describeNode', {backendNodeId: layer.backendNodeId}).catch(() => undefined)
				: undefined;
			const attributes = node ? node.node.attributes || [] : [];
			const name = attributes[attributes.indexOf('class') + 1] || (node ? node.node.nodeName : '?');
			console.log(
				`  ${`${layer.width}×${layer.height}`.padEnd(11)} ${(layer.screens * 100).toFixed(1).padStart(5)} %  ${String(layer.paintCount).padStart(3)} paints  ${name}  [${reasons ? (reasons.compositingReasons || []).join(', ') : ''}]`
			);
		}
	}
	await page.send('LayerTree.disable');
	return summary;
}

async function main() {
	const args = process.argv.slice(2);
	const option = (name) => {
		const found = args.find((arg) => arg.startsWith(`--${name}=`));
		return found ? found.slice(name.length + 3) : undefined;
	};
	const filter = args.find((arg) => !arg.startsWith('--')) || '';
	const details = args.indexOf('--layers') !== -1;
	const cssFile = option('css');
	const css = cssFile ? readFileSync(cssFile, 'utf8') : undefined;
	const scriptFile = option('js');
	const script = scriptFile ? readFileSync(scriptFile, 'utf8') : undefined;
	const exact = LOOKS.filter((look) => look.name === filter);
	const looks = exact.length > 0 ? exact : LOOKS.filter((look) => look.name.indexOf(filter) !== -1);
	if (looks.length === 0) throw new Error(`No look named "${filter}": ${LOOKS.map((look) => look.name).join(', ')}.`);

	const target = loadTarget();
	const page = await openPage(target, readAppInfo().id);
	await page.send('Page.enable');
	await page.send('Runtime.enable');
	await page.send('DOM.enable').catch(() => undefined);
	// Kept from a run that failed: those are the real settings, not what is stored now.
	await page.evaluate(`(() => {
		if (localStorage.getItem(${JSON.stringify(BACKUP_KEY)}) === null)
			localStorage.setItem(${JSON.stringify(BACKUP_KEY)}, localStorage.getItem(${JSON.stringify(SETTINGS_KEY)}));
	})()`);

	const budgets = [];
	const work = [];
	try {
		await putOn(page, looks[0], css, script);
		const limit = await measureLimit(page);
		console.log(`This TV draws at most ${limit} frames per second.`);
		for (const look of looks) {
			console.log(`${look.name} …`);
			await putOn(page, look, css, script);
			await drive(page, KEYS_MS);
			const {keys} = await page.evaluate('fluidPerf.report()');
			const moveMs = look.reduceMotion ? 0 : WHEEL_MOVES_MS;
			const turning = await traceTurning(page, moveMs, option('trace'));
			const layers = await readLayers(page, details);
			const {fps, ...rest} = turning;
			budgets.push({
				look: look.name,
				keyMedian: keys.medianMs,
				keyP95: keys.p95Ms,
				fps,
				lostPercent: lostPercent(fps, limit),
				layers: layers.count,
				screens: layers.screens
			});
			work.push({look: look.name, ...rest});
		}
	} finally {
		await page.evaluate(`(() => {
			localStorage.setItem(${JSON.stringify(SETTINGS_KEY)}, localStorage.getItem(${JSON.stringify(BACKUP_KEY)}));
			localStorage.removeItem(${JSON.stringify(BACKUP_KEY)});
			location.reload();
		})()`);
		page.close();
	}
	console.log('Budgets (key ≤ 50 ms at p95; at most 1 % of the frames this TV can draw lost):');
	console.table(budgets);
	console.log('Work per key press in ms, on the graphics chip per frame:');
	console.table(work);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(`Measuring failed: ${error.message}`);
		process.exit(1);
	});
