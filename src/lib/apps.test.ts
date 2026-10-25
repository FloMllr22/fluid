import {describe, expect, it} from 'vitest';
import {shellQuote} from './apps';

describe('shellQuote', () => {
	it('wraps a plain value in single quotes', () => {
		expect(shellQuote('/usr/palm/applications/app/icon.png')).toBe("'/usr/palm/applications/app/icon.png'");
	});

	it('escapes embedded single quotes', () => {
		expect(shellQuote("it's")).toBe("'it'\\''s'");
	});

	it('keeps shell syntax inert', () => {
		expect(shellQuote('$(reboot); `id` && rm -rf /')).toBe("'$(reboot); `id` && rm -rf /'");
	});
});
