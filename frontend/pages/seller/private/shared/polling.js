(function () {
  'use strict';

  window.__createLiveSync = window.__createLiveSync || function createLiveSync(opts) {
    const config = Object.assign({
      interval: 30000,
      fetchFn: null,
      onUpdate: function () {},
      onError: function () {},
      getSnapshot: function (val) {
        return typeof val === 'string' ? val : JSON.stringify(val);
      }
    }, opts);

    if (typeof config.fetchFn !== 'function') {
      throw new Error('createLiveSync: fetchFn is required');
    }

    // Hard floor: nothing polls faster than 15 seconds
    if (config.interval < 15000) config.interval = 15000;

    let _isFetching = false;
    let _running = false;
    let _lastSnapshot = null;
    let _initialized = false;

    async function tick() {
      if (_isFetching) return;
      _isFetching = true;
      try {
        const result = await config.fetchFn();
        if (result !== undefined && result !== null) {
          const snap = config.getSnapshot(result);
          if (snap !== _lastSnapshot || !_initialized) {
            _lastSnapshot = snap;
            _initialized = true;
            config.onUpdate(result);
          }
        }
      } catch (err) {
        config.onError(err);
      } finally {
        _isFetching = false;
      }
    }

    async function resume() {
      _initialized = false;
      _lastSnapshot = null;
      await tick();
    }

    function start() {
      if (_running) return;
      _running = true;
      (async function loop() {
        while (_running) {
          await tick();
          if (!_running) break;
          await new Promise(function (resolve) {
            setTimeout(resolve, config.interval);
          });
        }
      })();
    }

    function stop() {
      _running = false;
    }

    function destroy() {
      stop();
    }

    function getState() {
      return { running: _running, initialized: _initialized };
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') {
          _isFetching = false;
          stop();
          resume().then(function () {
            if (!_running) start();
          });
        }
      });

      window.addEventListener('online', function () {
        _isFetching = false;
        stop();
        resume().then(function () {
          if (!_running) start();
        });
      });

      window.addEventListener('focus', function () {
        _isFetching = false;
        resume();
      });

      window.addEventListener('beforeunload', stop);
    }

    return { start: start, stop: stop, destroy: destroy, getState: getState };
  };
})();
