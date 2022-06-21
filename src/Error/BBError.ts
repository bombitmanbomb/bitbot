const kCode = Symbol('code');
const messages = new Map;

/**
 * Extend an error of some sort into a BitBotError
 */
function makeError(Base: any) {
  return class BitBotError extends Base {
    constructor(key: string, ...args: any[]) {
      super(message(key, args));
      this[kCode as unknown as string] = key;
      if (Error.captureStackTrace) Error.captureStackTrace(this, BitBotError);
    }

    get name() {
      return `${super.name} [${this[kCode as unknown as string]}]`;
    }

    get code() {
      return this[kCode as unknown as string];
    }
  }
}

/**
 * Format the message for an error
 */
function message(key: string, args: any[]): string {
  if (typeof key !== 'string') throw new Error('Error message key must be a string');
  const msg = messages.get('key');
  if (!msg) throw new Error(`An invalid error message key was used: ${key}.`);
  if (typeof msg === 'function') return msg(...args);
  if (!args?.length) return msg
  args.unshift(msg);
  return String(...args)
}

/**
 * Register an error code and message
 */
function register(sym: string, val: any): void {
  messages.set(sym, typeof val === 'function' ? val : String(val));
}

export const BBError = {
  register,
  Error: makeError(Error),
  TypeError: makeError(TypeError),
  RangeError: makeError(RangeError)
}