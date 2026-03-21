import { Super } from './Super';

describe('Super', () => {
    describe('Event Registration', () => {
        it('on() registers single event handler', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            instance.on('start' as any, handler);

            expect((instance as any)._handlers_['start']).toBeDefined();
            expect((instance as any)._handlers_['start'].has(handler)).toBe(true);
        });

        it('on() registers multiple event handlers (comma-separated)', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            instance.on('start,end' as any, handler);

            expect((instance as any)._handlers_['start'].has(handler)).toBe(true);
            expect((instance as any)._handlers_['end'].has(handler)).toBe(true);
        });

        it('on() registers multiple handlers for same event', () => {
            const instance = new Super('super');
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            instance.on('start' as any, handler1);
            instance.on('start' as any, handler2);

            expect((instance as any)._handlers_['start'].size).toBe(2);
        });

        it('on() parses event names correctly (splits by space and comma)', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            instance.on('start end, move' as any, handler);

            expect((instance as any)._handlers_['start'].has(handler)).toBe(true);
            expect((instance as any)._handlers_['end'].has(handler)).toBe(true);
            expect((instance as any)._handlers_['move'].has(handler)).toBe(true);
        });

        it('off() removes specific handler', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            instance.on('start' as any, handler);
            instance.off('start' as any, handler);

            expect((instance as any)._handlers_['start'].has(handler)).toBe(false);
        });

        it('off() removes all handlers for event type', () => {
            const instance = new Super('super');
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            instance.on('start' as any, handler1);
            instance.on('start' as any, handler2);
            instance.off('start' as any);

            expect((instance as any)._handlers_['start'].size).toBe(0);
        });

        it('off() removes all handlers when called with no args', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            instance.on('start' as any, handler);
            instance.on('end' as any, handler);
            instance.off();

            expect(Object.keys((instance as any)._handlers_).length).toBe(0);
        });

        it('mapOnEvents() correctly parses event string', () => {
            const instance = new Super('super');
            const callback = jest.fn();

            (instance as any).mapOnEvents('start,end move', callback);

            expect(callback).toHaveBeenCalledTimes(3);
            expect(callback).toHaveBeenCalledWith('start');
            expect(callback).toHaveBeenCalledWith('end');
            expect(callback).toHaveBeenCalledWith('move');
        });
    });

    describe('Event Triggering', () => {
        it('trigger() calls registered handlers with correct data', () => {
            const instance = new Super('super');
            const handler = jest.fn();
            const data = { test: 'value' };

            instance.on('start' as any, handler);
            instance.trigger('start' as any, data as any);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'start',
                    data: data,
                }),
            );
        });

        it('trigger() calls all handlers for an event', () => {
            const instance = new Super('super');
            const handler1 = jest.fn();
            const handler2 = jest.fn();

            instance.on('start' as any, handler1);
            instance.on('start' as any, handler2);
            instance.trigger('start' as any, {} as any);

            expect(handler1).toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });

        it('trigger() includes type and target in event object', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            instance.on('start' as any, handler);
            instance.trigger('start' as any, { test: 'data' } as any);

            expect(handler).toHaveBeenCalledWith(
                expect.objectContaining({
                    type: 'start',
                    target: instance,
                }),
            );
        });

        it('trigger() handles multiple event types (space/comma separated)', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            instance.on('start' as any, handler);
            instance.on('end' as any, handler);
            instance.trigger('start,end' as any, {} as any);

            expect(handler).toHaveBeenCalledTimes(2);
        });

        it('trigger() does nothing when no handlers registered', () => {
            const instance = new Super('super');

            expect(() => {
                instance.trigger('start' as any, {} as any);
            }).not.toThrow();
        });

        it('trigger() executes handlers in registration order', () => {
            const instance = new Super('super');
            const callOrder: number[] = [];

            instance.on('start' as any, () => callOrder.push(1));
            instance.on('start' as any, () => callOrder.push(2));
            instance.on('start' as any, () => callOrder.push(3));

            instance.trigger('start' as any, {} as any);

            expect(callOrder).toEqual([1, 2, 3]);
        });
    });

    describe('DOM Event Binding', () => {
        let testElement: HTMLElement;

        beforeEach(() => {
            testElement = document.createElement('div');
            document.body.appendChild(testElement);
        });

        afterEach(() => {
            if (testElement.parentElement) {
                testElement.parentElement.removeChild(testElement);
            }
        });

        it('bindEvt() binds event handler to element', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            (instance as any).bindEvt(testElement, 'start', handler);

            expect((instance as any)._domHandlers_.size).toBeGreaterThan(0);
        });

        it('bindEvt() stores handler reference for later unbind', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            (instance as any).bindEvt(testElement, 'start', handler);

            expect((instance as any)._domHandlers_.has(handler)).toBe(true);
        });

        it('unbindEvt() removes event handler', () => {
            const instance = new Super('super');
            const handler = jest.fn();

            (instance as any).bindEvt(testElement, 'start', handler);
            expect((instance as any)._domHandlers_.size).toBe(1);

            (instance as any).unbindEvt(testElement, 'start', handler);

            // unbindEvt unbinds from DOM and cleans up the _domHandlers_ map
            expect((instance as any)._domHandlers_.has(handler)).toBe(false);
            expect((instance as any)._domHandlers_.size).toBe(0);
        });
    });

    describe('Utility Methods', () => {
        afterEach(() => {
            Super.logLevel = 'warning';
        });

        it('log() includes correct prefix based on name', () => {
            Super.logLevel = 'debug';
            const instance = new Super('super');
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            instance.log('message');

            // Format is: prefix, ...args, suffix where suffix is [name|uid]
            expect(consoleSpy).toHaveBeenCalledWith(
                '', // super has empty prefix
                'message',
                expect.stringContaining('super'),
            );

            consoleSpy.mockRestore();
        });

        it('log() includes uid in suffix', () => {
            Super.logLevel = 'debug';
            const instance = new Super('super');
            instance.uid = 5 as any;
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            instance.log('message');

            // Format is: prefix, ...args, suffix where suffix is [name|uid]
            expect(consoleSpy).toHaveBeenCalledWith('', 'message', expect.stringContaining('5'));

            consoleSpy.mockRestore();
        });

        it('warn() logs warnings with context', () => {
            const instance = new Super('super');
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

            instance.warn('warning message');

            expect(warnSpy).toHaveBeenCalled();

            warnSpy.mockRestore();
        });

        it('error() logs errors with context', () => {
            const instance = new Super('super');
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            instance.error('error message');

            expect(errorSpy).toHaveBeenCalled();

            errorSpy.mockRestore();
        });
    });

    describe('Log Level', () => {
        afterEach(() => {
            Super.logLevel = 'warning';
        });

        it('info() fires at info level', () => {
            Super.logLevel = 'info';
            const instance = new Super('super');
            const spy = jest.spyOn(console, 'info').mockImplementation();

            instance.info('info message');

            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('info() is silent at warning level', () => {
            const instance = new Super('super');
            const spy = jest.spyOn(console, 'info').mockImplementation();

            instance.info('should not appear');

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('default logLevel is warning', () => {
            expect(Super.logLevel).toBe('warning');
        });

        it('log() is silent at warning level', () => {
            const instance = new Super('super');
            const spy = jest.spyOn(console, 'log').mockImplementation();

            instance.log('should not appear');

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('warn() fires at warning level', () => {
            const instance = new Super('super');
            const spy = jest.spyOn(console, 'warn').mockImplementation();

            instance.warn('should appear');

            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('warn() is silent at error level', () => {
            Super.logLevel = 'error';
            const instance = new Super('super');
            const spy = jest.spyOn(console, 'warn').mockImplementation();

            instance.warn('should not appear');

            expect(spy).not.toHaveBeenCalled();
            spy.mockRestore();
        });

        it('error() fires at error level', () => {
            Super.logLevel = 'error';
            const instance = new Super('super');
            const spy = jest.spyOn(console, 'error').mockImplementation();

            instance.error('should appear');

            expect(spy).toHaveBeenCalled();
            spy.mockRestore();
        });

        it('nothing fires at none level', () => {
            Super.logLevel = 'none';
            const instance = new Super('super');
            const logSpy = jest.spyOn(console, 'log').mockImplementation();
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            instance.log('nope');
            instance.warn('nope');
            instance.error('nope');

            expect(logSpy).not.toHaveBeenCalled();
            expect(warnSpy).not.toHaveBeenCalled();
            expect(errorSpy).not.toHaveBeenCalled();

            logSpy.mockRestore();
            warnSpy.mockRestore();
            errorSpy.mockRestore();
        });

        it('everything fires at debug level', () => {
            Super.logLevel = 'debug';
            const instance = new Super('super');
            const logSpy = jest.spyOn(console, 'log').mockImplementation();
            const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
            const errorSpy = jest.spyOn(console, 'error').mockImplementation();

            instance.log('yes');
            instance.warn('yes');
            instance.error('yes');

            expect(logSpy).toHaveBeenCalled();
            expect(warnSpy).toHaveBeenCalled();
            expect(errorSpy).toHaveBeenCalled();

            logSpy.mockRestore();
            warnSpy.mockRestore();
            errorSpy.mockRestore();
        });
    });
});
