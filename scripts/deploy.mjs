// Installs the packaged .ipk on a rooted TV over SSH and launches it.
//
// The TV's address and the SSH key come from tv.env (git-ignored, see tv.env.example);
// values in the environment override the file. Only key authentication is used, so a
// missing or wrong key fails at once instead of waiting at a password prompt.
//
// Three SSH sessions:
//  1. upload: the .ipk goes over stdin to /tmp on the TV (no scp/sftp needed there),
//     its size comes back to confirm the transfer
//  2. install: webOS's developer install service, the same one the Homebrew Channel
//     and ares-install use; nothing outside the app's own directory is touched
//  3. launch
//
// Nothing from tv.env reaches a shell: host, port, user and key are ssh arguments, and
// the commands run on the TV contain only the validated app ID and fixed paths.
import {spawn} from 'node:child_process';
import {createReadStream, existsSync, statSync} from 'node:fs';
import {join} from 'node:path';
import {APP_ID_PATTERN, ipkName, loadTarget, parseInstallReplies, ROOT, readAppInfo, sshArgs} from './lib/tv.mjs';

const REMOTE_IPK = '/tmp/fluid-deploy.ipk';
const INSTALL_TIMEOUT_MS = 60000;

class DeployError extends Error {}

/** Runs one command on the TV. Resolves with the exit code and stdout; stderr goes
 *  straight to the console so ssh's own messages stay visible. `until` ends the session
 *  early (exit code 0) once it returns true for the output so far. */
function ssh(target, command, {input, tty = false, until} = {}) {
	return new Promise((resolve, reject) => {
		const child = spawn('ssh', [...sshArgs(target, {tty}), command], {
			stdio: [input ? 'pipe' : 'ignore', 'pipe', 'inherit'],
			windowsHide: true
		});
		let stdout = '';
		let stopped = false;
		child.stdout.setEncoding('utf8');
		child.stdout.on('data', (chunk) => {
			stdout += chunk;
			if (until && !stopped && until(stdout)) {
				stopped = true;
				child.kill();
			}
		});
		child.on('error', (error) => {
			reject(
				error.code === 'ENOENT'
					? new DeployError(
							'ssh was not found. On Windows, install "OpenSSH Client" under Settings → Apps → Optional features.'
						)
					: error
			);
		});
		child.on('close', (code) => resolve({code: stopped ? 0 : code, stdout}));
		if (input) {
			// When ssh gives up early (no connection), writing to it fails with EPIPE. Its exit
			// code already reports the real problem, so only other write errors count here.
			child.stdin.on('error', (error) => {
				if (error.code !== 'EPIPE' && error.code !== 'EOF') reject(error);
			});
			const file = createReadStream(input);
			file.on('error', reject);
			file.pipe(child.stdin);
		}
	});
}

/** ssh exits with 255 when it cannot connect or log in. */
function checkConnection(code, target) {
	if (code !== 255) return;
	throw new DeployError(
		[
			`Could not connect to ${target.user}@${target.host}:${target.port} (see the ssh message above).`,
			'Check that the TV is on, SSH is enabled in the Homebrew Channel, and TV_HOST / TV_KEY in tv.env are right.',
			'If the TV was rooted again, its host key may have changed: run `ssh-keygen -R <TV_HOST>`, then connect',
			'once by hand with `ssh -i <TV_KEY> root@<TV_HOST>` to confirm the new key.'
		].join('\n')
	);
}

async function main() {
	const target = loadTarget();
	const appInfo = readAppInfo();
	if (!APP_ID_PATTERN.test(appInfo.id)) throw new DeployError(`appinfo.json: "${appInfo.id}" is not a valid app ID.`);
	const ipk = join(ROOT, 'build', ipkName(appInfo));
	if (!existsSync(ipk)) throw new DeployError(`build/${ipkName(appInfo)} not found. Run \`npm run package\` first.`);

	console.log(`Uploading ${ipkName(appInfo)} to ${target.user}@${target.host} …`);
	const size = statSync(ipk).size;
	const upload = await ssh(target, `cat > ${REMOTE_IPK} && wc -c < ${REMOTE_IPK}`, {input: ipk});
	checkConnection(upload.code, target);
	if (upload.code !== 0 || Number(upload.stdout.trim()) !== size) {
		throw new DeployError(`Upload incomplete: sent ${size} bytes, the TV has ${upload.stdout.trim() || 'none'}.`);
	}

	console.log(`Installing ${appInfo.id} ${appInfo.version} …`);
	const request = JSON.stringify({id: 'com.ares.defaultName', ipkUrl: REMOTE_IPK, subscribe: true});
	// luna-send only prints the subscription's replies with a terminal attached, hence -tt.
	// The subscription stays open after the last reply, so the session is ended as soon as
	// the install has finished; -w only limits how long a stuck install can take.
	const install = await ssh(
		target,
		`luna-send -w ${INSTALL_TIMEOUT_MS} -i luna://com.webos.appInstallService/dev/install '${request}'`,
		{tty: true, until: (output) => parseInstallReplies(output).finished}
	);
	checkConnection(install.code, target);
	const result = parseInstallReplies(install.stdout);
	if (result.states.length) console.log(`  ${result.states.join(' → ')}`);
	if (!result.installed) {
		await ssh(target, `rm -f ${REMOTE_IPK}`);
		const reason = result.errors.length ? result.errors.join('; ') : 'no "installed" reply from the TV';
		throw new DeployError(`Install failed: ${reason}`);
	}

	console.log(`Launching ${appInfo.id} …`);
	const launch = await ssh(
		target,
		`rm -f ${REMOTE_IPK}; luna-send -n 1 luna://com.webos.applicationManager/launch '${JSON.stringify({id: appInfo.id})}'`
	);
	checkConnection(launch.code, target);
	if (launch.code !== 0 || /"returnValue"\s*:\s*false/.test(launch.stdout)) {
		throw new DeployError(`Installed, but the launch failed: ${launch.stdout.trim() || `exit code ${launch.code}`}`);
	}
	console.log(`Done: ${appInfo.title} ${appInfo.version} is installed and running on the TV.`);
}

main().catch((error) => {
	console.error(error instanceof DeployError ? error.message : `Deploy failed: ${error.message}`);
	process.exit(1);
});
