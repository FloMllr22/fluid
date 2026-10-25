/** Every reason a platform call can fail. The UI turns each into a message for the user. */
export const PLATFORM_ERROR_CODES = [
	'unavailable', // not running on webOS, or the service is missing
	'timeout', // no answer in time
	'rejected', // the service answered with an error
	'invalid-reply', // the answer could not be read
	'no-homebrew', // the Homebrew Channel is not installed
	'no-root' // the Homebrew Channel is installed but runs without root
] as const;

export type PlatformErrorCode = (typeof PLATFORM_ERROR_CODES)[number];

export class PlatformError extends Error {
	readonly code: PlatformErrorCode;

	constructor(code: PlatformErrorCode, message: string) {
		super(message);
		this.name = 'PlatformError';
		this.code = code;
	}
}
