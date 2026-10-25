/** Why a platform call failed. The UI turns the code into a message for the user. */
export type PlatformErrorCode =
	| 'unavailable' // not running on webOS, or the service is missing
	| 'timeout' // no answer in time
	| 'rejected' // the service answered with an error
	| 'invalid-reply'; // the answer could not be read

export class PlatformError extends Error {
	readonly code: PlatformErrorCode;

	constructor(code: PlatformErrorCode, message: string) {
		super(message);
		this.name = 'PlatformError';
		this.code = code;
	}
}
